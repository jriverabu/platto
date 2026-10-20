// Plato a pantalla completa: el video ocupa todo, como en Inicio. Deslizando hacia arriba
// se pasa al siguiente plato del mismo restaurante.
import { useCallback, useState } from 'react';
import { FlatList, Modal, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCop } from '@platto/core';
import { logView, type DemoState, type DishRow } from '@platto/demo';
import { DishVideo } from './DishVideo';
import { Badge, Button, IconButton, Row, T } from './ui';
import { posterSource } from '@/lib/videos';
import { C } from '@/lib/theme';

type Restaurant = DemoState['restaurants'][number];

export function DishViewer({
  dishes,
  startIndex,
  restaurant,
  onClose,
  onReserve,
}: {
  /** Platos con video, en el orden del menú. */
  dishes: DishRow[];
  startIndex: number;
  restaurant: Restaurant;
  onClose: () => void;
  onReserve: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

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
    ({ item, index }: { item: DishRow; index: number }) => {
      const poster = posterSource(item.video!.poster);
      return (
        <View style={{ height, backgroundColor: '#000' }} accessibilityLabel={`${item.name}, ${restaurant.name}`}>
          {poster && <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />}
          {Math.abs(index - active) <= 1 && (
            <DishVideo
              video={item.video!}
              active={index === active}
              muted={muted}
              onProgress={index === active ? setProgress : undefined}
              onWatched={(sec) => logView(item.id, sec)}
            />
          )}
          <LinearGradient colors={['rgba(14,14,16,.6)', 'transparent']} style={[st.shade, { top: 0, height: 200 }]} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(14,14,16,.94)']} style={[st.shade, { bottom: 0, height: height * 0.55 }]} pointerEvents="none" />
          <View style={[st.info, { bottom: insets.bottom + 16 }]}>
            {item.tags[0] && <Badge tone="dark" label={item.tags[0]} />}
            <T size="h1" weight="bold" style={{ fontSize: 28, lineHeight: 32 }}>{item.name}</T>
            <T size="small" weight="medium" color={C.text2}>{restaurant.name} · {restaurant.zone}</T>
            <T size="small" color={C.text2} numberOfLines={3}>{item.description}</T>
            <T size="h2" weight="bold">{formatCop(item.priceCop)}</T>
            {!item.isAvailable && <Badge tone="warn" label="Agotado hoy" />}
            <Button title="Reservar para probarlo" icon="calendar" onPress={onReserve} style={{ marginTop: 4 }} />
          </View>
        </View>
      );
    },
    [height, active, muted, insets.bottom, restaurant, onReserve],
  );

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={onLayout}>
        {height > 0 && (
          <FlatList
            data={dishes}
            keyExtractor={(d) => d.id}
            renderItem={renderItem}
            extraData={[active, muted]}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            onMomentumScrollEnd={(e) => onScrollEnd(e.nativeEvent.contentOffset.y)}
            onScrollEndDrag={(e) => onScrollEnd(e.nativeEvent.contentOffset.y)}
            windowSize={3}
            initialNumToRender={1}
          />
        )}

        <View pointerEvents="box-none" style={[st.top, { paddingTop: insets.top + 8 }]}>
          <View style={st.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: 10 }, (_, i) => (
              <View key={i} style={st.segment}>
                <View style={[st.segmentFill, { width: `${Math.max(0, Math.min(1, progress * 10 - i)) * 100}%` }]} />
              </View>
            ))}
          </View>
          <Row style={{ justifyContent: 'space-between' }}>
            <IconButton icon="close" label="Cerrar" glass onPress={onClose} />
            <Row gap={8}>
              {dishes.length > 1 && (
                <View style={st.pill}><T size="tiny" weight="semibold">{active + 1} de {dishes.length}</T></View>
              )}
              <IconButton icon={muted ? 'muted' : 'sound'} label={muted ? 'Activar sonido' : 'Silenciar'} glass onPress={() => setMuted(!muted)} />
            </Row>
          </Row>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, gap: 12 },
  segments: { flexDirection: 'row', gap: 3, height: 3 },
  segment: { flex: 1, backgroundColor: 'rgba(255,255,255,.25)', borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%', backgroundColor: C.brand },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.glass },
  shade: { position: 'absolute', left: 0, right: 0 },
  info: { position: 'absolute', left: 16, right: 16, gap: 8 },
});
