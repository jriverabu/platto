// POST /functions/v1/stream-webhook   (lo llama Cloudflare Stream)
//
// Cuando Cloudflare termina de procesar un video, revisa la duración y la
// orientación reales. Si cumple, el plato pasa a "en revisión" para que un
// administrador lo apruebe; si no, queda rechazado con la razón.
import { HttpError, hmacSha256Hex, json, requireEnv, safeEqual, serve } from '../_shared/http.ts';
import { adminClient, notifyAdmins } from '../_shared/supabase.ts';

const MAX_DURATION_SECONDS = 10; // packages/core RULES.videoMaxSeconds
const MIN_DURATION_SECONDS = 4; // packages/core RULES.videoMinSeconds
const MIN_ASPECT = 1.7; // alto / ancho; 9:16 = 1,78
const SIGNATURE_TOLERANCE_SECONDS = 300;

interface StreamVideo {
  uid: string;
  readyToStream?: boolean;
  status?: { state?: string; errorReasonText?: string };
  duration?: number;
  thumbnail?: string;
  input?: { width?: number; height?: number };
}

async function verifySignature(req: Request, body: string): Promise<void> {
  // Encabezado: "time=1230811200,sig1=<hex>". Firma = HMAC-SHA256(secreto, "<time>.<body>").
  const header = req.headers.get('Webhook-Signature') ?? '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const time = Number(parts.time);
  if (!parts.sig1 || !Number.isFinite(time)) throw new HttpError(401, 'BAD_SIGNATURE');
  if (Math.abs(Date.now() / 1000 - time) > SIGNATURE_TOLERANCE_SECONDS) throw new HttpError(401, 'STALE_SIGNATURE');
  const expected = await hmacSha256Hex(requireEnv('CLOUDFLARE_STREAM_WEBHOOK_SECRET'), `${parts.time}.${body}`);
  if (!safeEqual(expected, parts.sig1)) throw new HttpError(401, 'BAD_SIGNATURE');
}

function rejectionReason(video: StreamVideo): string | null {
  if (video.status?.state === 'error') {
    return `No se pudo procesar el video${video.status.errorReasonText ? `: ${video.status.errorReasonText}` : ''}.`;
  }
  const duration = video.duration ?? 0;
  if (duration > MAX_DURATION_SECONDS + 0.05) {
    return `Dura ${duration.toFixed(1).replace('.', ',')} s. El máximo es ${MAX_DURATION_SECONDS} s.`;
  }
  if (duration > 0 && duration < MIN_DURATION_SECONDS) {
    return `Dura ${duration.toFixed(1).replace('.', ',')} s. El mínimo es ${MIN_DURATION_SECONDS} s.`;
  }
  const { width = 0, height = 0 } = video.input ?? {};
  if (width > 0 && height / width < MIN_ASPECT) return 'El video debe ser vertical (9:16).';
  return null;
}

serve(async (req) => {
  const body = await req.text();
  await verifySignature(req, body);
  const video = JSON.parse(body) as StreamVideo;

  // Solo nos interesan los estados finales.
  if (video.status?.state !== 'ready' && video.status?.state !== 'error') {
    return json({ ignored: true });
  }

  const admin = adminClient();
  const { data: dish } = await admin
    .from('dishes')
    .select('id, name, restaurant_id')
    .eq('candidate_video_uid', video.uid)
    .maybeSingle();
  if (!dish) return json({ ignored: true, reason: 'unknown video' });

  const reason = rejectionReason(video);
  if (reason) {
    await admin
      .from('dishes')
      .update({ video_status: 'rejected', video_review_note: reason, candidate_duration_seconds: null })
      .eq('id', dish.id);
    const { data: members } = await admin
      .from('restaurant_members')
      .select('profile_id')
      .eq('restaurant_id', dish.restaurant_id);
    if (members?.length) {
      await admin.from('notification_outbox').insert(
        members.map((m: { profile_id: string }) => ({
          profile_id: m.profile_id,
          kind: 'video_rejected',
          title: 'Tu video necesita cambios',
          body: `${dish.name}: ${reason}`,
          data: { dish_id: dish.id },
        })),
      );
    }
    return json({ status: 'rejected', reason });
  }

  const duration = Math.min(MAX_DURATION_SECONDS, Math.round((video.duration ?? 0) * 10) / 10);
  await admin
    .from('dishes')
    .update({
      video_status: 'in_review',
      candidate_duration_seconds: duration > 0 ? duration : null,
      candidate_thumbnail_url: video.thumbnail ?? null,
      video_review_note: null,
    })
    .eq('id', dish.id);

  await notifyAdmins(admin, 'video_to_review', 'Video para revisar', `${dish.name} espera aprobación.`, {
    dish_id: dish.id,
  });
  return json({ status: 'in_review' });
});
