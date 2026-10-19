// Mapa de restaurantes para «Cerca de mí».
// Usa MapLibre (código abierto) con los mapas de OpenFreeMap: gratis, sin llave y con uso comercial permitido.
// MapLibre se carga solo al abrir el mapa, para que el resto de la app siga liviana.
// Sin conexión, sin WebGL o si el servidor de mapas no responde, muestra un plano simple con los mismos puntos.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng } from '@platto/core';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';
const LOAD_TIMEOUT_MS = 9000;

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  /** Iniciales que van dentro del pin. */
  label: string;
  title: string;
  /** Tiene promoción hoy. */
  hot: boolean;
}

interface Props {
  points: MapPoint[];
  center: LatLng;
  user: LatLng | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Cambia este número para volver a centrar en `center`. */
  recenter: number;
}

// Tipos mínimos de MapLibre que usamos (el paquete trae los suyos, pero así el resto compila sin cargarlo).
interface MlMarker {
  getElement(): HTMLElement;
  setLngLat(ll: [number, number]): MlMarker;
  addTo(map: MlMap): MlMarker;
  remove(): void;
}
interface MlMap {
  on(event: string, fn: (e?: unknown) => void): void;
  remove(): void;
  addControl(control: unknown, position?: string): void;
  easeTo(opts: { center: [number, number]; zoom?: number; duration?: number }): void;
  getZoom(): number;
  fitBounds(bounds: [[number, number], [number, number]], opts: { padding: number; maxZoom: number; duration: number }): void;
  touchZoomRotate: { disableRotation(): void };
}
interface MlLib {
  Map: new (opts: Record<string, unknown>) => MlMap;
  Marker: new (opts: { element: HTMLElement; anchor?: string }) => MlMarker;
  AttributionControl: new (opts: { compact: boolean }) => unknown;
  NavigationControl: new (opts: { showCompass: boolean }) => unknown;
}

let libPromise: Promise<MlLib> | null = null;
function loadMapLibre(): Promise<MlLib> {
  if (!libPromise) {
    if (!document.querySelector('link[data-maplibre]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'vendor/maplibre-gl.css';
      link.dataset.maplibre = '';
      document.head.appendChild(link);
    }
    libPromise = import('maplibre-gl').then((m) => ((m as { default?: unknown }).default ?? m) as unknown as MlLib);
    libPromise.catch(() => {
      libPromise = null;
    });
  }
  return libPromise;
}

function pinElement(p: MapPoint, selected: boolean, onSelect: (id: string) => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `map-pin${p.hot ? ' hot' : ''}${selected ? ' on' : ''}`;
  el.textContent = p.label;
  el.setAttribute('aria-label', p.title);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect(p.id);
  });
  return el;
}

function meElement(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'map-me';
  el.setAttribute('aria-label', 'Tu ubicación');
  return el;
}

