// POST /functions/v1/subscription-checkout   { "restaurant_id": "…", "plan": "pro" }
//
// Crea una suscripción mensual en Mercado Pago y devuelve el enlace de pago.
// La app lo abre en el navegador del sistema: el cobro ocurre fuera de la tienda
// de aplicaciones (ver docs/CONFIGURACION.md, sección Pagos, antes de publicar).
// El estado real lo actualiza payments-webhook cuando Mercado Pago confirma.
import { HttpError, json, requireEnv, serve } from '../_shared/http.ts';
import { adminClient, requireMember, requireUser } from '../_shared/supabase.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const { restaurant_id: restaurantId, plan } = (await req.json().catch(() => ({}))) as {
    restaurant_id?: string;
    plan?: string;
  };
  if (!restaurantId || !plan) throw new HttpError(400, 'BAD_REQUEST', 'Faltan restaurant_id o plan.');

  const admin = adminClient();
  await requireMember(admin, user.id, restaurantId);

  const [{ data: planRow }, { data: restaurant }] = await Promise.all([
    admin.from('plans').select('id, name, price_cop').eq('id', plan).maybeSingle(),
    admin.from('restaurants').select('id, name').eq('id', restaurantId).maybeSingle(),
  ]);
  if (!planRow || !restaurant) throw new HttpError(404, 'NOT_FOUND', 'Plan o restaurante no encontrado.');
  if (!planRow.price_cop) {
    throw new HttpError(409, 'PRICE_NOT_SET', 'Este plan todavía no tiene precio. Configúralo en la tabla plans.');
  }

  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('MERCADOPAGO_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: `Platto ${planRow.name} · ${restaurant.name}`,
      external_reference: `${restaurant.id}|${planRow.id}`,
      payer_email: user.email,
      back_url: Deno.env.get('PLATTO_CHECKOUT_RETURN_URL') ?? 'https://platto.co/pago',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: planRow.price_cop,
        currency_id: 'COP',
      },
      status: 'pending',
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.init_point) {
    console.error('Mercado Pago preapproval falló', response.status, payload);
    throw new HttpError(502, 'PAYMENT_PROVIDER_ERROR', 'No pudimos abrir el pago. Intenta de nuevo.');
  }

  return json({ checkout_url: payload.init_point, provider_ref: payload.id });
});
