// POST /functions/v1/video-upload-url   { "dish_id": "…" }
//
// Entrega un enlace de un solo uso para que el teléfono suba el video directo a
// Cloudflare Stream, sin pasar por nuestro servidor. Cloudflare rechaza cualquier
// video de más de 10 segundos (maxDurationSeconds). El video queda como
// "candidato": el publicado sigue visible hasta que el nuevo se aprueba.
import { HttpError, json, requireEnv, serve } from '../_shared/http.ts';
import { adminClient, requireMember, requireUser } from '../_shared/supabase.ts';

const MAX_DURATION_SECONDS = 10; // packages/core RULES.videoMaxSeconds
const LINK_TTL_MINUTES = 30;

serve(async (req) => {
  const user = await requireUser(req);
  const { dish_id: dishId } = (await req.json().catch(() => ({}))) as { dish_id?: string };
  if (!dishId) throw new HttpError(400, 'BAD_REQUEST', 'Falta dish_id.');

  const admin = adminClient();
  const { data: dish, error } = await admin
    .from('dishes')
    .select('id, restaurant_id, name, video_status')
    .eq('id', dishId)
    .maybeSingle();
  if (error || !dish) throw new HttpError(404, 'NOT_FOUND', 'Plato no encontrado.');
  await requireMember(admin, user.id, dish.restaurant_id);

  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireEnv('CLOUDFLARE_STREAM_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: MAX_DURATION_SECONDS,
        expiry: new Date(Date.now() + LINK_TTL_MINUTES * 60_000).toISOString(),
        creator: user.id,
        thumbnailTimestampPct: 0.5,
        meta: { name: dish.name, dish_id: dish.id, restaurant_id: dish.restaurant_id },
      }),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    console.error('Cloudflare direct_upload falló', response.status, payload?.errors);
    throw new HttpError(502, 'VIDEO_PROVIDER_ERROR', 'No pudimos preparar la subida. Intenta de nuevo.');
  }

  const { uid, uploadURL } = payload.result as { uid: string; uploadURL: string };

  const { error: updateError } = await admin
    .from('dishes')
    .update({
      candidate_video_uid: uid,
      candidate_thumbnail_url: null,
      candidate_duration_seconds: null,
      video_status: 'processing',
      video_review_note: null,
    })
    .eq('id', dish.id);
  if (updateError) throw updateError;

  return json({ upload_url: uploadURL, video_uid: uid, max_duration_seconds: MAX_DURATION_SECONDS });
});
