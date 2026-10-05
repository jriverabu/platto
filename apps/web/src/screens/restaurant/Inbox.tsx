import { RULES, effectiveStatus, formatDateShort, formatDuration, formatRating, formatTime, localParts, minutesToRespond } from '@platto/core';
import { markAttendance, now, ratingOf, respondReservation, setReservationsEnabled, useDemo } from '../../data/store';
import type { ReservationRow } from '../../data/model';
import { Empty, Header, Icon, Switch, attempt, toast, useTick } from '../../components/ui';
import { statusBadge } from '../diner/MyReservations';

export function Inbox() {
  useTick(15_000);
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const t = now();
  const tz = rest.timezone;
  const today = localParts(new Date(t), tz).date;
  const mine = s.reservations.filter((r) => r.restaurantId === rid);
  const st = (r: ReservationRow) => effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(t));
  const pending = mine.filter((r) => st(r) === 'pending').sort((a, b) => a.expiresAt - b.expiresAt);
  const todays = mine
    .filter((r) => localParts(new Date(r.startsAt), tz).date === today && ['confirmed', 'completed', 'no_show'].includes(st(r)))
    .sort((a, b) => a.startsAt - b.startsAt);
  const later = mine.filter((r) => st(r) === 'confirmed' && localParts(new Date(r.startsAt), tz).date > today).sort((a, b) => a.startsAt - b.startsAt);
  const peopleToday = todays.filter((r) => st(r) !== 'no_show').reduce((n, r) => n + r.partySize, 0);
  const rating = ratingOf(s, rid);
  const name = (id: string) => s.people.find((p) => p.id === id)?.name ?? 'Comensal';

  return (
    <div className="screen">
      <Header
        kicker={`Modo restaurante · ${formatDateShort(new Date(t), tz)}`}
        title={rest.name}
        right={
          <span className="stack center gap-4">
            <Switch checked={rest.reservationsEnabled} onChange={(v) => { setReservationsEnabled(rid, v); toast(v ? 'Recibiendo reservas' : 'Reservas en pausa'); }} label="Recibir reservas" />
            <span className="tiny muted">{rest.reservationsEnabled ? 'Abierto' : 'Pausado'}</span>
          </span>
        }
      />
      <div className="stack gap-24" style={{ padding: '4px 16px 28px', gap: 24 }}>
        <div className="kpis">
          <div className="kpi dark"><b>{pending.length}</b><span className="tiny">por responder</span></div>
          <div className="kpi"><b>{peopleToday}</b><span className="tiny muted">personas hoy</span></div>
          <div className="kpi"><b>{rating.average !== null ? formatRating(rating.average) : '—'}</b><span className="tiny muted">{rating.count} reseñas</span></div>
        </div>

        <section className="stack gap-10">
          <h2 className="display h3">Solicitudes nuevas</h2>
          {pending.length === 0 && <span className="small muted">No hay solicitudes por responder.</span>}
          {pending.map((r) => {
            const left = minutesToRespond({ expiresAt: new Date(r.expiresAt) }, new Date(t));
            return (
              <div key={r.id} className="card stack gap-10 enter">
                <div className="row between gap-10" style={{ alignItems: 'flex-start' }}>
                  <span className="stack gap-4">
                    <span className="bold" style={{ fontSize: 16 }}>{name(r.dinerId)}</span>
                    <span className="mono small">{localParts(new Date(r.startsAt), tz).date === today ? 'Hoy' : formatDateShort(new Date(r.startsAt), tz)} · {formatTime(new Date(r.startsAt), tz)}</span>
                  </span>
                  <span className="people-box"><b>{r.partySize}</b><small>PERS.</small></span>
                </div>
                {r.note && <span className="note">“{r.note}”</span>}
                <span className="row gap-6 tiny bold" style={{ color: left < 45 ? 'var(--alerta)' : 'var(--tinta-2)' }}>
                  <Icon name="clock" size={14} /> Vence en {formatDuration(left)}
                </span>
                <div className="row gap-8">
                  <button className="btn btn-ghost btn-sm grow" onClick={() => attempt(() => respondReservation(r.id, false), 'Rechazada. Le sugerimos otros horarios.')}>Rechazar</button>
                  <button className="btn btn-dark btn-sm" style={{ flex: 1.4 }} onClick={() => attempt(() => respondReservation(r.id, true), 'Confirmada. El cliente ya fue avisado.')}>Aceptar</button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="stack gap-10">
          <div className="row between"><h2 className="display h3">Agenda de hoy</h2><span className="small muted">{todays.length} reservas</span></div>
          {todays.length === 0 ? (
            <Empty title="Agenda libre" body="Las reservas confirmadas para hoy aparecen aquí." />
          ) : (
            <div className="card list" style={{ padding: '0 14px' }}>
              {todays.map((r) => {
                const status = st(r);
                const canMark = status === 'confirmed' && r.startsAt - t <= RULES.attendanceOpensBeforeMinutes * 60_000;
                return (
                  <div key={r.id} className="row gap-12" style={{ padding: '12px 0' }}>
                    <span className="mono small" style={{ width: 84, flex: 'none', whiteSpace: 'nowrap' }}>{formatTime(new Date(r.startsAt), tz)}</span>
                    <span className="stack grow" style={{ minWidth: 0 }}>
                      <span className="bold ellipsis">{name(r.dinerId)}</span>
                      <span className="tiny muted ellipsis">{r.partySize} personas{r.note ? ` · ${r.note}` : ''}</span>
                    </span>
                    {canMark ? (
                      <span className="row gap-6">
                        <button className="icon-btn" aria-label="No llegó" style={{ color: 'var(--alerta)', border: '1.5px solid #cfc6b8', background: 'transparent', borderRadius: 12 }} onClick={() => attempt(() => markAttendance(r.id, false), 'Marcado como no asistió')}>
                          <Icon name="close" size={18} stroke={2.6} />
                        </button>
                        <button className="btn btn-dark btn-sm" onClick={() => attempt(() => markAttendance(r.id, true), 'Llegó. Podrá calificar en 2 horas.')}>Llegó</button>
                      </span>
                    ) : (
                      statusBadge(status)
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {later.length > 0 && (
          <section className="stack gap-10">
            <h2 className="display h3">Próximos días</h2>
            <div className="card list" style={{ padding: '0 14px' }}>
              {later.map((r) => (
                <div key={r.id} className="row gap-12" style={{ padding: '12px 0' }}>
                  <span className="mono small" style={{ width: 100, flex: 'none' }}>{formatDateShort(new Date(r.startsAt), tz)}<br />{formatTime(new Date(r.startsAt), tz)}</span>
                  <span className="stack grow"><span className="bold">{name(r.dinerId)}</span><span className="tiny muted">{r.partySize} personas</span></span>
                  {statusBadge('confirmed')}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
