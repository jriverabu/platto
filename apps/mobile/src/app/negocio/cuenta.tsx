// Modo restaurante · Cuenta: plan, lo que más se ve, promociones y controles de la demo.
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { PLANS, SUBSCRIPTION_LABEL, formatDateShort } from '@platto/core';
import { livePromotions, now, useDemo } from '@platto/demo';
import { DemoPanel } from '@/components/DemoPanel';
import { Badge, Button, Card, Header, Icon, Row, T } from '@/components/ui';
import { C } from '@/lib/theme';

const MONTH = 30 * 24 * 3_600_000;

export default function Account() {
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const sub = s.subscriptions.find((x) => x.restaurantId === rid)!;
  const plan = PLANS[sub.plan];
  const t = now();
  const views = s.views.filter((v) => v.restaurantId === rid && v.at > t - MONTH);
  const byDish = s.dishes
    .filter((d) => d.restaurantId === rid)
    .map((d) => {
      const list = views.filter((v) => v.dishId === d.id);
      return { dish: d, views: list.length, avg: list.length ? list.reduce((a, v) => a + v.seconds, 0) / list.length : 0 };
    })
    .sort((a, b) => b.views - a.views);
  const top = Math.max(1, byDish[0]?.views ?? 1);
  const monthRes = s.reservations.filter((r) => r.restaurantId === rid && r.createdAt > t - MONTH);
  const answered = monthRes.filter((r) => r.respondedAt !== null).length;
  const decided = monthRes.filter((r) => r.status !== 'pending').length;
  const liveCount = livePromotions(s, rid).length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <Header kicker={rest.name} title="Cuenta" />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <Card style={{ gap: 12, borderColor: C.brand, borderWidth: 1.5 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size="tiny" weight="semibold" color={C.text3} style={{ letterSpacing: 1.4 }}>PLAN ACTUAL</T>
            <Badge tone={sub.status === 'active' || sub.status === 'trialing' ? 'ok' : 'warn'} label={SUBSCRIPTION_LABEL[sub.status]} />
          </Row>
          <T size="display" weight="bold" color={C.brandHi}>{plan.name}</T>
          <T size="small" color={C.text3}>
            {sub.status === 'past_due' && sub.graceUntil
              ? `Pago pendiente: sigues visible hasta el ${formatDateShort(new Date(sub.graceUntil), rest.timezone)}.`
              : `Próximo cobro: ${formatDateShort(new Date(sub.currentPeriodEnd), rest.timezone)}`}
          </T>
          <View style={{ height: 1, backgroundColor: C.line }} />
          {plan.features.map((f) => (
            <Row key={f} gap={8}><Icon name="check" size={16} stroke={3} color={C.brand} /><T size="small">{f}</T></Row>
          ))}
          <Button title="Cambiar de plan" variant="ghost" small onPress={() => router.push('/planes')} />
        </Card>

        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size="h3" weight="bold">Lo que más se ve</T>
            <T size="tiny" weight="semibold" color={C.text3}>ÚLTIMOS 30 DÍAS</T>
          </Row>
          {plan.analytics ? (
            <Card style={{ gap: 12 }}>
              {byDish.slice(0, 5).map((x, i) => (
                <View key={x.dish.id} style={{ gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T size="small" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{x.dish.name}</T>
                    <T size="small" color={C.text2}>{x.views} vistas · {x.avg.toFixed(1).replace('.', ',')} s</T>
                  </Row>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surface3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${(x.views / top) * 100}%`, backgroundColor: i === 0 ? C.brand : C.text3 }} />
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Card style={{ gap: 8 }}>
              <T size="small">Las vistas por plato y el tiempo que la gente mira cada video vienen con el plan Pro.</T>
              <Button title="Ver plan Pro" variant="dark" small onPress={() => router.push('/planes')} />
            </Card>
          )}
          <Row gap={8}>
            <Card style={{ flex: 1, gap: 2 }}><T size="h2" weight="bold">{monthRes.length}</T><T size="tiny" color={C.text3}>reservas desde Platto</T></Card>
            <Card style={{ flex: 1, gap: 2 }}><T size="h2" weight="bold">{decided ? Math.round((answered / decided) * 100) : 100}%</T><T size="tiny" color={C.text3}>respondidas a tiempo</T></Card>
          </Row>
        </View>

        <Card style={{ paddingVertical: 0 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Promociones" onPress={() => router.push('/promociones')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
            <Icon name="tag" />
            <View style={{ flex: 1 }}>
              <Row gap={8}><T weight="semibold">Promociones</T>{!plan.promotions && <Badge tone="brand" label="Pro" />}</Row>
              <T size="small" color={C.text3}>{!plan.promotions ? 'Destaca ofertas en Inicio y en tu perfil' : liveCount === 0 ? 'Ninguna se ve hoy' : `${liveCount} ${liveCount === 1 ? 'se ve' : 'se ven'} hoy en Inicio y en tu perfil`}</T>
            </View>
            <Icon name="chevron" size={18} color={C.text3} />
          </Pressable>
          <Row gap={12} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line }}>
            <Icon name="pin" />
            <View style={{ flex: 1 }}><T weight="semibold">{rest.address}</T><T size="small" color={C.text3}>{rest.zone} · Cúcuta</T></View>
          </Row>
        </Card>

        <DemoPanel />
      </View>
    </ScrollView>
  );
}
