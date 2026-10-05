import { useMemo, useState } from 'react';
import { formatClock12, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { featured, isRestaurantListed, now, ratingOf, slotsFor, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Empty, Header, Icon } from '../../components/ui';

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

  const today = localParts(new Date(now()), 'America/Bogota').date;

  return (
    <div className="screen">
      <Header title="Buscar" />
      <div className="stack gap-16" style={{ padding: '0 16px 28px' }}>
        <div className="search">
          <Icon name="search" size={20} />
          <input className="input" type="search" placeholder="Restaurante, cocina o plato" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
        </div>
        <div className="stack gap-10">
          <div className="chips">
            <button className="chip" aria-pressed={zone === null} onClick={() => setZone(null)}>Toda Bogotá</button>
            {zones.map((z) => (
              <button key={z} className="chip" aria-pressed={zone === z} onClick={() => setZone(zone === z ? null : z)}>
                <Icon name="pin" size={15} /> {z}
              </button>
            ))}
          </div>
          <div className="chips">
            {cuisines.map((c) => (
              <button key={c} className="chip" aria-pressed={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>{c}</button>
            ))}
            {[2, 3].map((p) => (
              <button key={p} className="chip mono" aria-pressed={maxPrice === p} onClick={() => setMaxPrice(maxPrice === p ? null : p)}>
                hasta {formatPriceLevel(p)}
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
              <button key={r.id} className="card row gap-12" style={{ border: 0, textAlign: 'left', color: 'inherit', padding: 10 }} onClick={() => nav.push({ name: 'restaurant', id: r.id })}>
                <span style={{ width: 92, height: 120, borderRadius: 12, overflow: 'hidden', flex: 'none', background: '#000' }}>
                  {cover?.poster && <img src={cover.poster} alt="" width={92} height={120} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </span>
                <span className="stack gap-6 grow">
                  <span className="row gap-6" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <span className="display h3" style={{ fontSize: 26 }}>{r.name}</span>
                    {featured(s, r.id) && <span className="badge badge-brasa">PRO</span>}
                  </span>
                  <span className="small muted">{r.cuisine} · {r.zone} · {formatPriceLevel(r.priceLevel)}</span>
                  <span className="row gap-6 small">
                    <span style={{ color: 'var(--brasa-carbon)', display: 'flex' }}><Icon name="starFill" size={14} /></span>
                    {rating.average !== null ? <b>{formatRating(rating.average)}</b> : <b>Nuevo</b>}
                    <span className="muted">· {rating.count} reseñas verificadas</span>
                  </span>
                  <span className="row gap-6 small wrap">
                    <span className="badge badge-dark">{dishCount} {dishCount === 1 ? 'plato' : 'platos'} en video</span>
                    {next ? <span className="small" style={{ color: 'var(--hoja)' }}>Mesas hoy desde {formatClock12(next.clock)}</span> : <span className="small muted">Sin mesas hoy</span>}
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
