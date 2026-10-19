// Calificar: solo quien reservó y fue, de 2 h a 14 días después. 1 a 5, platos, etiquetas y comentario.
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RATING_LABELS, REVIEW_TAGS, RULES, formatDateShort, formatTime } from '@platto/core';
import { submitReview, useDemo } from '@platto/demo';
import { Button, Card, Chip, Header, Icon, Row, T, attempt } from '@/components/ui';
import { posterSource } from '@/lib/videos';
import { C, F } from '@/lib/theme';

const HEIGHTS = [52, 64, 76, 88, 100];

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useDemo();
  const insets = useSafeAreaInsets();
  const r = s.reservations.find((x) => x.id === id);
  const [score, setScore] = useState(5);
  const [dishIds, setDishIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  if (!r) return null;
  const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
  const dishes = s.dishes.filter((d) => d.restaurantId === rest.id && d.video);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (done) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: insets.top + 60, gap: 16 }}>
        <T size="display" weight="bold" color={C.brand} style={{ fontSize: 96, lineHeight: 100 }}>{score}</T>
        <T size="h1" weight="bold">Gracias por contarlo</T>
        <T color={C.text3}>Tu calificación ya cuenta en el promedio de {rest.name} y ayuda a que otros elijan mejor.</T>
        <Button title="Volver al inicio" onPress={() => router.dismissTo('/comensal')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header kicker={`${formatDateShort(new Date(r.startsAt), rest.timezone)} · mesa para ${r.partySize} · ${formatTime(new Date(r.startsAt), rest.timezone)}`} title={`¿Cómo estuvo ${rest.name}?`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 16 }}>
          <Row gap={12} style={{ alignItems: 'baseline' }}>
            <T size="display" weight="bold" color={C.brand} style={{ fontSize: 52, lineHeight: 56 }}>{score}</T>
            <T size="lead" weight="semibold">{RATING_LABELS[score]}</T>
          </Row>
          <Row gap={8} style={{ alignItems: 'flex-end' }} accessibilityRole="radiogroup" accessibilityLabel="Calificación de 1 a 5">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: score === n }} accessibilityLabel={`${n} de 5, ${RATING_LABELS[n]}`} onPress={() => setScore(n)} style={{ flex: 1, height: HEIGHTS[i], borderRadius: 12, backgroundColor: n <= score ? C.brand : C.surface3, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 }}>
                <T weight="bold" color={n <= score ? C.onBrand : C.text3}>{n}</T>
              </Pressable>
            ))}
          </Row>
        </Card>

        <View style={{ gap: 10 }}>
          <T weight="semibold">¿Qué platos pediste?</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {dishes.map((d) => {
              const on = dishIds.includes(d.id);
              const poster = posterSource(d.video?.poster ?? null);
              return (
                <Pressable key={d.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={d.name} onPress={() => setDishIds(toggle(dishIds, d.id))} style={{ width: '31%', gap: 6 }}>
                  <View style={{ height: 130, borderRadius: 12, overflow: 'hidden', borderWidth: on ? 3 : 0, borderColor: C.brand, backgroundColor: '#000' }}>
                    {poster && <Image source={poster} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
                    {on && <View style={{ position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} stroke={3} color={C.onBrand} /></View>}
                  </View>
                  <T size="small" weight="semibold" numberOfLines={2}>{d.name}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <T weight="semibold">Lo mejor fue…</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REVIEW_TAGS.map((t) => <Chip key={t} label={t} selected={tags.includes(t)} onPress={() => setTags(toggle(tags, t))} />)}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <T weight="semibold">Cuéntale a otros <T size="small" color={C.text3}>(opcional)</T></T>
          <TextInput
            value={comment}
            onChangeText={setComment}
            maxLength={RULES.reviewCommentMax}
            multiline
            placeholder="¿Qué deberían pedir? ¿Qué cambiarías?"
            placeholderTextColor={C.text3}
            accessibilityLabel="Cuéntale a otros"
            style={{ minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, padding: 12, color: C.text, fontFamily: F.regular, fontSize: 15, textAlignVertical: 'top' }}
          />
          <T size="tiny" color={C.text3} style={{ alignSelf: 'flex-end' }}>{comment.length} / {RULES.reviewCommentMax}</T>
        </View>
        <T size="tiny" color={C.text3} style={{ textAlign: 'center' }}>Tu reseña se publica con tu nombre corto y la fecha de tu visita. {rest.name} puede responderla, pero no borrarla.</T>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: C.line }}>
        <Button title="Publicar calificación" onPress={() => attempt(() => { submitReview({ reservationId: r.id, rating: score, comment, tags, dishIds }); setDone(true); })} />
      </View>
    </View>
  );
}
