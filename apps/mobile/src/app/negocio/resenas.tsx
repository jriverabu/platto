// Modo restaurante · Reseñas verificadas: resumen y respuesta pública (una por reseña).
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { formatDateShort, formatRating } from '@platto/core';
import { ratingOf, replyReview, useDemo } from '@platto/demo';
import { Badge, Button, Card, Header, Row, Stars, T, attempt } from '@/components/ui';
import { C, F } from '@/lib/theme';

export default function RestaurantReviews() {
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const reviews = s.reviews.filter((r) => r.restaurantId === rid && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const rating = ratingOf(s, rid);
  const max = Math.max(1, ...rating.distribution);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
      <Header kicker="Calificaciones verificadas" title="Reseñas" />
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <Card style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ width: 90, alignItems: 'center' }}>
            <T size="display" weight="bold">{rating.average !== null ? formatRating(rating.average) : '—'}</T>
            <T size="tiny" color={C.text3}>{rating.count} reseñas</T>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <Row key={n} gap={8}>
                <T size="tiny" style={{ width: 10 }}>{n}</T>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.surface3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${(rating.distribution[n - 1]! / max) * 100}%`, backgroundColor: n === 5 ? C.brand : C.text3 }} />
                </View>
                <T size="tiny" color={C.text3} style={{ width: 18, textAlign: 'right' }}>{rating.distribution[n - 1]}</T>
              </Row>
            ))}
          </View>
        </Card>
        <T size="small" color={C.text3}>Solo califica quien tuvo una reserva completada. Puedes responder cada reseña una vez; no se pueden borrar.</T>

        {reviews.map((r) => {
          const dishes = s.dishes.filter((d) => r.dishIds.includes(d.id)).map((d) => d.name);
          const draft = drafts[r.id] ?? '';
          return (
            <Card key={r.id} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ gap: 2 }}><T weight="semibold">{r.authorName}</T><Stars value={r.rating} /></View>
                <T size="tiny" color={C.text3}>{formatDateShort(new Date(r.createdAt), 'America/Bogota')}</T>
              </Row>
              {r.comment && <T size="small">{r.comment}</T>}
              {(dishes.length > 0 || r.tags.length > 0) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {dishes.map((d) => <Badge key={d} tone="dark" label={d} />)}
                  {r.tags.map((t) => <Badge key={t} label={t} />)}
                </View>
              )}
              {r.reply ? (
                <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 10 }}>
                  <T size="small" color={C.text2}><T size="small" weight="semibold">Tu respuesta: </T>{r.reply}</T>
                </View>
              ) : (
                <Row gap={8}>
                  <TextInput
                    value={draft}
                    onChangeText={(v) => setDrafts({ ...drafts, [r.id]: v })}
                    maxLength={500}
                    placeholder="Responder públicamente"
                    placeholderTextColor={C.text3}
                    accessibilityLabel={`Responder a ${r.authorName}`}
                    style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface2, paddingHorizontal: 12, color: C.text, fontFamily: F.regular, fontSize: 14 }}
                  />
                  <Button title="Enviar" variant="dark" small disabled={!draft.trim()} onPress={() => attempt(() => replyReview(r.id, draft), 'Respuesta publicada')} />
                </Row>
              )}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}
