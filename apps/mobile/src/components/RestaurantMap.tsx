// Mapa nativo: Apple Maps en iOS y Google Maps en Android (react-native-maps).
// En Android, las compilaciones de tienda necesitan la llave gratuita de Maps SDK (ver README).
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import type { LatLng } from '@platto/core';
import { T } from './ui';
import { st, type MapPoint } from './RestaurantMap.shared';

export type { MapPoint };
import { C } from '@/lib/theme';

// Estilo oscuro para Google Maps (Android). En iOS se usa el modo oscuro de Apple Maps.
const DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1b1b1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8d8d96' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e10' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c31' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a24' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export function RestaurantMap({ points, center, user, selectedId, onSelect, recenter }: {
  points: MapPoint[];
  center: LatLng;
  user: LatLng | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  recenter: number;
}) {
  const ref = useRef<MapView>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.animateToRegion({ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
  }, [recenter, center.lat, center.lng]);

  const fit = () => {
    const coords = [...points.map((p) => ({ latitude: p.lat, longitude: p.lng })), ...(user ? [{ latitude: user.lat, longitude: user.lng }] : [])];
    if (coords.length > 1) ref.current?.fitToCoordinates(coords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: false });
  };

  return (
    <View style={st.box}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle="dark"
        customMapStyle={DARK}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        onMapReady={fit}
        showsUserLocation={!!user}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {points.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={() => onSelect(p.id)} anchor={{ x: 0.1, y: 1 }} accessibilityLabel={p.title} tracksViewChanges={false}>
            <View style={[st.pin, p.hot && st.hot, p.id === selectedId && st.on]}>
              <T size="tiny" weight="bold" color={p.id === selectedId ? C.onBrand : p.hot ? '#1A1A1C' : C.text}>{p.label}</T>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
