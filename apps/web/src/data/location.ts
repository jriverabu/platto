// Ubicación del teléfono para «Cerca de mí». Se pide solo cuando la persona toca el botón,
// y no se guarda ni se envía a ningún servidor: se usa en el teléfono para ordenar por distancia.
import { useSyncExternalStore } from 'react';
import { referencePoint, type LatLng } from '@platto/core';

export type LocationStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';

interface LocationState {
  status: LocationStatus;
  /** Ubicación real del teléfono, si la dio. */
  user: LatLng | null;
}

let current: LocationState = { status: 'idle', user: null };
const listeners = new Set<() => void>();

function update(next: LocationState) {
  current = next;
  listeners.forEach((l) => l());
}

export function useLocation() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
  const ref = referencePoint(s.user);
  return { ...s, point: ref.point, fromUser: ref.fromUser };
}

/** Pide la ubicación una vez. Resuelve con el estado final. */
export function requestLocation(): Promise<LocationStatus> {
  if (current.status === 'ok') return Promise.resolve('ok');
  if (!('geolocation' in navigator)) {
    update({ status: 'unavailable', user: null });
    return Promise.resolve('unavailable');
  }
  update({ ...current, status: 'asking' });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({ status: 'ok', user: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        resolve('ok');
      },
      (err) => {
        const status: LocationStatus = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable';
        update({ status, user: null });
        resolve(status);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  });
}
