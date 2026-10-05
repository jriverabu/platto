import { useState } from 'react';
import { PLANS, SUBSCRIPTION_LABEL, formatCop, formatDateShort, formatSeconds } from '@platto/core';
import { isRestaurantListed, markPaid, reviewVideo, setRestaurantStatus, setReviewHidden, simulatePaymentFailure, useDemo } from '../../data/store';
import { DishVideo } from '../../components/Video';
import { Empty, Header, Stars, attempt } from '../../components/ui';

export function AdminVideos() {
  const s = useDemo();
  const queue = s.dishes.filter((d) => d.videoStatus === 'in_review' && d.candidate);
  const processing = s.dishes.filter((d) => d.videoStatus === 'processing');
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <div className="screen">
      <Header kicker="Administrador" title="Videos por revisar" />
      <div className="stack gap-20" style={{ padding: '4px 16px 28px', gap: 20 }}>
        <span className="small muted" style={{ lineHeight: 1.45 }}>
          Revisa que cada video cumpla el estándar: vertical, plato bien encuadrado, sin texto ni logos. La duración máxima de 10 s ya la garantiza el sistema.
        </span>
        {processing.map((d) => <span key={d.id} className="badge badge-warn" style={{ alignSelf: 'flex-start' }}>Procesando: {d.name}</span>)}
        {queue.length === 0 && <Empty title="Todo al día" body="No hay videos esperando revisión." />}
        {queue.map((d) => {
          const rest = s.restaurants.find((r) => r.id === d.restaurantId)!;
          return (
            <div key={d.id} className="card stack gap-12 enter">
              <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 120, aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: '#000', flex: 'none' }}>
                  <DishVideo video={d.candidate!} active className="fill" label={`Video candidato de ${d.name}`} />
                </div>
                <div className="stack gap-6 grow">
                  <span className="label">{rest.name}</span>
                  <span className="bold" style={{ fontSize: 17 }}>{d.name}</span>
                  <span className="price small">{formatCop(d.priceCop)}</span>
                  <span className="badge badge-ok" style={{ alignSelf: 'flex-start' }}>{formatSeconds(d.candidate!.duration)} · dentro del límite</span>
                  {d.video && <span className="tiny muted">Reemplaza el video publicado.</span>}
                </div>
              </div>
              <input className="input" style={{ minHeight: 44 }} placeholder="Motivo si lo rechazas (ej. tiene texto encima)" value={notes[d.id] ?? ''} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} aria-label="Motivo del rechazo" />
              <div className="row gap-8">
                <button className="btn btn-ghost btn-sm grow" onClick={() => attempt(() => reviewVideo(d.id, false, notes[d.id] ?? ''), 'Rechazado. El restaurante ya sabe qué cambiar.')}>Rechazar</button>
                <button className="btn btn-dark btn-sm" style={{ flex: 1.4 }} onClick={() => attempt(() => reviewVideo(d.id, true, ''), 'Aprobado. Ya se ve en Descubrir.')}>Aprobar y publicar</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminRestaurants() {
  const s = useDemo();
  const active = s.subscriptions.filter((x) => x.status === 'active' || x.status === 'trialing');
  const mrrHint = active.length;

  return (
    <div className="screen">
      <Header kicker="Administrador" title="Restaurantes" />
      <div className="stack gap-16" style={{ padding: '4px 16px 28px' }}>
        <div className="kpis">
          <div className="kpi dark"><b>{s.restaurants.filter((r) => isRestaurantListed(s, r.id)).length}</b><span className="tiny">visibles</span></div>
          <div className="kpi"><b>{mrrHint}</b><span className="tiny muted">pagando</span></div>
          <div className="kpi"><b>{s.subscriptions.filter((x) => x.plan === 'pro').length}</b><span className="tiny muted">en Pro</span></div>
        </div>
        {s.restaurants.map((r) => {
          const sub = s.subscriptions.find((x) => x.restaurantId === r.id)!;
          const listed = isRestaurantListed(s, r.id);
          const dishes = s.dishes.filter((d) => d.restaurantId === r.id);
          return (
            <div key={r.id} className="card stack gap-10">
              <div className="row between gap-8">
                <span className="stack gap-4">
                  <span className="display h3">{r.name}</span>
                  <span className="small muted">{r.cuisine} · {r.zone} · {dishes.filter((d) => d.video).length}/{dishes.length} platos con video</span>
                </span>
                <span className={`badge ${listed ? 'badge-ok' : 'badge-bad'}`}>{listed ? 'Visible' : 'Oculto'}</span>
              </div>
              <span className="row gap-6 wrap small">
                <span className="badge badge-neutral">{PLANS[sub.plan].name}</span>
                <span className={`badge ${sub.status === 'past_due' ? 'badge-warn' : sub.status === 'active' || sub.status === 'trialing' ? 'badge-ok' : 'badge-bad'}`}>{SUBSCRIPTION_LABEL[sub.status]}</span>
                {sub.status === 'past_due' && sub.graceUntil && <span className="tiny muted">gracia hasta {formatDateShort(new Date(sub.graceUntil), r.timezone)}</span>}
                {r.status === 'suspended' && <span className="badge badge-bad">Suspendido</span>}
              </span>
              <div className="row gap-8 wrap">
                {r.status === 'active' ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => attempt(() => setRestaurantStatus(r.id, 'suspended'), `${r.name} suspendido`)}>Suspender</button>
                ) : (
                  <button className="btn btn-dark btn-sm" onClick={() => attempt(() => setRestaurantStatus(r.id, 'active'), `${r.name} activo`)}>Activar</button>
                )}
                {sub.status === 'past_due' ? (
                  <button className="btn btn-dark btn-sm" onClick={() => attempt(() => markPaid(r.id), 'Pago registrado')}>Registrar pago</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => attempt(() => simulatePaymentFailure(r.id), 'Pago fallido: 7 días de gracia')}>Simular pago fallido</button>
                )}
              </div>
            </div>
          );
        })}
        <span className="tiny muted" style={{ lineHeight: 1.45 }}>Con pago fallido el restaurante sigue visible 7 días. Usa «+1 día» en los controles de la demo para ver cómo se oculta al vencer la gracia.</span>
      </div>
    </div>
  );
}

