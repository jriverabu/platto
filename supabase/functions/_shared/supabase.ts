// Clientes de Supabase para las Edge Functions.
import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';
import { HttpError, requireEnv } from './http.ts';

/** Cliente con la llave de servicio: ignora RLS. Úsalo solo después de verificar permisos. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Usuario que hace la petición, a partir de su JWT. */
export async function requireUser(req: Request): Promise<User> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) throw new HttpError(401, 'AUTH_REQUIRED', 'Inicia sesión.');
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'AUTH_REQUIRED', 'Sesión inválida.');
  return data.user;
}

/** Verifica que el usuario sea miembro del restaurante (o administrador). */
export async function requireMember(admin: SupabaseClient, userId: string, restaurantId: string): Promise<void> {
  const [{ data: member }, { data: profile }] = await Promise.all([
    admin
      .from('restaurant_members')
      .select('profile_id')
      .eq('restaurant_id', restaurantId)
      .eq('profile_id', userId)
      .maybeSingle(),
    admin.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ]);
  if (!member && profile?.role !== 'admin') {
    throw new HttpError(403, 'FORBIDDEN', 'No tienes acceso a este restaurante.');
  }
}

/** Encola una notificación para todos los administradores. */
export async function notifyAdmins(
  admin: SupabaseClient,
  kind: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
  if (!admins?.length) return;
  await admin.from('notification_outbox').insert(
    admins.map((a: { id: string }) => ({ profile_id: a.id, kind, title, body, data })),
  );
}
