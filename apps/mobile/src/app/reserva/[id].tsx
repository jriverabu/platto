import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { effectiveStatus, formatDateShort, formatDuration, formatTime, minutesToRespond } from '@platto/core';
import { canReviewReservation, cancelReservation, now, reviewFor, useDemo } from '@platto/demo';
import { Perforation, StatusBadge, Ticket } from '@/components/Ticket';
import { Button, Header, Row, T, attempt } from '@/components/ui';
import { useTick } from '@/lib/useTick';
import { C } from '@/lib/theme';

export default function ReservationDetail() {
  useTick(15_000);
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useDemo();
  const r = s.reservations.find((x) => x.id === id);
  if (!r) return null;
  const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
  const tz = rest.timezone;
  const st = effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(now()));
  const review = reviewFor(s, r.id);
  const reviewable = canReviewReservation(s, r);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <Header title="Tu reserva" onBack={() => router.back()} />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Ticket>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size="tiny" color={C.text3} style={{ flexShrink: 1 }}>{rest.zone} · {rest.address}</T>
            <StatusBadge status={st} />
          </Row>
          <T size="h2" weight="bold">{rest.name}</T>
          <T weight="semibold">{formatDateShort(new Date(r.startsAt), tz)} · {formatTime(new Date(r.startsAt), tz)}</T>
          <T>Mesa para {r.partySize}{r.note ? ` · “${r.note}”` : ''}</T>
          <Perforation />
          <T size="small" color={C.text2}>
            {st === 'pending' && `Esperando respuesta. Vence en ${formatDuration(minutesToRespond({ expiresAt: new Date(r.expiresAt) }, new Date(now())))}.`}
            {st === 'confirmed' && 'Confirmada. Puedes cancelar sin costo hasta 2 horas antes.'}
            {st === 'completed' && (review ? 'Ya calificaste esta visita. ¡Gracias!' : reviewable.ok ? 'Tu visita está lista para calificar.' : reviewable.error.message)}
            {st === 'rejected' && 'El restaurante no pudo recibirte a esa hora.'}
            {st === 'expired' && 'El restaurante no respondió a tiempo. Prueba otro horario.'}
            {st === 'cancelled' && 'Cancelaste esta reserva.'}
            {st === 'no_show' && 'El restaurante registró que no llegaste.'}
          </T>
        </Ticket>
        {reviewable.ok && <Button title="Calificar visita" onPress={() => router.push(`/calificar/${r.id}`)} />}
        <Button title={`Ver menú de ${rest.name}`} variant="ghost" onPress={() => router.push(`/restaurante/${rest.id}`)} />
        {(st === 'pending' || st === 'confirmed') && (
          <Button title={st === 'pending' ? 'Retirar solicitud' : 'Cancelar reserva'} variant="quiet" onPress={() => attempt(() => cancelReservation(r.id), 'Reserva cancelada')} />
        )}
      </View>
    </ScrollView>
  );
}
