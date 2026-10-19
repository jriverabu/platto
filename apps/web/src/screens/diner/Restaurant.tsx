import { useMemo, useState } from 'react';
import { formatClock12, formatCop, formatPriceLevel, formatRating, localParts } from '@platto/core';
import { featured, livePromotions, now, ratingOf, reportReview, slotsFor, useDemo } from '../../data/store';
import type { DishRow } from '../../data/model';
import { useNav } from '../../nav';
import { DishVideo } from '../../components/Video';
import { Icon, Sheet, Stars, attempt } from '../../components/ui';
import { initials } from './Feed';
import { PromoCard } from '../../components/Promo';

type Tab = 'menu' | 'reviews' | 'info';
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function RestaurantScreen({ id }: { id: string }) {
  const s = useDemo();
  const nav = useNav();
  const restaurant = s.restaurants.find((r) => r.id === id);
  const categories = useMemo(() => s.categories.filter((c) => c.restaurantId === id).sort((a, b) => a.position - b.position), [s, id]);
  const [tab, setTab] = useState<Tab>('menu');
  const [cat, setCat] = useState<string | null>(null);
  const [openDish, setOpenDish] = useState<DishRow | null>(null);
  if (!restaurant) return null;

  const dishes = s.dishes
    .filter((d) => d.restaurantId === id && (!cat || d.categoryId === cat))
    .sort((a, b) => {
      const ca = categories.findIndex((c) => c.id === a.categoryId);
      const cb = categories.findIndex((c) => c.id === b.categoryId);
      return ca - cb || a.position - b.position;
    });
  const cover = s.dishes.find((d) => d.id === restaurant.coverDishId)?.video ?? s.dishes.find((d) => d.restaurantId === id && d.video)?.video;
  const rating = ratingOf(s, id);
  const reviews = s.reviews.filter((r) => r.restaurantId === id && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const today = localParts(new Date(now()), restaurant.timezone).date;
  const next = slotsFor(s, id, today, 2).find((x) => x.available);
  const rules = s.rules.filter((r) => r.restaurantId === id);
  const promos = livePromotions(s, id);

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="hero">
        {cover && <DishVideo video={cover} active className="" label={`Video de portada de ${restaurant.name}`} />}
        <div className="hero-bar">
          <button className="icon-btn glass" onClick={nav.back} aria-label="Volver"><Icon name="back" /></button>
          <span style={{ alignSelf: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: '6px 10px', borderRadius: 999, background: 'rgba(14,14,16,.6)' }}>PORTADA · 10 S</span>
        </div>
      </div>

      <div className="stack gap-16" style={{ padding: '0 16px 24px', flex: 1, marginTop: -54, position: 'relative', zIndex: 2 }}>
        <div className="row gap-12" style={{ alignItems: 'flex-end' }}>
          <span className="brand-avatar" aria-hidden="true">{initials(restaurant.name)}</span>
          {featured(s, id) && <span className="badge badge-brasa" style={{ marginBottom: 8 }}>Destacado</span>}
        </div>

        <div className="stack gap-6">
          <div className="row gap-8">
            <h1 className="display h1">{restaurant.name}</h1>
            <span style={{ color: 'var(--brand)', display: 'flex' }} title="Restaurante verificado por Platto"><Icon name="verified" size={22} /></span>
          </div>
          <span className="small" style={{ color: 'var(--text-2)' }}>{restaurant.cuisine} · {formatPriceLevel(restaurant.priceLevel)}</span>
          <span className="row gap-10 small wrap" style={{ color: 'var(--text-2)' }}>
            <span className="row gap-4"><span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="starFill" size={15} /></span>
              <b style={{ color: 'var(--text)' }}>{rating.average !== null ? formatRating(rating.average) : 'Nuevo'}</b> ({rating.count})</span>
            <span className="row gap-4"><Icon name="clock" size={15} />{next ? `Mesas hoy desde ${formatClock12(next.clock)}` : 'Hoy sin mesas'}</span>
          </span>
          <span className="row gap-4 small" style={{ color: 'var(--text-2)' }}><Icon name="pin" size={15} />{restaurant.zone}, Cúcuta</span>
        </div>

        <button className="btn btn-primary btn-block" disabled={!restaurant.reservationsEnabled} onClick={() => nav.push({ name: 'reserve', restaurantId: id })}>
          <Icon name="calendar" size={18} /> {restaurant.reservationsEnabled ? 'Reservar mesa' : 'No recibe reservas por ahora'}
        </button>

        {promos.length > 0 && (
          <div className="stack gap-8" aria-label="Promociones de hoy">
            {promos.map((p) => <PromoCard key={p.id} p={p} timeZone={restaurant.timezone} />)}
          </div>
        )}

        <div className="tabs-line" role="tablist" aria-label="Secciones del restaurante">
          {([['menu', 'Menú en video'], ['reviews', 'Opiniones'], ['info', 'Información']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'menu' && (
          <div className="stack gap-12">
            {categories.length > 1 && (
              <div className="chips">
                <button className="chip" aria-pressed={cat === null} onClick={() => setCat(null)}>Todo</button>
                {categories.map((c) => (
                  <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>
                ))}
              </div>
            )}
            <div className="list">
              {dishes.map((d) => (
                <button key={d.id} className="dish-row" onClick={() => d.video && setOpenDish(d)} disabled={!d.video && !d.isAvailable}>
                  <span className="dish-thumb">
                    {d.video?.poster ? <img src={d.video.poster} alt="" /> : <span className="stack center" style={{ height: '100%', color: 'var(--text-3)' }}><Icon name="play" /></span>}
                    {d.video && <span className="play-badge" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg></span>}
                    {d.video && <span className="video-time">0:{String(Math.round(d.video.duration)).padStart(2, '0')}</span>}
                  </span>
                  <span className="stack gap-4 grow" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{d.name}</span>
                    <span className="small clamp-2" style={{ color: 'var(--text-3)', lineHeight: 1.45 }}>{d.description}</span>
                    <span className="row between" style={{ marginTop: 2 }}>
                      <span className="price" style={{ fontSize: 15 }}>{formatCop(d.priceCop)}</span>
                      {!d.isAvailable ? <span className="badge badge-neutral">Agotado hoy</span> : d.tags[0] ? <span className="badge badge-neutral">{d.tags[0]}</span> : null}
                    </span>
                  </span>
                </button>
              ))}
              {dishes.length === 0 && <span className="muted small" style={{ padding: '16px 0' }}>Esta categoría aún no tiene platos.</span>}
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="stack gap-12">
            <span className="small muted">Solo opinan personas que reservaron y fueron.</span>
            {reviews.length === 0 && <span className="small muted">Todavía no hay opiniones.</span>}
            {reviews.map((r) => (
              <div key={r.id} className="card stack gap-10">
                <div className="row between gap-8">
                  <span className="row gap-10">
                    <span className="avatar" style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface-3)', color: 'var(--text)' }}>
                      {r.authorName.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                    </span>
                    <span className="stack gap-4">
                      <span className="bold small">{r.authorName}</span>
                      <Stars value={r.rating} color="var(--brand)" />
                    </span>
                  </span>
                  <span className="stamp"><Icon name="check" size={11} stroke={3} />Verificada</span>
                </div>
                {r.comment && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--text-2)' }}>{r.comment}</p>}
                {r.tags.length > 0 && <span className="row gap-6 wrap">{r.tags.map((t) => <span key={t} className="badge badge-neutral">{t}</span>)}</span>}
                {r.reply && (
                  <div className="note" style={{ fontSize: 13 }}>
                    <b style={{ color: 'var(--text)' }}>Respuesta de {restaurant.name}:</b> {r.reply}
                  </div>
                )}
                {!r.reported && (
                  <button className="btn-link tiny" style={{ alignSelf: 'flex-start', color: 'var(--text-3)', minHeight: 32, padding: 0 }} onClick={() => attempt(() => reportReview(r.id), 'Gracias. La revisaremos.')}>
                    Reportar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'info' && (
          <div className="stack gap-12">
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>{restaurant.description}</p>
            <div className="card list" style={{ padding: '0 14px' }}>
              <div className="row gap-12" style={{ padding: '14px 0' }}>
                <Icon name="pin" /><span className="stack gap-4"><span className="bold small">{restaurant.address}</span><span className="tiny muted">{restaurant.zone}, Cúcuta</span></span>
              </div>
              <div className="row gap-12" style={{ padding: '14px 0', alignItems: 'flex-start' }}>
                <Icon name="clock" />
                <span className="stack gap-6 grow">
                  <span className="bold small">Horario de reservas</span>
                  {[1, 2, 3, 4, 5, 6, 0].map((w) => {
                    const day = rules.filter((r) => r.weekday === w).sort((a, b) => a.startTime.localeCompare(b.startTime));
                    return (
                      <span key={w} className="row between tiny">
                        <span className="muted">{WEEKDAYS[w]}</span>
                        <span style={{ color: 'var(--text-2)' }}>{day.length ? day.map((r) => `${formatClock12(r.startTime)} – ${formatClock12(r.endTime)}`).join(' · ') : 'Cerrado'}</span>
                      </span>
                    );
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {openDish && openDish.video && (
        <Sheet onClose={() => setOpenDish(null)} label={openDish.name} night>
          <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '9 / 16', maxHeight: '52vh', alignSelf: 'center', background: '#000' }}>
            <DishVideo video={openDish.video} active className="fill" label={`Video de ${openDish.name}`} />
          </div>
          <div className="stack gap-6">
            <span className="display h2">{openDish.name}</span>
            <span className="small" style={{ color: 'var(--text-2)' }}>{restaurant.name}</span>
            <span className="small" style={{ color: 'var(--text-3)', lineHeight: 1.5 }}>{openDish.description}</span>
            <span className="price" style={{ fontSize: 20 }}>{formatCop(openDish.priceCop)}</span>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => { setOpenDish(null); nav.push({ name: 'reserve', restaurantId: id }); }}>Reservar para probarlo</button>
        </Sheet>
      )}
    </div>
  );
}
