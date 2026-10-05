import { STATUS_LABEL, effectiveStatus, formatDateShort, formatDuration, formatTime, minutesToRespond, type ReservationStatus } from '@platto/core';
import { useEffect } from 'react';
import { canReviewReservation, cancelReservation, markNotificationsRead, now, reviewFor, useDemo } from '../../data/store';
import type { ReservationRow } from '../../data/model';
import { useNav } from '../../nav';
import { Empty, Header, Icon, Perforation, Stars, attempt, useTick } from '../../components/ui';

export function statusBadge(status: ReservationStatus) {
  const cls = status === 'confirmed' || status === 'completed' ? 'badge-ok' : status === 'pending' ? 'badge-warn' : 'badge-bad';
  return <span className={`badge ${cls}`}>{STATUS_LABEL[status]}</span>;
}

export function MyReservations() {
  useTick();
  const s = useDemo();
  const nav = useNav();
  useEffect(() => markNotificationsRead('diner'), [s.notifications.length]);
  const t = now();
  const mine = s.reservations.filter((r) => r.dinerId === s.dinerId);
  const status = (r: ReservationRow) => effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(t));
  const upcoming = mine.filter((r) => ['pending', 'confirmed'].includes(status(r)) && r.startsAt > t - 3 * 3_600_000).sort((a, b) => a.startsAt - b.startsAt);
  const toReview = mine.filter((r) => canReviewReservation(s, r).ok);
  const past = mine.filter((r) => !upcoming.includes(r) && !toReview.includes(r)).sort((a, b) => b.startsAt - a.startsAt);

  return (
    <div className="screen">
      <Header title="Mis reservas" />
      <div className="stack gap-24" style={{ padding: '4px 16px 28px', gap: 24 }}>
        {toReview.length > 0 && (
          <div className="stack gap-10">
            <span className="label">Califica tu visita</span>
            {toReview.map((r) => {
              const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
              return (
                <div key={r.id} className="paper stack gap-10" style={{ padding: 16 }}>
                  <span className="row between"><span className="bold">{rest.name}</span><span className="stamp" style={{ color: 'var(--hoja-texto)' }}>VISITA VERIFICADA</span></span>
                  <span className="small" style={{ color: 'var(--tinta)' }}>{formatDateShort(new Date(r.startsAt), rest.timezone)} · mesa para {r.partySize}</span>
                  <button className="btn btn-primary" onClick={() => nav.push({ name: 'review', reservationId: r.id })}>Calificar en 10 segundos</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="stack gap-10">
          <span className="label">Próximas</span>
          {upcoming.length === 0 && <Empty title="Sin reservas" body="Encuentra un plato en Descubrir y reserva desde ahí." action={<button className="btn btn-light" onClick={() => nav.switchTab('feed')}>Descubrir</button>} />}
          {upcoming.map((r) => <ReservationCard key={r.id} r={r} onOpen={() => nav.push({ name: 'reservation', id: r.id })} />)}
        </div>

        {past.length > 0 && (
          <div className="stack gap-10">
            <span className="label">Anteriores</span>
            <div className="card list" style={{ padding: '0 14px' }}>
              {past.map((r) => {
                const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
                const review = reviewFor(s, r.id);
                return (
                  <button key={r.id} className="row gap-12" style={{ padding: '12px 0', border: 0, background: 'none', color: 'inherit', textAlign: 'left', width: '100%' }} onClick={() => nav.push({ name: 'reservation', id: r.id })}>
                    <span className="stack gap-4 grow">
                      <span className="bold">{rest.name}</span>
                      <span className="small muted">{formatDateShort(new Date(r.startsAt), rest.timezone)} · {r.partySize} personas</span>
                    </span>
                    {review ? <Stars value={review.rating} color="var(--brasa-carbon)" /> : statusBadge(status(r))}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReservationCard({ r, onOpen }: { r: ReservationRow; onOpen: () => void }) {
  const s = useDemo();
  const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
  const st = effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(now()));
  const cover = s.dishes.find((d) => d.id === rest.coverDishId)?.video?.poster;
  return (
    <button className="card row gap-12" style={{ border: 0, color: 'inherit', textAlign: 'left', padding: 10 }} onClick={onOpen}>
      <span style={{ width: 64, height: 86, borderRadius: 10, overflow: 'hidden', flex: 'none', background: '#000' }}>{cover && <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</span>
      <span className="stack gap-6 grow">
        <span className="row between gap-8"><span className="bold ellipsis">{rest.name}</span>{statusBadge(st)}</span>
        <span className="mono small">{formatDateShort(new Date(r.startsAt), rest.timezone)} · {formatTime(new Date(r.startsAt), rest.timezone)}</span>
        <span className="small muted">Mesa para {r.partySize}{st === 'pending' ? ` · responde en ${formatDuration(minutesToRespond({ expiresAt: new Date(r.expiresAt) }, new Date(now())))}` : ''}</span>
      </span>
      <Icon name="chevron" size={18} />
    </button>
  );
}

export function ReservationDetail({ id }: { id: string }) {
  useTick(15_000);
  const s = useDemo();
  const nav = useNav();
  const r = s.reservations.find((x) => x.id === id);
  if (!r) return null;
  const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
  const st = effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(now()));
  const review = reviewFor(s, r.id);
  const reviewable = canReviewReservation(s, r);

  return (
    <div className="screen">
      <Header onBack={nav.back} title="Tu reserva" />
      <div className="stack gap-16" style={{ padding: '8px 16px 28px' }}>
        <div className="paper ticket stack gap-10" style={{ padding: '22px 18px 18px', ['--notch' as string]: 'var(--carbon)' }}>
          <span className="row between"><span className="label">{rest.zone} · {rest.address}</span>{statusBadge(st)}</span>
          <span className="display" style={{ fontSize: 42 }}>{rest.name}</span>
          <span className="display h3">{formatDateShort(new Date(r.startsAt), rest.timezone)} · {formatTime(new Date(r.startsAt), rest.timezone)}</span>
          <span>Mesa para {r.partySize}{r.note ? ` · “${r.note}”` : ''}</span>
          <Perforation />
          <span className="small" style={{ color: 'var(--tinta-2)', lineHeight: 1.45 }}>
            {st === 'pending' && `Esperando respuesta. Vence en ${formatDuration(minutesToRespond({ expiresAt: new Date(r.expiresAt) }, new Date(now())))}.`}
            {st === 'confirmed' && 'Confirmada. Puedes cancelar sin costo hasta 2 horas antes.'}
            {st === 'completed' && (review ? 'Ya calificaste esta visita. ¡Gracias!' : reviewable.ok ? 'Tu visita está lista para calificar.' : reviewable.error.message)}
            {st === 'rejected' && 'El restaurante no pudo recibirte a esa hora.'}
            {st === 'expired' && 'El restaurante no respondió a tiempo. Prueba otro horario.'}
            {st === 'cancelled' && 'Cancelaste esta reserva.'}
            {st === 'no_show' && 'El restaurante registró que no llegaste.'}
          </span>
        </div>
        {reviewable.ok && <button className="btn btn-primary btn-block" onClick={() => nav.push({ name: 'review', reservationId: r.id })}>Calificar visita</button>}
        <button className="btn btn-light btn-block" onClick={() => nav.push({ name: 'restaurant', id: rest.id })}>Ver menú de {rest.name}</button>
        {(st === 'pending' || st === 'confirmed') && (
          <button className="btn btn-ghost btn-block" onClick={() => attempt(() => cancelReservation(r.id), 'Reserva cancelada')}>
            {st === 'pending' ? 'Retirar solicitud' : 'Cancelar reserva'}
          </button>
        )}
      </div>
    </div>
  );
}