export function AdminReviews() {
  const s = useDemo();
  const reported = s.reviews.filter((r) => r.reported && !r.hidden);
  const hidden = s.reviews.filter((r) => r.hidden);

  return (
    <div className="screen">
      <Header kicker="Administrador" title="Reseñas reportadas" />
      <div className="stack gap-16" style={{ padding: '4px 16px 28px' }}>
        {reported.length === 0 && <Empty title="Sin reportes" body="Cuando un comensal o restaurante reporte una reseña, aparece aquí." />}
        {reported.map((r) => {
          const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
          return (
            <div key={r.id} className="card stack gap-10">
              <span className="row between"><span className="label">{rest.name}</span><Stars value={r.rating} /></span>
              <span className="bold">{r.authorName}</span>
              {r.comment && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{r.comment}</p>}
              <div className="row gap-8">
                <button className="btn btn-ghost btn-sm grow" onClick={() => attempt(() => setReviewHidden(r.id, false), 'Reseña mantenida')}>Mantener</button>
                <button className="btn btn-dark btn-sm grow" onClick={() => attempt(() => setReviewHidden(r.id, true), 'Reseña ocultada')}>Ocultar</button>
              </div>
            </div>
          );
        })}
        {hidden.length > 0 && (
          <div className="stack gap-8">
            <span className="label">Ocultas</span>
            {hidden.map((r) => (
              <div key={r.id} className="card row between">
                <span className="small">{r.authorName} · {r.comment ?? 'Sin comentario'}</span>
                <button className="btn-link small" onClick={() => attempt(() => setReviewHidden(r.id, false), 'Reseña visible de nuevo')}>Mostrar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
