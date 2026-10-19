// Promociones del restaurante (plan Pro): hasta 3 encendidas, por días de la semana y con fecha final.
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { RULES, addCalendarDays, countsTowardPromoLimit, formatPromoDays, isPromotionLive, localParts, type Promotion } from '@platto/core';
import { deletePromotion, now, planOf, savePromotion, setPromotionActive, useDemo } from '@platto/demo';
import { dayLabel, PromoCard } from '@/components/PromoCard';
import { Badge, Button, Card, Chip, Header, IconButton, Row, Sheet, T, attempt } from '@/components/ui';
import { C, F } from '@/lib/theme';

const WEEK = [
  { d: 1, short: 'L', name: 'lunes' },
  { d: 2, short: 'M', name: 'martes' },
  { d: 3, short: 'M', name: 'miércoles' },
  { d: 4, short: 'J', name: 'jueves' },
  { d: 5, short: 'V', name: 'viernes' },
  { d: 6, short: 'S', name: 'sábado' },
  { d: 0, short: 'D', name: 'domingo' },
];
const LENGTHS = [
  { days: 7, label: '1 semana' },
  { days: 14, label: '2 semanas' },
  { days: 30, label: '1 mes' },
  { days: 60, label: '2 meses' },
  { days: RULES.promoMaxDays, label: '3 meses' },
];

interface Draft {
  id?: string;
  title: string;
  detail: string;
  weekdays: number[];
  startsOn: string;
  days: number;
}