export function MapView({ points, center, user, selectedId, onSelect, recenter }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const lib = useRef<MlLib | null>(null);
  const markers = useRef<MlMarker[]>([]);
  const [mode, setMode] = useState<'loading' | 'live' | 'offline'>('loading');
  const select = useRef(onSelect);
  select.current = onSelect;
  // Firma de los puntos: los pines solo se redibujan si cambia algo visible, no en cada render.
  const sig = points.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.hot ? 1 : 0}`).join('|');
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const userRef = useRef(user);
  userRef.current = user;

  // Crear el mapa una sola vez.
  useEffect(() => {
    let done = false;
    let cancelled = false;
    const goOffline = () => {
      if (done || cancelled) return;
      done = true;
      map.current?.remove();
      map.current = null;
      setMode('offline');
    };
    const timer = window.setTimeout(goOffline, LOAD_TIMEOUT_MS);
    loadMapLibre()
      .then((ml) => {
        if (cancelled || !box.current) return;
        lib.current = ml;
        const m = new ml.Map({
          container: box.current,
          style: STYLE_URL,
          center: [center.lng, center.lat],
          zoom: 13.4,
          minZoom: 10,
          maxZoom: 18,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        m.touchZoomRotate.disableRotation();
        m.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'bottom-right');
        m.on('load', () => {
          if (done || cancelled) return;
          done = true;
          window.clearTimeout(timer);
          // Encuadra todos los restaurantes (y a la persona, si compartió su ubicación).
          const all = [...pointsRef.current, ...(userRef.current ? [userRef.current] : [])];
          if (all.length > 1) {
            const lngs = all.map((p) => p.lng);
            const lats = all.map((p) => p.lat);
            m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 56, maxZoom: 15, duration: 0 });
          }
          setMode('live');
        });
        m.on('error', () => {
          if (!done) goOffline();
        });
        map.current = m;
      })
      .catch(goOffline);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      markers.current.forEach((x) => x.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pines y ubicación.
  useEffect(() => {
    if (mode !== 'live' || !map.current || !lib.current) return;
    const ml = lib.current;
    const m = map.current;
    markers.current.forEach((x) => x.remove());
    markers.current = pointsRef.current.map((p) => {
      const marker = new ml.Marker({ element: pinElement(p, p.id === selectedId, (id) => select.current(id)), anchor: 'bottom' });
      marker.setLngLat([p.lng, p.lat]).addTo(m);
      marker.getElement().setAttribute('aria-label', p.title); // addTo pone «Map marker»; va después
      return marker;
    });
    const me = user;
    if (me) {
      const marker = new ml.Marker({ element: meElement() }).setLngLat([me.lng, me.lat]).addTo(m);
      marker.getElement().setAttribute('aria-label', 'Tu ubicación');
      markers.current.push(marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sig, selectedId, user?.lat, user?.lng]);

  // Centrar al tocar «Cerca de mí» o al elegir un restaurante.
  const firstRecenter = useRef(recenter);
  useEffect(() => {
    if (recenter === firstRecenter.current) return;
    if (mode === 'live' && map.current) map.current.easeTo({ center: [center.lng, center.lat], zoom: Math.max(14, map.current.getZoom()), duration: 600 });
  }, [mode, recenter, center.lat, center.lng]);
  const firstSelected = useRef(selectedId);
  useEffect(() => {
    if (selectedId === firstSelected.current) return; // al abrir, manda el encuadre inicial
    firstSelected.current = null;
    const p = pointsRef.current.find((x) => x.id === selectedId);
    if (mode === 'live' && map.current && p) map.current.easeTo({ center: [p.lng, p.lat], duration: 500 });
  }, [mode, selectedId]);

  return (
    <div className="map-box" aria-label="Mapa de restaurantes">
      <div ref={box} className="map-canvas" style={mode === 'offline' ? { display: 'none' } : undefined} />
      {mode === 'loading' && <div className="map-loading small muted">Cargando mapa…</div>}
      {mode === 'offline' && <OfflinePlan points={points} center={center} user={user} selectedId={selectedId} onSelect={onSelect} />}
    </div>
  );
}

/** Plano simple sin mapa de fondo: los puntos en su posición relativa real. */
function OfflinePlan({ points, center, user, selectedId, onSelect }: Omit<Props, 'recenter'>) {
  const all = useMemo(() => [...points, ...(user ? [{ ...user }] : []), center], [points, user, center]);
  const lat = all.map((p) => p.lat);
  const lng = all.map((p) => p.lng);
  const pad = 0.004;
  const minLat = Math.min(...lat) - pad;
  const maxLat = Math.max(...lat) + pad;
  const minLng = Math.min(...lng) - pad;
  const maxLng = Math.max(...lng) + pad;
  const pos = (p: LatLng) => ({
    left: `${8 + ((p.lng - minLng) / (maxLng - minLng || 1)) * 84}%`,
    top: `${10 + ((maxLat - p.lat) / (maxLat - minLat || 1)) * 80}%`,
  });
  return (
    <div className="map-offline">
      {points.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`map-pin${p.hot ? ' hot' : ''}${p.id === selectedId ? ' on' : ''}`}
          style={{ position: 'absolute', transform: 'translate(-50%, -100%)', ...pos(p) }}
          aria-label={p.title}
          onClick={() => onSelect(p.id)}
        >
          {p.label}
        </button>
      ))}
      {user && <span className="map-me" style={{ position: 'absolute', transform: 'translate(-50%, -50%)', ...pos(user) }} aria-label="Tu ubicación" />}
      <span className="map-note tiny">Vista sin mapa de fondo · se ve completo con conexión</span>
    </div>
  );
}
