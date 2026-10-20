// Perfil del restaurante: portada en video, promociones, menú en video, opiniones verificadas e información.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClock12, formatCop, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { featured, livePromotions, now, ratingOf, reportReview, slotsFor, useDemo, type DishRow } from '@platto/demo';
import { DishVideo } from '@/components/DishVideo';
import { PromoCard } from '@/components/PromoCard';
import { DishViewer } from '@/components/DishViewer';
import { Badge, Button, Chip, Icon, IconButton, Row, Stars, T, attempt } from '@/components/ui';
import { initials } from '@/lib/format';
import { posterSource } from '@/lib/videos';
import { C } from '@/lib/theme';

type Tab = 'menu' | 'reviews' | 'info';
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useDemo();
  const insets = useSafeAreaInsets();
  const restaurant = s.restaurants.find((r) => r.id === id);
  const categories = useMemo(() => s.categories.filter((c) => c.restaurantId === id).sort((a, b) => a.position - b.position), [s, id]);
  const [tab, setTab] = useState<Tab>('menu');
  const [cat, setCat] = useState<string | null>(null);
  const [openDish, setOpenDish] = useState<DishRow | null>(null);
  if (!restaurant) return null;

  const dishes = s.dishes
    .filter((d) => d.restaurantId === id && (!cat || d.categoryId === cat))
    .sort((a, b) => categories.findIndex((c) => c.id === a.categoryId) - categories.findIndex((c) => c.id === b.categoryId) || a.position - b.position);
  const cover = s.dishes.find((d) => d.id === restaurant.coverDishId)?.video ?? s.dishes.find((d) => d.restaurantId === id && d.video)?.video;
  const rating = ratingOf(s, restaurant.id);
  const reviews = s.reviews.filter((r) => r.restaurantId === id && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const today = localParts(new Date(now()), restaurant.timezone).date;
  const next = slotsFor(s, restaurant.id, today, 2).find((x) => x.available);
  const rules = s.rules.filter((r) => r.restaurantId === id);
  const promos = livePromotions(s, restaurant.id);
  const withVideo = dishes.filter((d) => d.video);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <View style={{ height: 300, backgroundColor: '#000' }}>
          {cover?.poster && <Image source={posterSource(cover.poster)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />}
          {cover && <DishVideo video={cover} active={!openDish} />}
          <LinearGradient colors={['transparent', C.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 }} pointerEvents="none" />
          <Row style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, justifyContent: 'space-between' }}>
            <IconButton icon="back" label="Volver" glass onPress={() => router.back()} />
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(14,14,16,.6)' }}>
              <T size="tiny" weight="semibold" style={{ letterSpacing: 1 }}>PORTADA · 10 S</T>
            </View>
          </Row>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -54, gap: 16 }}>
          <Row gap={12} style={{ alignItems: 'flex-end' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: C.brand, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
              <T size="h3" weight="bold">{initials(restaurant.name)}</T>
            </View>
            {featured(s, restaurant.id) && <View style={{ marginBottom: 8 }}><Badge tone="brand" label="Destacado" /></View>}
          </Row>

          <View style={{ gap: 4 }}>
            <Row gap={8}>
              <T size="h1" weight="bold" style={{ flexShrink: 1 }}>{restaurant.name}</T>
              <Icon name="verified" size={22} color={C.brand} />
            </Row>
            <T size="small" color={C.text2}>{restaurant.cuisine} · {formatPriceLevel(restaurant.priceLevel)}</T>
            <Row gap={12} style={{ flexWrap: 'wrap' }}>
              <Row gap={4}>
                <Icon name="starFill" size={15} color={C.brand} />
                <T size="small" weight="semibold">{rating.average !== null ? formatRating(rating.average) : 'Nuevo'}</T>
                <T size="small" color={C.text2}>({rating.count})</T>
              </Row>
              <Row gap={4}><Icon name="clock" size={15} color={C.text2} /><T size="small" color={C.text2}>{next ? `Mesas hoy desde ${formatClock12(next.clock)}` : 'Hoy sin mesas'}</T></Row>
            </Row>
            <Row gap={4}><Icon name="pin" size={15} color={C.text2} /><T size="small" color={C.text2}>{restaurant.zone}, Cúcuta</T></Row>
          </View>

          <Button
            title={restaurant.reservationsEnabled ? 'Reservar mesa' : 'No recibe reservas por ahora'}
            icon="calendar"
            disabled={!restaurant.reservationsEnabled}
            onPress={() => router.push(`/reservar/${restaurant.id}`)}
          />

          {promos.map((p) => <PromoCard key={p.id} p={p} timeZone={restaurant.timezone} />)}

          <Row gap={22} style={{ borderBottomWidth: 1, borderBottomColor: C.line }} accessibilityRole="tablist">
            {([['menu', 'Menú en video'], ['reviews', 'Opiniones'], ['info', 'Información']] as const).map(([k, label]) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)} style={{ minHeight: 46, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: tab === k ? C.brand : 'transparent' }}>
                <T size="small" weight={tab === k ? 'semibold' : 'medium'} color={tab === k ? C.brandHi : C.text3}>{label}</T>
              </Pressable>
            ))}
          </Row>

          {tab === 'menu' && (
            <View style={{ gap: 12 }}>
              {categories.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Chip label="Todo" selected={cat === null} onPress={() => setCat(null)} />
                  {categories.map((c) => <Chip key={c.id} label={c.name} selected={cat === c.id} onPress={() => setCat(c.id)} />)}
                </ScrollView>
              )}
              {dishes.map((d) => {
                const poster = posterSource(d.video?.poster ?? null);
                return (
                  <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={d.name} onPress={() => d.video && setOpenDish(d)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                    <View style={{ width: 84, height: 112, borderRadius: 12, overflow: 'hidden', backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      {poster ? <Image source={poster} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon name="play" color={C.text3} />}
                      {d.video && <View style={{ position: 'absolute', right: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.6)' }}><T size="tiny" weight="semibold">0:{String(Math.round(d.video.duration)).padStart(2, '0')}</T></View>}
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <T weight="semibold">{d.name}</T>
                      <T size="small" color={C.text3} numberOfLines={2}>{d.description}</T>
                      <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                        <T weight="bold">{formatCop(d.priceCop)}</T>
                        {!d.isAvailable ? <Badge label="Agotado hoy" /> : d.tags[0] ? <Badge label={d.tags[0]} /> : null}
                      </Row>
                    </View>
                  </Pressable>
                );
              })}
              {dishes.length === 0 && <T size="small" color={C.text3}>Esta categoría aún no tiene platos.</T>}
            </View>
          )}

          {tab === 'reviews' && (
            <View style={{ gap: 12 }}>
              <T size="small" color={C.text3}>Solo opinan personas que reservaron y fueron.</T>
              {reviews.length === 0 && <T size="small" color={C.text3}>Todavía no hay opiniones.</T>}
              {reviews.map((r) => (
                <View key={r.id} style={{ backgroundColor: C.surface, borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: C.line }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={10}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' }}>
                        <T size="tiny" weight="bold">{r.authorName.split(' ').map((p) => p[0]).join('').slice(0, 2)}</T>
                      </View>
                      <View style={{ gap: 2 }}>
                        <T size="small" weight="semibold">{r.authorName}</T>
                        <Stars value={r.rating} />
                      </View>
                    </Row>
                    <Badge tone="ok" icon="check" label="Verificada" />
                  </Row>
                  {r.comment && <T size="small" color={C.text2}>{r.comment}</T>}
                  {r.tags.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{r.tags.map((t) => <Badge key={t} label={t} />)}</View>}
                  {r.reply && (
                    <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 10 }}>
                      <T size="small" color={C.text2}><T size="small" weight="semibold">Respuesta de {restaurant.name}: </T>{r.reply}</T>
                    </View>
                  )}
                  {!r.reported && (
                    <Pressable accessibilityRole="button" onPress={() => attempt(() => reportReview(r.id), 'Gracias. La revisaremos.')} hitSlop={8}>
                      <T size="tiny" color={C.text3}>Reportar</T>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {tab === 'info' && (
            <View style={{ gap: 12 }}>
              <T size="small" color={C.text2}>{restaurant.description}</T>
              <View style={{ backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line }}>
                <Row gap={12} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
                  <Icon name="pin" color={C.text} />
                  <View><T size="small" weight="semibold">{restaurant.address}</T><T size="tiny" color={C.text3}>{restaurant.zone}, Cúcuta</T></View>
                </Row>
                <Row gap={12} style={{ paddingVertical: 14, alignItems: 'flex-start' }}>
                  <Icon name="clock" color={C.text} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <T size="small" weight="semibold">Horario de reservas</T>
                    {[1, 2, 3, 4, 5, 6, 0].map((w) => {
                      const day = rules.filter((r) => r.weekday === w).sort((a, b) => a.startTime.localeCompare(b.startTime));
                      return (
                        <Row key={w} style={{ justifyContent: 'space-between' }}>
                          <T size="tiny" color={C.text3}>{WEEKDAYS[w]}</T>
                          <T size="tiny" color={C.text2}>{day.length ? day.map((r) => `${formatClock12(r.startTime)} – ${formatClock12(r.endTime)}`).join(' · ') : 'Cerrado'}</T>
                        </Row>
                      );
                    })}
                  </View>
                </Row>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {openDish && (
        <DishViewer
          dishes={withVideo}
          startIndex={Math.max(0, withVideo.findIndex((d) => d.id === openDish.id))}
          restaurant={restaurant}
          onClose={() => setOpenDish(null)}
          onReserve={() => { setOpenDish(null); router.push(`/reservar/${restaurant.id}`); }}
        />
      )}
    </View>
  );
}
