import { useState } from 'react';
import { formatDateShort, formatRating } from '@platto/core';
import { ratingOf, replyReview, useDemo } from '../../data/store';
import { Header, Stars, attempt } from '../../components/ui';

export function RestaurantReviews() {
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const reviews = s.reviews.filter((r) => r.restaurantId === rid && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const rating = ratingOf(s, rid);
  const max = Math.max(1, ...rating.distribution);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <div className="screen">
      <Header kicker="Calificaciones verificadas" title="Reseñas" />
      <div className="stack gap-20" style={{ padding: '4px 16px 28px', gap: 20 }}>
        <div className="card row gap-16">
          <span className="stack center" style={{ width: 96 }}>
            <span className="display" style={{ fontSize: 56 }}>{rating.average !== null ? formatRating(rating.average) : '—'}</span>
            <span className="tiny muted">{rating.count} reseñas</span>
          </span>
          <span className="stack gap-4 grow">
            {[5, 4, 3, 2, 1].map((n) => (
              <span key={n} className="row gap-8 tiny">
                <span className="mono" style={{ width: 10 }}>{n}</span>
                <span className="bar grow"><i className={n === 5 ? 'hot' : ''} style={{ width: `${(rating.distribution[n - 1]! / max) * 100}%` }} /></span>
                <span className="mono muted" style={{ width: 18, textAlign: 'right' }}>{rating.distribution[n - 1]}</span>
              </span>
            ))}
          </span>
        </div>
        <span className="small muted" style={{ lineHeight: 1.45 }}>Solo califica quien tuvo una reserva completada. Puedes responder cada reseña una vez; no se pueden borrar.</span>

        {reviews.map((r) => {
          const dishes = s.dishes.filter((d) => r.dishIds.includes(d.id)).map((d) => d.name);
          return (
            <div key={r.id} className="card stack gap-10">
              <div className="row between">
                <span className="stack gap-4"><span className="bold">{r.authorName}</span><Stars value={r.rating} /></span>
                <span className="tiny muted">{formatDateShort(new Date(r.createdAt), 'America/Bogota')}</span>
              </div>
              {r.comment && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{r.comment}</p>}
              {(dishes.length > 0 || r.tags.length > 0) && (
                <span className="row gap-6 wrap">
                  {dishes.map((d) => <span key={d} className="badge badge-dark">{d}</span>)}
                  {r.tags.map((t) => <span key={t} className="badge badge-neutral">{t}</span>)}
                </span>
              )}
              {r.reply ? (
                <div style={{ background: 'var(--hueso)', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.4 }}><b>Tu respuesta:</b> {r.reply}</div>
              ) : (
                <form className="row gap-8" onSubmit={(e) => { e.preventDefault(); attempt(() => replyReview(r.id, drafts[r.id] ?? ''), 'Respuesta publicada'); }}>
                  <input className="input grow" style={{ minHeight: 44 }} placeholder="Responder públicamente" maxLength={500} value={drafts[r.id] ?? ''} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} aria-label={`Responder a ${r.authorName}`} />
                  <button className="btn btn-dark btn-sm" type="submit" disabled={!(drafts[r.id] ?? '').trim()}>Enviar</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
