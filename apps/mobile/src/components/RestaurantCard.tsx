import { View } from 'react-native';
import { Image } from 'expo-image';
import { formatClock12, formatDistance, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { TZ, featured, livePromotions, now, ratingOf, slotsFor, type DemoState } from '@platto/demo';
import { Badge, Card, Icon, Row, T } from './ui';
import { posterSource } from '@/lib/videos';
import { C } from '@/lib/theme';

type Restaurant = DemoState['restaurants'][number];

export function RestaurantCard({ s, r, km, onPress }: { s: DemoState; r: Restaurant; km: number | null; onPress: () => void }) {
  const today = localParts(new Date(now()), TZ).date;
  const cover = posterSource(s.dishes.find((d) => d.id === r.coverDishId)?.video?.poster ?? null);
  const rating = ratingOf(s, r.id);
  const next = slotsFor(s, r.id, today, 2).find((x) => x.available);
  const dishCount = s.dishes.filter((d) => d.restaurantId === r.id && d.video).length;
  const promo = livePromotions(s, r.id)[0];
  return (
    <Card onPress={onPress} label={r.name} style={{ flexDirection: 'row', gap: 12, padding: 10 }}>
      <View style={{ width: 96, height: 96, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}>
        {cover && <Image source={cover} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
        <View style={{ position: 'absolute', left: 34, top: 34, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.45)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,.85)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="play" size={14} color="#fff" />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Row gap={4} style={{ flexShrink: 1 }}>
            <T weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</T>
            <Icon name="verified" size={15} color={C.brand} />
          </Row>
          <Row gap={4}>
            <Icon name="starFill" size={14} color={C.brand} />
            <T size="small" weight="semibold">{rating.average !== null ? formatRating(rating.average) : 'Nuevo'}</T>
          </Row>
        </Row>
        <T size="small" color={C.text3} numberOfLines={1}>{r.cuisine} · {r.zone}{km !== null ? ` · a ${formatDistance(km)}` : ''} · {formatPriceLevel(r.priceLevel)}</T>
        <T size="tiny" color={C.text3}>{dishCount} {dishCount === 1 ? 'plato' : 'platos'} en video · {rating.count} reseñas verificadas</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
          {promo && <Badge tone="brand" icon="tag" label={promo.title} />}
          {next ? <Badge tone="ok" label={`Mesas hoy desde ${formatClock12(next.clock)}`} /> : <Badge label="Sin mesas hoy" />}
          {featured(s, r.id) && !promo && <Badge tone="brand" label="Destacado" />}
        </View>
      </View>
    </Card>
  );
}
