// Mis reservas: por calificar, próximas (con estado en vivo) y anteriores.
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { effectiveStatus, formatDateShort, formatDuration, formatTime, minutesToRespond } from '@platto/core';
import { canReviewReservation, markNotificationsRead, now, reviewFor, useDemo, type ReservationRow } from '@platto/demo';
import { StatusBadge } from '@/components/Ticket';
import { Button, Card, Empty, Header, Icon, Row, Stars, T } from '@/components/ui';
import { useTick } from '@/lib/useTick';
import { posterSource } from '@/lib/videos';
import { C } from '@/lib/theme';

export default function MyReservations() {
  useTick();
  const s = useDemo();
  useEffect(() => markNotificationsRead('diner'), [s.notifications.length]);
  const t = now();
  const mine = s.reservations.filter((r) => r.dinerId === s.dinerId);
  const status = (r: ReservationRow) => effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(t));
  const upcoming = mine.filter((r) => ['pending', 'confirmed'].includes(status(r)) && r.startsAt > t - 3 * 3_600_000).sort((a, b) => a.startsAt - b.startsAt);
  const toReview = mine.filter((r) => canReviewReservation(s, r).ok);
  const past = mine.filter((r) => !upcoming.includes(r) && !toReview.includes(r)).sort((a, b) => b.startsAt - a.startsAt);
  const rest = (id: string) => s.restaurants.find((x) => x.id === id)!;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <Header title="Mis reservas" />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        {toReview.length > 0 && (
          <View style={{ gap: 10 }}>
            <Label>Califica tu visita</Label>
            {toReview.map((r) => (
              <Card key={r.id} style={{ gap: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T weight="semibold">{rest(r.restaurantId).name}</T>
                  <T size="tiny" weight="semibold" color={C.ok}>VISITA VERIFICADA</T>
                </Row>
                <T size="small" color={C.text2}>{formatDateShort(new Date(r.startsAt), rest(r.restaurantId).timezone)} · mesa para {r.partySize}</T>
                <Button title="Calificar en 10 segundos" onPress={() => router.push(`/calificar/${r.id}`)} />
              </Card>
            ))}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Label>Próximas</Label>
          {upcoming.length === 0 && <Empty title="Sin reservas" body="Encuentra un plato en Inicio y reserva desde ahí." action={<Button title="Ir a Inicio" variant="dark" small onPress={() => router.navigate('/comensal')} />} />}
          {upcoming.map((r) => {
            const rr = rest(r.restaurantId);
            const st = status(r);
            const cover = posterSource(s.dishes.find((d) => d.id === rr.coverDishId)?.video?.poster ?? null);
            return (
              <Card key={r.id} onPress={() => router.push(`/reserva/${r.id}`)} label={`Reserva en ${rr.name}`} style={{ flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center' }}>
                <View style={{ width: 64, height: 86, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' }}>{cover && <Image source={cover} style={{ width: '100%', height: '100%' }} contentFit="cover" />}</View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}><T weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{rr.name}</T><StatusBadge status={st} /></Row>
                  <T size="small">{formatDateShort(new Date(r.startsAt), rr.timezone)} · {formatTime(new Date(r.startsAt), rr.timezone)}</T>
                  <T size="small" color={C.text3}>Mesa para {r.partySize}{st === 'pending' ? ` · responde en ${formatDuration(minutesToRespond({ expiresAt: new Date(r.expiresAt) }, new Date(t)))}` : ''}</T>
                </View>
                <Icon name="chevron" size={18} color={C.text3} />
              </Card>
            );
          })}
        </View>

        {past.length > 0 && (
          <View style={{ gap: 10 }}>
            <Label>Anteriores</Label>
            <Card style={{ paddingVertical: 0 }}>
              {past.map((r, i) => {
                const rr = rest(r.restaurantId);
                const review = reviewFor(s, r.id);
                return (
                  <Pressable key={r.id} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }} onPress={() => router.push(`/reserva/${r.id}`)}>
                    <View style={{ flex: 1 }}>
                      <T weight="semibold">{rr.name}</T>
                      <T size="small" color={C.text3}>{formatDateShort(new Date(r.startsAt), rr.timezone)} · {r.partySize} personas</T>
                    </View>
                    {review ? <Stars value={review.rating} /> : <StatusBadge status={status(r)} />}
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Label({ children }: { children: string }) {
  return <T size="tiny" weight="semibold" color={C.text3} style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>{children}</T>;
}
