// Modo restaurante · Reservas: solicitudes con cuenta regresiva, agenda del día (llegó / no llegó) y próximos días.
import { ScrollView, Switch, View } from 'react-native';
import { RULES, effectiveStatus, formatDateShort, formatDuration, formatRating, formatTime, localParts, minutesToRespond } from '@platto/core';
import { markAttendance, now, ratingOf, respondReservation, setReservationsEnabled, useDemo, type ReservationRow } from '@platto/demo';
import { StatusBadge } from '@/components/Ticket';
import { Button, Card, Empty, Header, Icon, IconButton, Row, T, attempt, toast } from '@/components/ui';
import { useTick } from '@/lib/useTick';
import { C } from '@/lib/theme';

export default function Inbox() {
  useTick(15_000);
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const t = now();
  const tz = rest.timezone;
  const today = localParts(new Date(t), tz).date;
  const mine = s.reservations.filter((r) => r.restaurantId === rid);
  const st = (r: ReservationRow) => effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(t));
  const pending = mine.filter((r) => st(r) === 'pending').sort((a, b) => a.expiresAt - b.expiresAt);
  const todays = mine.filter((r) => localParts(new Date(r.startsAt), tz).date === today && ['confirmed', 'completed', 'no_show'].includes(st(r))).sort((a, b) => a.startsAt - b.startsAt);
  const later = mine.filter((r) => st(r) === 'confirmed' && localParts(new Date(r.startsAt), tz).date > today).sort((a, b) => a.startsAt - b.startsAt);
  const peopleToday = todays.filter((r) => st(r) !== 'no_show').reduce((n, r) => n + r.partySize, 0);
  const rating = ratingOf(s, rid);
  const name = (id: string) => s.people.find((p) => p.id === id)?.name ?? 'Comensal';

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <Header
        kicker={`Modo restaurante · ${formatDateShort(new Date(t), tz)}`}
        title={rest.name}
        right={
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Switch
              value={rest.reservationsEnabled}
              onValueChange={(v) => { setReservationsEnabled(rid, v); toast(v ? 'Recibiendo reservas' : 'Reservas en pausa'); }}
              trackColor={{ true: C.brand, false: C.surface3 }}
              thumbColor="#fff"
              accessibilityLabel="Recibir reservas"
            />
            <T size="tiny" color={C.text3}>{rest.reservationsEnabled ? 'Abierto' : 'Pausado'}</T>
          </View>
        }
      />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <Row gap={8}>
          <Kpi value={String(pending.length)} label="por responder" hot />
          <Kpi value={String(peopleToday)} label="personas hoy" />
          <Kpi value={rating.average !== null ? formatRating(rating.average) : '—'} label={`${rating.count} reseñas`} />
        </Row>

        <View style={{ gap: 10 }}>
          <T size="h3" weight="bold">Solicitudes nuevas</T>
          {pending.length === 0 && <T size="small" color={C.text3}>No hay solicitudes por responder.</T>}
          {pending.map((r) => {
            const left = minutesToRespond({ expiresAt: new Date(r.expiresAt) }, new Date(t));
            return (
              <Card key={r.id} style={{ gap: 10 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <T size="lead" weight="semibold">{name(r.dinerId)}</T>
                    <T size="small">{localParts(new Date(r.startsAt), tz).date === today ? 'Hoy' : formatDateShort(new Date(r.startsAt), tz)} · {formatTime(new Date(r.startsAt), tz)}</T>
                  </View>
                  <View style={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: C.surface2 }}>
                    <T size="h3" weight="bold">{r.partySize}</T>
                    <T size="tiny" color={C.text3}>PERS.</T>
                  </View>
                </Row>
                {r.note && <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 10 }}><T size="small" color={C.text2}>“{r.note}”</T></View>}
                <Row gap={6}>
                  <Icon name="clock" size={14} color={left < 45 ? C.bad : C.text2} />
                  <T size="tiny" weight="semibold" color={left < 45 ? C.bad : C.text2}>Vence en {formatDuration(left)}</T>
                </Row>
                <Row gap={8}>
                  <Button title="Rechazar" variant="ghost" small style={{ flex: 1 }} onPress={() => attempt(() => respondReservation(r.id, false), 'Rechazada. Le sugerimos otros horarios.')} />
                  <Button title="Aceptar" small style={{ flex: 1.4 }} onPress={() => attempt(() => respondReservation(r.id, true), 'Confirmada. El cliente ya fue avisado.')} />
                </Row>
              </Card>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size="h3" weight="bold">Agenda de hoy</T>
            <T size="small" color={C.text3}>{todays.length} reservas</T>
          </Row>
          {todays.length === 0 ? (
            <Empty title="Agenda libre" body="Las reservas confirmadas para hoy aparecen aquí." />
          ) : (
            <Card style={{ paddingVertical: 0 }}>
              {todays.map((r, i) => {
                const status = st(r);
                const canMark = status === 'confirmed' && r.startsAt - t <= RULES.attendanceOpensBeforeMinutes * 60_000;
                return (
                  <Row key={r.id} gap={12} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                    <T size="small" weight="semibold" style={{ width: 78 }}>{formatTime(new Date(r.startsAt), tz)}</T>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T weight="semibold" numberOfLines={1}>{name(r.dinerId)}</T>
                      <T size="tiny" color={C.text3} numberOfLines={1}>{r.partySize} personas{r.note ? ` · ${r.note}` : ''}</T>
                    </View>
                    {canMark ? (
                      <Row gap={6}>
                        <IconButton icon="close" label="No llegó" size={40} onPress={() => attempt(() => markAttendance(r.id, false), 'Marcado como no asistió')} />
                        <Button title="Llegó" small onPress={() => attempt(() => markAttendance(r.id, true), 'Llegó. Podrá calificar en 2 horas.')} />
                      </Row>
                    ) : (
                      <StatusBadge status={status} />
                    )}
                  </Row>
                );
              })}
            </Card>
          )}
        </View>

        {later.length > 0 && (
          <View style={{ gap: 10 }}>
            <T size="h3" weight="bold">Próximos días</T>
            <Card style={{ paddingVertical: 0 }}>
              {later.map((r, i) => (
                <Row key={r.id} gap={12} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <View style={{ width: 96 }}><T size="small" weight="semibold">{formatDateShort(new Date(r.startsAt), tz)}</T><T size="small">{formatTime(new Date(r.startsAt), tz)}</T></View>
                  <View style={{ flex: 1 }}><T weight="semibold">{name(r.dinerId)}</T><T size="tiny" color={C.text3}>{r.partySize} personas</T></View>
                  <StatusBadge status="confirmed" />
                </Row>
              ))}
            </Card>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Kpi({ value, label, hot }: { value: string; label: string; hot?: boolean }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: hot ? C.brand : C.surface, borderWidth: hot ? 0 : 1, borderColor: C.line, gap: 2 }}>
      <T size="h2" weight="bold" color={hot ? C.onBrand : C.text}>{value}</T>
      <T size="tiny" color={hot ? C.onBrand : C.text3}>{label}</T>
    </View>
  );
}
