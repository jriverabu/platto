import { useMemo, useState } from 'react';
import { CITY, distanceKm, formatClock12, formatDistance, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { TZ, featured, isRestaurantListed, livePromotions, now, ratingOf, slotsFor, useDemo } from '../../data/store';
import type { DemoState } from '../../data/model';
import { requestLocation, useLocation } from '../../data/location';
import { useNav } from '../../nav';
import { Empty, Icon, toast } from '../../components/ui';
import { MapView } from '../../components/MapView';
import { initials } from './Feed';

const CUISINE_ICON: Record<string, string> = { Parrilla: 'flame', Típica: 'bowl', Colombiana: 'bowl', Mariscos: 'fish', Vegetariana: 'leaf' };

type Restaurant = DemoState['restaurants'][number];

export function Search() {
  const s = useDemo();
  const nav = useNav();
  const loc = useLocation();
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [promoOnly, setPromoOnly] = useState(false);
  const [near, setNear] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);

  const listed = useMemo(() => s.restaurants.filter((r) => isRestaurantListed(s, r.id)), [s]);
  const zones = useMemo(() => [...new Set(listed.map((r) => r.zone))].sort(), [listed]);
  const cuisines = useMemo(() => [...new Set(listed.map((r) => r.cuisine))].sort(), [listed]);
  const distance = (r: Restaurant) => distanceKm(loc.point, r);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listed
      .filter((r) => !zone || r.zone === zone)
      .filter((r) => !cuisine || r.cuisine === cuisine)
      .filter((r) => !maxPrice || r.priceLevel <= maxPrice)
      .filter((r) => !promoOnly || livePromotions(s, r.id).length > 0)
      .filter((r) => {
        if (!q) return true;
        const dishes = s.dishes.filter((d) => d.restaurantId === r.id).map((d) => d.name.toLowerCase());
        return r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || dishes.some((d) => d.includes(q));
      })
      .sort((a, b) =>
        near
          ? distance(a) - distance(b)
          : Number(featured(s, b.id)) - Number(featured(s, a.id)) || (ratingOf(s, b.id).average ?? 0) - (ratingOf(s, a.id).average ?? 0),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, query, zone, cuisine, maxPrice, promoOnly, near, loc.point, listed]);

  const nearMe = async () => {
    setNear(true);
    setRecenter((n) => n + 1);
    const status = await requestLocation();
    if (status === 'denied') toast('Sin permiso de ubicación: medimos desde el centro de Cúcuta.');
    else if (status === 'unavailable') toast('No pudimos ubicarte: medimos desde el centro de Cúcuta.');
    setRecenter((n) => n + 1);
  };

  const points = useMemo(
    () => results.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, label: initials(r.name), title: r.name, hot: livePromotions(s, r.id).length > 0 })),
    [results, s],
  );

  // En el mapa siempre hay un restaurante elegido: el que tocaste o el primero de la lista.
  const current = results.find((r) => r.id === selected) ?? results[0] ?? null;
  const showDistance = near || view === 'map';

  return (
    <div className="screen">
      <div className="header" style={{ alignItems: 'flex-start' }}>
        <div className="stack gap-4 grow">
          <h1>Explorar</h1>
          <span className="small muted">¿Qué se te antoja hoy?</span>
        </div>
        <div className="seg" role="group" aria-label="Ver como">
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={17} />Lista</button>
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}><Icon name="map" size={17} />Mapa</button>
        </div>
      </div>
      <div className="stack gap-16" style={{ padding: '4px 16px 28px' }}>
        <div className="search">
          <Icon name="search" size={20} />
          <input className="input" type="search" placeholder="Buscar platos, restaurantes…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
        </div>
        <div className="cats" role="group" aria-label="Tipo de cocina">
          <button className="cat" aria-pressed={cuisine === null} onClick={() => setCuisine(null)}><Icon name="grid" size={22} />Todos</button>
          {cuisines.map((c) => (
            <button key={c} className="cat" aria-pressed={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>
              <Icon name={CUISINE_ICON[c] ?? 'bowl'} size={22} />{c}
            </button>
          ))}
        </div>
        <div className="stack gap-10">
          <div className="chips">
            <button className="chip" aria-pressed={near} onClick={() => (near ? setNear(false) : nearMe())}>
              <Icon name="locate" size={15} /> Cerca de mí
            </button>
            <button className="chip" aria-pressed={zone === null} onClick={() => setZone(null)}>Toda Cúcuta</button>
            {zones.map((z) => (
              <button key={z} className="chip" aria-pressed={zone === z} onClick={() => setZone(zone === z ? null : z)}>
                <Icon name="pin" size={15} /> {z}
              </button>
            ))}
          </div>
          <div className="chips">
            <button className="chip" aria-pressed={promoOnly} onClick={() => setPromoOnly(!promoOnly)}>
              <Icon name="tag" size={15} /> Con promoción
            </button>
            {[2, 3].map((p) => (
              <button key={p} className="chip mono" aria-pressed={maxPrice === p} onClick={() => setMaxPrice(maxPrice === p ? null : p)}>
                Hasta {formatPriceLevel(p)}
              </button>
            ))}
          </div>
          {showDistance && (
            <span className="tiny muted" role="status">
              {loc.status === 'asking' ? 'Buscando tu ubicación…' : loc.fromUser ? 'Distancias desde donde estás.' : `Distancias desde el centro de ${CITY.name}.`}
            </span>
          )}
        </div>

        {results.length === 0 && <Empty title="Sin resultados" body="Prueba con otra zona o quita algún filtro." />}

        {view === 'map' && results.length > 0 && (
          <div className="stack gap-12">
            <div style={{ position: 'relative' }}>
              <MapView
                points={points}
                center={loc.point}
                user={loc.fromUser ? loc.point : null}
                selectedId={current?.id ?? null}
                onSelect={setSelected}
                recenter={recenter}
              />
              <button className="icon-btn map-locate" aria-label="Centrar en mi ubicación" onClick={nearMe}><Icon name="locate" size={20} /></button>
            </div>
            {current && <ResultCard s={s} r={current} km={distance(current)} onOpen={() => nav.push({ name: 'restaurant', id: current.id })} />}
          </div>
        )}

        {view === 'list' && (
          <div className="stack gap-12">
            {results.map((r) => (
              <ResultCard key={r.id} s={s} r={r} km={showDistance ? distance(r) : null} onOpen={() => nav.push({ name: 'restaurant', id: r.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ s, r, km, onOpen }: { s: DemoState; r: Restaurant; km: number | null; onOpen: () => void }) {
  const today = localParts(new Date(now()), TZ).date;
  const cover = s.dishes.find((d) => d.id === r.coverDishId)?.video;
  const rating = ratingOf(s, r.id);
  const next = slotsFor(s, r.id, today, 2).find((x) => x.available);
  const dishCount = s.dishes.filter((d) => d.restaurantId === r.id && d.video).length;
  const promo = livePromotions(s, r.id)[0];
  return (
    <button className="card row gap-12" style={{ textAlign: 'left', color: 'inherit', padding: 10 }} onClick={onOpen}>
      <span style={{ position: 'relative', width: 96, height: 96, borderRadius: 14, overflow: 'hidden', flex: 'none', background: '#000' }}>
        {cover?.poster && <img src={cover.poster} alt="" width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <span className="play-badge" aria-hidden="true" style={{ width: 28, height: 28, margin: '-14px 0 0 -14px' }}><svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg></span>
      </span>
      <span className="stack gap-4 grow" style={{ minWidth: 0 }}>
        <span className="row gap-6" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <span className="row gap-4" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{r.name}<span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="verified" size={15} /></span></span>
          <span className="row gap-4 small" style={{ fontWeight: 600, flex: 'none' }}>
            <span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="starFill" size={14} /></span>
            {rating.average !== null ? formatRating(rating.average) : 'Nuevo'}
          </span>
        </span>
        <span className="small muted">{r.cuisine} · {r.zone}{km !== null ? ` · a ${formatDistance(km)}` : ''} · {formatPriceLevel(r.priceLevel)}</span>
        <span className="tiny muted">{dishCount} {dishCount === 1 ? 'plato' : 'platos'} en video · {rating.count} reseñas verificadas</span>
        <span className="row gap-6 wrap" style={{ marginTop: 2 }}>
          {promo && <span className="badge badge-brasa" style={{ maxWidth: '100%' }}><Icon name="tag" size={12} stroke={2.4} /><span className="ellipsis">{promo.title}</span></span>}
          {next ? <span className="badge badge-ok">Mesas hoy desde {formatClock12(next.clock)}</span> : <span className="badge badge-neutral">Sin mesas hoy</span>}
          {featured(s, r.id) && !promo && <span className="badge badge-brasa">Destacado</span>}
        </span>
      </span>
    </button>
  );
}
