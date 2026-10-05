// POST /functions/v1/send-notifications   (lo llama pg_cron cada minuto con la llave de servicio)
//
// Envía las notificaciones pendientes de notification_outbox por Expo Push
// (APNs para iPhone y FCM para Android, con un solo servicio).
import { HttpError, json, requireEnv, safeEqual, serve } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

const BATCH = 100; // límite de Expo por petición

interface OutboxRow {
  id: number;
  profile_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  profiles: { push_token: string | null } | null;
}

serve(async (req) => {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!safeEqual(token, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))) {
    throw new HttpError(401, 'FORBIDDEN');
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from('notification_outbox')
    .select('id, profile_id, kind, title, body, data, profiles(push_token)')
    .is('sent_at', null)
    .lte('send_after', new Date().toISOString())
    .order('id')
    .limit(BATCH);
  if (error) throw error;

  const rows = (data ?? []) as unknown as OutboxRow[];
  if (rows.length === 0) return json({ sent: 0 });

  const withToken = rows.filter((r) => r.profiles?.push_token);
  const withoutToken = rows.filter((r) => !r.profiles?.push_token);
  const now = new Date().toISOString();

  if (withoutToken.length) {
    await admin
      .from('notification_outbox')
      .update({ sent_at: now, error: 'NO_PUSH_TOKEN' })
      .in('id', withoutToken.map((r) => r.id));
  }

  if (withToken.length) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(
        withToken.map((r) => ({
          to: r.profiles!.push_token,
          title: r.title,
          body: r.body,
          data: { ...r.data, kind: r.kind },
          sound: 'default',
        })),
      ),
    });
    const result = (await response.json().catch(() => null)) as
      | { data?: Array<{ status: 'ok' | 'error'; message?: string; details?: { error?: string } }> }
      | null;

    if (!response.ok || !result?.data) {
      // No se marca como enviado: el próximo minuto se reintenta.
      console.error('Expo push falló', response.status, result);
      return json({ sent: 0, retry: withToken.length }, 502);
    }

    await Promise.all(
      withToken.map((row, i) => {
        const ticket = result.data![i];
        const failed = ticket?.status === 'error';
        if (failed && ticket?.details?.error === 'DeviceNotRegistered') {
          void admin.from('profiles').update({ push_token: null }).eq('id', row.profile_id);
        }
        return admin
          .from('notification_outbox')
          .update({ sent_at: now, error: failed ? ticket?.message ?? 'ERROR' : null })
          .eq('id', row.id);
      }),
    );
  }

  return json({ sent: withToken.length, skipped: withoutToken.length });
});
