// Ubicación para «Cerca de mí». Se pide solo al tocar el botón y no se guarda.
import { useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { referencePoint, type LatLng } from '@platto/core';

export type LocationStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';

let current: { status: LocationStatus; user: LatLng | null } = { status: 'idle', user: null };
const listeners = new Set<() => void>();
const update = (next: typeof current) => {
  current = next;
  listeners.forEach((l) => l());
};

export function useLocation() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
  );
  const ref = referencePoint(s.user);
  return { ...s, point: ref.point, fromUser: ref.fromUser };
}

export async function requestLocation(): Promise<LocationStatus> {
  if (current.status === 'ok') return 'ok';
  update({ ...current, status: 'asking' });
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      update({ status: 'denied', user: null });
      return 'denied';
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    update({ status: 'ok', user: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
    return 'ok';
  } catch {
    update({ status: 'unavailable', user: null });
    return 'unavailable';
  }
}
