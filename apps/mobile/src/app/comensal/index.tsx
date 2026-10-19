// Inicio: un plato por pantalla en video vertical de 10 s, deslizando hacia arriba.
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCop, formatRating } from '@platto/core';
import { livePromotions, logView, ratingOf, selectFeed, toggleSaved, useDemo, type FeedItem } from '@platto/demo';
import { DishVideo } from '@/components/DishVideo';
import { Wordmark } from '@/components/Brand';
import { Button, Chip, Icon, IconButton, Row, T, toast } from '@/components/ui';
import { initials } from '@/lib/format';
import { posterSource } from '@/lib/videos';
import { C } from '@/lib/theme';

export default function Feed() {
  const s = useDemo();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [zone, setZone] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const items = useMemo(() => selectFeed(s, zone), [s, zone]);
  const zones = useMemo(() => [null, ...new Set(selectFeed(s, null).map((i) => i.restaurant.zone))], [s]);

  const onLayout = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);
  const onScrollEnd = (y: number) => {
    if (!height) return;
    const i = Math.round(y / height);
    if (i !== active) {
      setActive(i);
      setProgress(0);
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <FeedCard
        item={item}
        height={height}
        // Solo se montan los reproductores cercanos para cuidar memoria y batería.
        mounted={Math.abs(index - active) <= 1}
        active={focused && index === active}
        muted={muted}
        onProgress={index === active ? setProgress : undefined}
      />
    ),
    [height, active, focused, muted],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayout}>
      {height > 0 && (
        <FlatList
          data={items}
          keyExtractor={(i) => i.dish.id}
          renderItem={renderItem}
          extraData={[active, focused, muted, s]}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onMomentumScrollEnd={(e) => onScrollEnd(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(e) => onScrollEnd(e.nativeEvent.contentOffset.y)}
          windowSize={3}
          initialNumToRender={2}
          ListEmptyComponent={
            <View style={{ height, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
              <T size="h2" weight="bold">Nada por aquí todavía</T>
              <T color={C.text3}>No hay platos con video en esta zona.</T>
              <Button title="Ver todo" variant="dark" onPress={() => setZone(null)} />
            </View>
          }
        />
      )}

      {/* Encabezado fijo sobre el video */}
      <View pointerEvents="box-none" style={[st.top, { paddingTop: insets.top + 8 }]}>
        <View style={st.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: 10 }, (_, i) => (
            <View key={i} style={st.segment}>
              <View style={[st.segmentFill, { width: `${Math.max(0, Math.min(1, progress * 10 - i)) * 100}%` }]} />
            </View>
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Wordmark height={22} ink="#fff" />
          <Row gap={8}>
            <View style={st.pill}><T size="tiny" weight="semibold" style={{ letterSpacing: 1 }}>10 S</T></View>
            <IconButton icon="search" label="Buscar restaurantes" glass onPress={() => router.navigate('/comensal/explorar')} />
          </Row>
        </Row>
        <FlatList
          horizontal
          data={zones}
          keyExtractor={(z) => z ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: z }) => (
            <Chip label={z ?? 'Para ti'} selected={zone === z} onDark onPress={() => { setZone(z); setActive(0); setProgress(0); }} />
          )}
        />
      </View>

      <View style={[st.rail, { top: height * 0.42 }]}>
        <SaveButton dishId={items[active]?.dish.id} />
        <IconButton
          icon="share"
          label="Compartir"
          glass
          onPress={() => {
            const it = items[active];
            if (it) Share.share({ message: `${it.dish.name} en ${it.restaurant.name} · Platto` }).catch(() => {});
          }}
        />
        <IconButton icon={muted ? 'muted' : 'sound'} label={muted ? 'Activar sonido' : 'Silenciar'} glass onPress={() => setMuted(!muted)} />
      </View>
    </View>
  );
}

function SaveButton({ dishId }: { dishId?: string }) {
  const s = useDemo();
  if (!dishId) return null;
  const saved = s.saved.includes(dishId);
  return (
    <IconButton
      icon={saved ? 'bookmarkFill' : 'bookmark'}
      label={saved ? 'Quitar de guardados' : 'Guardar plato'}
      glass
      active={saved}
      onPress={() => {
        toggleSaved(dishId);
        toast(saved ? 'Quitado de guardados' : 'Guardado en tu perfil');
      }}
    />
  );
}

function FeedCard({ item, height, mounted, active, muted, onProgress }: { item: FeedItem; height: number; mounted: boolean; active: boolean; muted: boolean; onProgress?: (f: number) => void }) {
  const s = useDemo();
  const rating = ratingOf(s, item.restaurant.id);
  const promo = livePromotions(s, item.restaurant.id)[0];
  const poster = posterSource(item.dish.video!.poster);
  return (
    <View style={{ height, backgroundColor: '#000' }} accessibilityLabel={`${item.dish.name}, ${item.restaurant.name}`}>
      {poster && <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />}
      {mounted && <DishVideo video={item.dish.video!} active={active} muted={muted} onProgress={onProgress} onWatched={(sec) => logView(item.dish.id, sec)} />}
      <LinearGradient colors={['rgba(14,14,16,.55)', 'transparent']} style={[st.shade, { top: 0, height: 200 }]} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(14,14,16,.92)']} style={[st.shade, { bottom: 0, height: height * 0.6 }]} pointerEvents="none" />

      <View style={st.info}>
        {promo && (
          <Pressable style={st.promo} accessibilityRole="button" onPress={() => router.push(`/restaurante/${item.restaurant.id}`)}>
            <Icon name="tag" size={14} color={C.onBrand} stroke={2.4} />
            <T size="tiny" weight="semibold" color={C.onBrand} numberOfLines={1}>{promo.title}</T>
          </Pressable>
        )}
        <T size="h1" weight="bold" style={{ fontSize: 26, lineHeight: 30, paddingRight: 64 }}>{item.dish.name}</T>
        <Row gap={8}>
          <View style={st.avatar}><T size="tiny" weight="bold" color={C.onBrand}>{initials(item.restaurant.name)}</T></View>
          <T size="small" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>{item.restaurant.name}</T>
          <Icon name="verified" size={15} color={C.brand} />
          <T size="small" color={C.text3}>· {item.restaurant.zone}</T>
        </Row>
        <T size="small" color={C.text2} numberOfLines={2}>{item.dish.description}</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size="h2" weight="bold">{formatCop(item.dish.priceCop)}</T>
          <Row gap={4}>
            <Icon name="starFill" size={15} color={C.brand} />
            <T size="small" weight="semibold">{rating.average !== null ? `${formatRating(rating.average)} (${rating.count})` : `Nuevo · ${rating.count}`}</T>
          </Row>
        </Row>
        <Row gap={10} style={{ marginTop: 4 }}>
          <Button title="Ver menú" variant="ghost" style={{ flex: 1 }} onPress={() => router.push(`/restaurante/${item.restaurant.id}`)} />
          <Button title="Reservar mesa" icon="calendar" style={{ flex: 1.4 }} onPress={() => router.push(`/reservar/${item.restaurant.id}`)} />
        </Row>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, gap: 12 },
  segments: { flexDirection: 'row', gap: 3, height: 3 },
  segment: { flex: 1, backgroundColor: 'rgba(255,255,255,.25)', borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%', backgroundColor: C.brand },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: C.glass },
  rail: { position: 'absolute', right: 14, gap: 14 },
  shade: { position: 'absolute', left: 0, right: 0 },
  info: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 10 },
  promo: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 12, borderRadius: 999, backgroundColor: C.brand },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
});
