// Versión web de la app (solo para revisar en el navegador): plano simple con los mismos puntos.
// La PWA (apps/web) tiene su propio mapa con MapLibre; en el teléfono se usa el mapa nativo.
import { Pressable, View } from 'react-native';
import type { LatLng } from '@platto/core';
import { T } from './ui';
import { C } from '@/lib/theme';
import { st, type MapPoint } from './RestaurantMap.shared';

export type { MapPoint };

export function RestaurantMap({ points, center, user, selectedId, onSelect }: {
  points: MapPoint[];
  center: LatLng;
  user: LatLng | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  recenter: number;
}) {
  const all = [...points, ...(user ? [user] : []), center];
  const pad = 0.004;
  const minLat = Math.min(...all.map((p) => p.lat)) - pad;
  const maxLat = Math.max(...all.map((p) => p.lat)) + pad;
  const minLng = Math.min(...all.map((p) => p.lng)) - pad;
  const maxLng = Math.max(...all.map((p) => p.lng)) + pad;
  const pos = (p: LatLng) => ({
    left: `${8 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 80}%` as const,
    top: `${8 + ((maxLat - p.lat) / (maxLat - minLat || 1)) * 78}%` as const,
  });
  return (
    <View style={st.box}>
      {points.map((p) => (
        <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.title} onPress={() => onSelect(p.id)} style={[st.pin, p.hot && st.hot, p.id === selectedId && st.on, { position: 'absolute', ...pos(p) }]}>
          <T size="tiny" weight="bold" color={p.id === selectedId ? C.onBrand : p.hot ? '#1A1A1C' : C.text}>{p.label}</T>
        </Pressable>
      ))}
      {user && <View style={{ position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#4C9BFF', borderWidth: 3, borderColor: '#fff', ...pos(user) }} />}
      <T size="tiny" color={C.text3} style={{ position: 'absolute', left: 12, bottom: 10 }}>Vista previa web · en el teléfono se ve el mapa real</T>
    </View>
  );
}
