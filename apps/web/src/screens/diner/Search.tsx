import { useMemo, useState } from 'react';
import { formatClock12, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { TZ, featured, isRestaurantListed, now, ratingOf, slotsFor, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Empty, Icon } from '../../components/ui';

const CUISINE_ICON: Record<string, string> = { Parrilla: 'flame', Típica: 'bowl', Colombiana: 'bowl', Mariscos: 'fish', Vegetariana: 'leaf' };

export function Search() {
  const s = useDemo();
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const listed = s.restaurants.filter((r) => isRestaurantListed(s, r.id));
  const zones = [...new Set(listed.map((r) => r.zone))].sort();
  const cuisines = [...new Set(listed.map((r) => r.cuisine))].sort();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listed
      .filter((r) => !zone || r.zone === zone)
      .filter((r) => !cuisine || r.cuisine === cuisine)
      .filter((r) => !maxPrice || r.priceLevel <= maxPrice)
      .filter((r) => {
        if (!q) return true;
        const dishes = s.dishes.filter((d) => d.restaurantId === r.id).map((d) => d.name.toLowerCase());
        return r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || dishes.some((d) => d.includes(q));
      })
      .sort((a, b) => Number(featured(s, b.id)) - Number(featured(s, a.id)) || (ratingOf(s, b.id).average ?? 0) - (ratingOf(s, a.id).average ?? 0));
  }, [s, query, zone, cuisine, maxPrice, listed]);

  const today = localParts(new Date(now()), TZ).date;

  return (
    <div className="screen">
      <div className="header" style={{ alignItems: 'flex-start' }}>
        <div className="stack gap-4 grow">
          <h1>Explorar</h1>
          <span className="small muted">¿Qué se te antoja hoy?</span>
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
            <button className="chip" aria-pressed={zone === null} onClick={() => setZone(null)}>Toda Cúcuta</button>
            {zones.map((z) => (
              <button key={z} className="chip" aria-pressed={zone === z} onClick={() => setZone(zone === z ? null : z)}>
                <Icon name="pin" size={15} /> {z}
              </button>
            ))}
          </div>
          <div className="chips">
            {[2, 3].map((p) => (
              <button key={p} className="chip mono" aria-pressed={maxPrice === p} onClick={() => setMaxPrice(maxPrice === p ? null : p)}>
                Hasta {formatPriceLevel(p)}
              </button>
            ))}
          </div>
        </div>

        {results.length === 0 && <Empty title="Sin resultados" body="Prueba con otra zona o quita algún filtro." />}

        <div className="stack gap-12">
          {results.map((r) => {
            const cover = s.dishes.find((d) => d.id === r.coverDishId)?.video;
            const rating = ratingOf(s, r.id);
            const next = slotsFor(s, r.id, today, 2).find((x) => x.available);
            const dishCount = s.dishes.filter((d) => d.restaurantId === r.id && d.video).length;
            return (
              <button key={r.id} className="card row gap-12" style={{ textAlign: 'left', color: 'inherit', padding: 10 }} onClick={() => nav.push({ name: 'restaurant', id: r.id })}>
                <span style={{ position: 'relative', width: 96, height: 96, borderRadius: 14, overflow: 'hidden', flex: 'none', background: '#000' }}>
                  {cover?.poster && <img src={cover.poster} alt="" width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span className="play-badge" aria-hidden="true" style={{ width: 28, height: 28, margin: '-14px 0 0 -14px' }}><svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg></span>
                </span>
                <span className="stack gap-4 grow">
                  <span className="row gap-6" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <span className="row gap-4" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{r.name}<span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="verified" size={15} /></span></span>
                    <span className="row gap-4 small" style={{ fontWeight: 600, flex: 'none' }}>
                      <span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="starFill" size={14} /></span>
                      {rating.average !== null ? formatRating(rating.average) : 'Nuevo'}
                    </span>
                  </span>
                  <span className="small muted">{r.cuisine} · {r.zone} · {formatPriceLevel(r.priceLevel)}</span>
                  <span className="tiny muted">{dishCount} {dishCount === 1 ? 'plato' : 'platos'} en video · {rating.count} reseñas verificadas</span>
                  <span className="row gap-6 wrap" style={{ marginTop: 2 }}>
                    {next ? <span className="badge badge-ok">Mesas hoy desde {formatClock12(next.clock)}</span> : <span className="badge badge-neutral">Sin mesas hoy</span>}
                    {featured(s, r.id) && <span className="badge badge-brasa">Destacado</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
