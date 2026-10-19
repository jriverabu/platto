// Reservar: personas, día, franja con cupo real y nota. El restaurante confirma en máximo 2 horas.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RULES, bookableDates, formatClock12, formatDateShort, formatTime, weekdayOf } from '@platto/core';
import { createReservation, now, slotsFor, useDemo, type ReservationRow } from '@platto/demo';
import { Perforation, Ticket } from '@/components/Ticket';
import { Button, Card, Header, IconButton, Row, T, attempt } from '@/components/ui';
import { C, F } from '@/lib/theme';

const WD = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function Reserve() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useDemo();
  const insets = useSafeAreaInsets();
  const restaurant = s.restaurants.find((r) => r.id === id);
  const tz = restaurant?.timezone ?? 'America/Bogota';
  const dates = useMemo(() => bookableDates(new Date(now()), tz, 14), [tz, s.clockOffsetMin]);
  const [party, setParty] = useState(2);
  const [date, setDate] = useState(dates[0]!);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<ReservationRow | null>(null);
  if (!restaurant) return null;

  const slots = slotsFor(s, restaurant.id, date, party);
  const chosen = slots.find((x) => x.startsAt.getTime() === startsAt && x.available);

  if (created) {
    const live = s.reservations.find((r) => r.id === created.id) ?? created;
    return (
      <View style={{ flex: 1 }}>
        <Header title="Solicitud enviada" onBack={() => router.back()} />
        <View style={{ padding: 16, gap: 18 }}>
          <Ticket>
            <T size="tiny" weight="semibold" color={C.brandHi} style={{ letterSpacing: 1.4 }}>
              {live.status === 'confirmed' ? 'CONFIRMADA' : live.status === 'rejected' ? 'RECHAZADA' : 'ENVIADA · PENDIENTE DE CONFIRMACIÓN'}
            </T>
            <T size="h2" weight="bold">{restaurant.name}</T>
            <T weight="semibold">Mesa para {live.partySize} · {formatDateShort(new Date(live.startsAt), tz)} · {formatTime(new Date(live.startsAt), tz)}</T>
            <Perforation />
            <T size="small" color={C.text2}>
              {live.status === 'pending'
                ? `${restaurant.name} tiene ${RULES.responseWindowMinutes / 60} horas para responder. Te avisamos apenas acepte.`
                : live.status === 'confirmed'
                  ? '¡Listo! Te esperan. Si no puedes ir, cancela hasta 2 horas antes.'
                  : 'No hay mesa para ese horario. Prueba otra hora u otro restaurante.'}
            </T>
          </Ticket>
          <T size="small" color={C.text3}>En la demo puedes pasar a modo restaurante desde tu Perfil y aceptar esta solicitud tú mismo.</T>
          <Button title="Ver mi reserva" onPress={() => router.replace(`/reserva/${live.id}`)} />
          <Button title="Seguir descubriendo" variant="ghost" onPress={() => router.dismissTo('/comensal')} />
        </View>
      </View>
    );
  }

  const submit = () => {
    if (!chosen) return;
    attempt(() => setCreated(createReservation({ restaurantId: restaurant.id, startsAt: chosen.startsAt.getTime(), partySize: party, note })));
  };

  const groups: [string, typeof slots][] = [['Almuerzo', slots.filter((x) => x.clock < '16:00')], ['Cena', slots.filter((x) => x.clock >= '16:00')]];

  return (
    <View style={{ flex: 1 }}>
      <Header kicker="Reserva en" title={restaurant.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 22 }} keyboardShouldPersistTaps="handled">
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <T weight="semibold">Personas</T>
            <T size="small" color={C.text3}>Hasta {RULES.maxPartySize} por reserva</T>
          </View>
          <Row gap={10}>
            <IconButton icon="minus" label="Menos personas" onPress={() => { setParty(Math.max(1, party - 1)); setStartsAt(null); }} />
            <T size="h3" weight="bold" style={{ minWidth: 26, textAlign: 'center' }} accessibilityLabel={`${party} personas`}>{party}</T>
            <IconButton icon="plus" label="Más personas" onPress={() => { setParty(Math.min(RULES.maxPartySize, party + 1)); setStartsAt(null); }} />
          </Row>
        </Card>

        <View style={{ gap: 10 }}>
          <T weight="semibold">Día</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {dates.map((d, i) => {
              const on = d === date;
              return (
                <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={formatDateShort(new Date(`${d}T17:00:00Z`), tz)} onPress={() => { setDate(d); setStartsAt(null); }} style={{ width: 58, paddingVertical: 10, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: on ? C.brand : C.lineStrong, backgroundColor: on ? C.brand : C.surface }}>
                  <T size="tiny" weight="semibold" color={on ? C.onBrand : C.text3}>{i === 0 ? 'HOY' : WD[weekdayOf(d)]}</T>
                  <T size="h3" weight="bold" color={on ? C.onBrand : C.text}>{Number(d.slice(8))}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: 14 }}>
          {slots.length === 0 && <T size="small" color={C.text3}>{restaurant.name} no recibe reservas este día.</T>}
          {groups.map(([label, list]) =>
            list.length ? (
              <View key={label} style={{ gap: 8 }}>
                <T weight="semibold">{label}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {list.map((x) => {
                    const on = x.startsAt.getTime() === startsAt;
                    return (
                      <Pressable key={x.clock} disabled={!x.available} accessibilityRole="button" accessibilityState={{ selected: on, disabled: !x.available }} onPress={() => setStartsAt(x.startsAt.getTime())} style={{ width: '31%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: on ? C.brand : C.lineStrong, backgroundColor: on ? C.brand : C.surface, opacity: x.available ? 1 : 0.35 }}>
                        <T size="small" weight="semibold" color={on ? C.onBrand : C.text}>{formatClock12(x.clock).replace(' p. m.', ' pm').replace(' a. m.', ' am')}</T>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null,
          )}
        </View>

        <View style={{ gap: 6 }}>
          <T weight="semibold">Nota para el restaurante <T size="small" color={C.text3}>(opcional)</T></T>
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={280}
            multiline
            placeholder="Cumpleaños, alergias, silla para bebé…"
            placeholderTextColor={C.text3}
            accessibilityLabel="Nota para el restaurante"
            style={{ minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, padding: 12, color: C.text, fontFamily: F.regular, fontSize: 15, textAlignVertical: 'top' }}
          />
        </View>

        <Ticket>
          <T size="tiny" weight="semibold" color={C.text3} style={{ letterSpacing: 1.4 }}>TU SOLICITUD</T>
          <T size="h3" weight="bold">
            {chosen ? `Mesa para ${party} · ${formatDateShort(chosen.startsAt, tz)} · ${formatClock12(chosen.clock)}` : `Mesa para ${party} · elige una hora`}
          </T>
          <Perforation />
          <T size="small" color={C.text2}>{restaurant.name} confirma en máximo 2 horas. Puedes cancelar sin costo hasta 2 horas antes.</T>
        </Ticket>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
        <Button title="Enviar solicitud" icon="calendar" disabled={!chosen} onPress={submit} />
      </View>
    </View>
  );
}