export default function Promotions() {
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const plan = planOf(s, rid);
  const today = localParts(new Date(now()), rest.timezone).date;
  const [draft, setDraft] = useState<Draft | null>(null);
  const mine = s.promotions.filter((p) => p.restaurantId === rid).sort((a, b) => Number(b.active) - Number(a.active) || a.endsOn.localeCompare(b.endsOn));
  const activeCount = mine.filter((p) => countsTowardPromoLimit(p, today)).length;

  if (plan !== 'pro') {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Promociones" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          <PromoCard
            timeZone={rest.timezone}
            p={{ id: 'ejemplo', restaurantId: rid, title: 'Las promociones vienen con el plan Pro', detail: 'Crea ofertas como «2x1 en entradas» o «postre gratis en mesas de 4». Se ven sobre tus videos en Inicio, en Explorar y en tu perfil, solo los días que elijas.', weekdays: [], startsOn: today, endsOn: addCalendarDays(today, 30), active: true }}
          />
          <Button title="Ver plan Pro" onPress={() => router.push('/planes')} />
        </View>
      </View>
    );
  }

  const status = (p: Promotion) => {
    if (p.endsOn < today) return { text: 'Terminó', tone: 'neutral' as const };
    if (!p.active) return { text: 'En pausa', tone: 'neutral' as const };
    if (p.startsOn > today) return { text: `Empieza el ${dayLabel(p.startsOn, rest.timezone)}`, tone: 'warn' as const };
    if (isPromotionLive(p, plan, new Date(now()), rest.timezone)) return { text: 'Se ve hoy', tone: 'ok' as const };
    return { text: 'Hoy no aplica', tone: 'neutral' as const };
  };

  const save = () => {
    if (!draft) return;
    const ok = attempt(
      () => savePromotion(rid, { id: draft.id, title: draft.title, detail: draft.detail, weekdays: draft.weekdays, startsOn: draft.startsOn, endsOn: addCalendarDays(draft.startsOn, draft.days - 1) }),
      draft.id ? 'Promoción actualizada' : 'Promoción publicada',
    );
    if (ok) setDraft(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <Header kicker={rest.name} title="Promociones" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 16 }}>
        <T size="small" color={C.text3}>Se ven en Inicio, en Explorar y en tu perfil los días que elijas. Puedes tener hasta {RULES.promoMaxActive} encendidas a la vez ({activeCount} de {RULES.promoMaxActive}).</T>
        <Button title="Nueva promoción" icon="plus" onPress={() => setDraft({ title: '', detail: '', weekdays: [], startsOn: today, days: 30 })} />
        {mine.length === 0 && <T size="small" color={C.text3} style={{ textAlign: 'center', paddingVertical: 20 }}>Todavía no tienes promociones.</T>}
        {mine.map((p) => {
          const st = status(p);
          return (
            <Card key={p.id} style={{ gap: 10 }}>
              <Row gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <T weight="semibold">{p.title}</T>
                  {p.detail && <T size="small" color={C.text2}>{p.detail}</T>}
                </View>
                <Switch value={p.active} onValueChange={(v) => { attempt(() => setPromotionActive(p.id, v), v ? 'Promoción encendida' : 'Promoción en pausa'); }} trackColor={{ true: C.brand, false: C.surface3 }} thumbColor="#fff" accessibilityLabel={`Encender ${p.title}`} />
              </Row>
              <T size="tiny" color={C.text3}>{formatPromoDays(p.weekdays)} · {dayLabel(p.startsOn, rest.timezone)} al {dayLabel(p.endsOn, rest.timezone)}</T>
              <Row style={{ justifyContent: 'space-between' }}>
                <Badge tone={st.tone} label={st.text} />
                <Row gap={6}>
                  <IconButton icon="edit" label={`Editar ${p.title}`} size={38} onPress={() => setDraft({ id: p.id, title: p.title, detail: p.detail ?? '', weekdays: p.weekdays, startsOn: p.startsOn < today ? today : p.startsOn, days: Math.max(1, Math.round((Date.parse(p.endsOn) - Date.parse(p.startsOn < today ? today : p.startsOn)) / 86_400_000) + 1) })} />
                  <IconButton
                    icon="trash"
                    label={`Borrar ${p.title}`}
                    size={38}
                    onPress={() => Alert.alert('¿Borrar esta promoción?', p.title, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => attempt(() => deletePromotion(p.id), 'Promoción borrada') }])}
                  />
                </Row>
              </Row>
            </Card>
          );
        })}
      </ScrollView>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} label="Promoción">
        {draft && (
          <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <T size="h2" weight="bold">{draft.id ? 'Editar promoción' : 'Nueva promoción'}</T>
            <View style={{ gap: 6 }}>
              <T size="small" weight="semibold">Nombre</T>
              <TextInput value={draft.title} maxLength={RULES.promoTitleMax} onChangeText={(v) => setDraft({ ...draft, title: v })} placeholder="2x1 en entradas" placeholderTextColor={C.text3} style={input} accessibilityLabel="Nombre" />
              <T size="tiny" color={C.text3} style={{ alignSelf: 'flex-end' }}>{draft.title.length}/{RULES.promoTitleMax}</T>
            </View>
            <View style={{ gap: 6 }}>
              <T size="small" weight="semibold">Condiciones</T>
              <TextInput value={draft.detail} maxLength={RULES.promoDetailMax} multiline onChangeText={(v) => setDraft({ ...draft, detail: v })} placeholder="Solo en la cena. No acumulable." placeholderTextColor={C.text3} style={[input, { minHeight: 70, paddingTop: 12, textAlignVertical: 'top' }]} accessibilityLabel="Condiciones" />
            </View>
            <View style={{ gap: 6 }}>
              <T size="small" weight="semibold">Días</T>
              <Row gap={6}>
                {WEEK.map((w) => {
                  const on = draft.weekdays.length === 0 || draft.weekdays.includes(w.d);
                  return (
                    <Pressable
                      key={w.d}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={w.name}
                      onPress={() => {
                        const base = draft.weekdays.length === 0 ? WEEK.map((x) => x.d) : draft.weekdays;
                        const next = on ? base.filter((d) => d !== w.d) : [...base, w.d];
                        if (next.length === 0) return;
                        setDraft({ ...draft, weekdays: next.length === 7 ? [] : next });
                      }}
                      style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? C.brand : C.lineStrong, backgroundColor: on ? C.brand : C.surface2 }}
                    >
                      <T size="small" weight="semibold" color={on ? C.onBrand : C.text2}>{w.short}</T>
                    </Pressable>
                  );
                })}
              </Row>
              <T size="tiny" color={C.text3}>{formatPromoDays(draft.weekdays)}</T>
            </View>
            <View style={{ gap: 6 }}>
              <T size="small" weight="semibold">Duración, desde {dayLabel(draft.startsOn, rest.timezone)}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {LENGTHS.map((l) => <Chip key={l.days} label={l.label} selected={draft.days === l.days} onPress={() => setDraft({ ...draft, days: l.days })} />)}
              </View>
              <T size="tiny" color={C.text3}>Termina el {dayLabel(addCalendarDays(draft.startsOn, draft.days - 1), rest.timezone)}</T>
            </View>
            <Button title={draft.id ? 'Guardar cambios' : 'Publicar promoción'} disabled={!draft.title.trim()} onPress={save} />
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}

const input = { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface2, paddingHorizontal: 14, color: C.text, fontFamily: F.regular, fontSize: 15 } as const;
