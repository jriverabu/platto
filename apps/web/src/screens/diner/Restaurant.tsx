import { useMemo, useState } from 'react';
import { formatClock12, formatCop, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { featured, now, ratingOf, reportReview, slotsFor, useDemo } from '../../data/store';
import type { DishRow } from '../../data/model';
import { useNav } from '../../nav';
import { DishVideo } from '../../components/Video';
import { Icon, Sheet, Stars, attempt } from '../../components/ui';

export function RestaurantScreen({ id }: { id: string }) {
  const s = useDemo();
  const nav = useNav();
  const restaurant = s.restaurants.find((r) => r.id === id);
  const categories = useMemo(() => s.categories.filter((c) => c.restaurantId === id).sort((a, b) => a.position - b.position), [s, id]);
  const [cat, setCat] = useState<string | null>(null);
  const [openDish, setOpenDish] = useState<DishRow | null>(null);
  if (!restaurant) return null;

  const activeCat = cat ?? categories.find((c) => s.dishes.some((d) => d.categoryId === c.id && d.video))?.id ?? categories[0]?.id;
  const dishes = s.dishes.filter((d) => d.categoryId === activeCat).sort((a, b) => a.position - b.position);
  const cover = s.dishes.find((d) => d.id === restaurant.coverDishId)?.video ?? s.dishes.find((d) => d.restaurantId === id && d.video)?.video;
  const rating = ratingOf(s, id);
  const reviews = s.reviews.filter((r) => r.restaurantId === id && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const today = localParts(new Date(now()), restaurant.timezone).date;
  const next = slotsFor(s, id, today, 2).find((x) => x.available);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="hero">
        {cover && <DishVideo video={cover} active className="" label={`Video de portada de ${restaurant.name}`} />}
        <div className="hero-bar">
          <button className="icon-btn glass" onClick={nav.back} aria-label="Volver"><Icon name="back" /></button>
          <span className="mono" style={{ alignSelf: 'center', fontSize: 11, letterSpacing: 1, padding: '6px 10px', borderRadius: 999, background: 'rgba(19,17,15,.7)' }}>VIDEO DE PORTADA · 10 S</span>
        </div>
      </div>

      <div className="stack gap-16" style={{ padding: '20px 16px 24px', flex: 1 }}>
        <div className="stack gap-6">
          <div className="row gap-8">
            <h1 className="display h1 grow" style={{ fontSize: 50 }}>{restaurant.name}</h1>
            {featured(s, id) && <span className="badge badge-brasa">PRO</span>}
          </div>
          <span className="muted">{restaurant.cuisine} · {restaurant.zone} · {formatPriceLevel(restaurant.priceLevel)}</span>
          <span className="small muted">{restaurant.description}</span>
        </div>

        <div className="row gap-10" style={{ alignItems: 'stretch' }}>
          <div className="card row gap-12 grow" style={{ padding: '12px 14px' }}>
            <span className="display" style={{ fontSize: 40, color: 'var(--brasa)' }}>{rating.average !== null ? formatRating(rating.average) : 'Nuevo'}</span>
            <span className="stack gap-4">
              <span className="bold small">{rating.count} reseñas</span>
              <span className="tiny muted">solo de quien reservó</span>
            </span>
          </div>
          <div className="card stack gap-4" style={{ padding: '12px 14px', width: 124, justifyContent: 'center' }}>
            <span className="bold small" style={{ color: next ? 'var(--hoja)' : 'var(--humo)' }}>{next ? 'Mesas hoy' : 'Hoy lleno'}</span>
            <span className="tiny muted">{next ? `desde ${formatClock12(next.clock)}` : 'mira otros días'}</span>
          </div>
        </div>

        <div className="tabs-line" role="tablist" aria-label="Categorías del menú">
          {categories.map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === activeCat} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>

        <div className="list">
          {dishes.map((d) => (
            <button key={d.id} className="dish-row" onClick={() => d.video && setOpenDish(d)} disabled={!d.video && !d.isAvailable}>
              <span className="dish-thumb">
                {d.video?.poster ? <img src={d.video.poster} alt="" /> : <span className="stack center" style={{ height: '100%', color: 'var(--humo)' }}><Icon name="play" /></span>}
                {d.video && <span className="video-time">▶ 0:{String(Math.round(d.video.duration)).padStart(2, '0')}</span>}
              </span>
              <span className="stack gap-6 grow" style={{ minWidth: 0 }}>
                <span className="bold" style={{ fontSize: 17, lineHeight: 1.2 }}>{d.name}</span>
                <span className="small muted clamp-2" style={{ lineHeight: 1.4 }}>{d.description}</span>
                <span className="row between" style={{ marginTop: 'auto' }}>
                  <span className="price">{formatCop(d.priceCop)}</span>
                  {!d.isAvailable ? <span className="badge badge-dark">AGOTADO HOY</span> : d.tags[0] ? <span className="badge badge-dark">{d.tags[0]}</span> : null}
                </span>
              </span>
            </button>
          ))}
          {dishes.length === 0 && <span className="muted small" style={{ padding: '16px 0' }}>Esta categoría aún no tiene platos.</span>}
        </div>

        <div className="stack gap-12">
          <div className="row between">
            <h2 className="display h3">Reseñas</h2>
            <span className="small muted">{rating.count} verificadas</span>
          </div>
          {reviews.slice(0, 6).map((r) => (
            <div key={r.id} className="paper stack gap-10" style={{ padding: 16 }}>
              <div className="row between gap-8">
                <span className="row gap-10">
                  <span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--carbon)', color: 'var(--hueso)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                    {r.authorName.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                  </span>
                  <span className="stack">
                    <span className="bold small">{r.authorName}</span>
                    <Stars value={r.rating} />
                  </span>
                </span>
                <span className="stamp">VERIFICADA</span>
              </div>
              {r.comment && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{r.comment}</p>}
              {r.tags.length > 0 && <span className="row gap-6 wrap">{r.tags.map((t) => <span key={t} className="badge badge-neutral">{t}</span>)}</span>}
              {r.reply && (
                <div style={{ background: 'var(--hueso-3)', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.4 }}>
                  <b>Respuesta de {restaurant.name}:</b> {r.reply}
                </div>
              )}
              {!r.reported && (
                <button className="btn-link tiny" style={{ alignSelf: 'flex-start', color: 'var(--tinta)', minHeight: 32 }} onClick={() => attempt(() => reportReview(r.id), 'Gracias. La revisaremos.')}>
                  Reportar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sticky-cta">
        <span className="stack grow">
          <span className="tiny muted">{restaurant.reservationsEnabled ? 'Confirmación en máximo 2 horas' : 'No recibe reservas por ahora'}</span>
          <span className="mono">{restaurant.address}</span>
        </span>
        <button className="btn btn-primary" disabled={!restaurant.reservationsEnabled} onClick={() => nav.push({ name: 'reserve', restaurantId: id })}>Reservar mesa</button>
      </div>

      {openDish && openDish.video && (
        <Sheet onClose={() => setOpenDish(null)} label={openDish.name} night>
          <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '9 / 16', maxHeight: '52vh', alignSelf: 'center', background: '#000' }}>
            <DishVideo video={openDish.video} active className="" label={`Video de ${openDish.name}`} />
          </div>
          <div className="stack gap-6">
            <span className="display h2">{openDish.name}</span>
            <span className="price" style={{ fontSize: 18 }}>{formatCop(openDish.priceCop)}</span>
            <span className="small muted" style={{ lineHeight: 1.45 }}>{openDish.description}</span>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => { setOpenDish(null); nav.push({ name: 'reserve', restaurantId: id }); }}>Reservar para probarlo</button>
        </Sheet>
      )}
    </div>
  );
}
