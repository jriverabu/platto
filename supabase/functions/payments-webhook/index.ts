// POST /functions/v1/payments-webhook?data.id=…&type=…   (lo llama Mercado Pago)
//
// Mantiene la tabla subscriptions al día:
//   suscripción autorizada  → active (aparece en Platto)
//   pago rechazado / pausa  → past_due con 7 días de gracia (sigue apareciendo)
//   cancelada               → cancelled (deja de aparecer)
// Verifica la firma x-signature antes de confiar en nada y consulta el estado
// real en la API de Mercado Pago (el cuerpo del webhook no se usa como verdad).
import { HttpError, hmacSha256Hex, json, requireEnv, safeEqual, serve } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

const GRACE_DAYS = 7; // packages/core RULES.subscriptionGraceDays
const MP_API = 'https://api.mercadopago.com';

async function verifySignature(req: Request, dataId: string): Promise<void> {
  // x-signature: "ts=<epoch>,v1=<hex>"; manifiesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
  const header = req.headers.get('x-signature') ?? '';
  const parts = Object.fromEntries(
    header.split(',').map((p) => p.trim().split('=') as [string, string]),
  );
  if (!parts.ts || !parts.v1) throw new HttpError(401, 'BAD_SIGNATURE');
  const requestId = req.headers.get('x-request-id') ?? '';
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${parts.ts};`;
  const expected = await hmacSha256Hex(requireEnv('MERCADOPAGO_WEBHOOK_SECRET'), manifest);
  if (!safeEqual(expected, parts.v1)) throw new HttpError(401, 'BAD_SIGNATURE');
}

async function mp<T>(path: string): Promise<T> {
  const response = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${requireEnv('MERCADOPAGO_ACCESS_TOKEN')}` },
  });
  if (!response.ok) throw new HttpError(502, 'PAYMENT_PROVIDER_ERROR', `Mercado Pago respondió ${response.status}`);
  return (await response.json()) as T;
}

interface Preapproval {
  id: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled';
  external_reference: string;
  next_payment_date?: string;
}

interface AuthorizedPayment {
  id: number;
  preapproval_id: string;
  payment?: { status?: string };
}

function parseReference(reference: string): { restaurantId: string; plan: string } {
  const [restaurantId, plan] = reference.split('|');
  if (!restaurantId || !plan) throw new HttpError(400, 'BAD_REFERENCE', `Referencia inválida: ${reference}`);
  return { restaurantId, plan };
}

serve(async (req) => {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string } };
  const type = url.searchParams.get('type') ?? body.type ?? '';
  const dataId = url.searchParams.get('data.id') ?? body.data?.id ?? '';
  if (!dataId) return json({ ignored: true });
  await verifySignature(req, dataId);

  let preapproval: Preapproval;
  let paymentFailed = false;

  if (type === 'subscription_preapproval') {
    preapproval = await mp<Preapproval>(`/preapproval/${dataId}`);
  } else if (type === 'subscription_authorized_payment') {
    const charge = await mp<AuthorizedPayment>(`/authorized_payments/${dataId}`);
    preapproval = await mp<Preapproval>(`/preapproval/${charge.preapproval_id}`);
    paymentFailed = charge.payment?.status === 'rejected';
  } else {
    return json({ ignored: true, type });
  }

  const { restaurantId, plan } = parseReference(preapproval.external_reference);
  const admin = adminClient();
  const { data: current } = await admin
    .from('subscriptions')
    .select('status, grace_until')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  const now = new Date();
  const grace = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const keepGrace = current?.status === 'past_due' && current.grace_until ? current.grace_until : grace;

  let update: Record<string, unknown>;
  if (preapproval.status === 'cancelled') {
    update = { status: 'cancelled', cancelled_at: now.toISOString(), grace_until: null };
  } else if (preapproval.status === 'paused' || paymentFailed) {
    update = { status: 'past_due', grace_until: keepGrace };
  } else if (preapproval.status === 'authorized') {
    update = {
      status: 'active',
      grace_until: null,
      current_period_end: preapproval.next_payment_date ?? null,
    };
  } else {
    return json({ ignored: true, status: preapproval.status });
  }

  const { error } = await admin.from('subscriptions').upsert(
    {
      restaurant_id: restaurantId,
      plan,
      provider: 'mercadopago',
      provider_ref: preapproval.id,
      ...update,
    },
    { onConflict: 'restaurant_id' },
  );
  if (error) throw error;

  return json({ ok: true, restaurant_id: restaurantId, ...update });
});
