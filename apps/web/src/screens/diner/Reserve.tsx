import { useMemo, useState } from 'react';
import { RULES, bookableDates, formatClock12, formatDateShort, formatTime, weekdayOf } from '@platto/core';
import { createReservation, now, slotsFor, useDemo } from '../../data/store';
import type { ReservationRow } from '../../data/model';
import { useNav } from '../../nav';
import { Header, Icon, Perforation, Stepper, attempt } from '../../components/ui';

const WD = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export function Reserve({ restaurantId }: { restaurantId: string }) {
  const s = useDemo();
  const nav = useNav();
  const restaurant = s.restaurants.find((r) => r.id === restaurantId)!;
  const dates = useMemo(() => bookableDates(new Date(now()), restaurant.timezone, 14), [restaurant.timezone, s.clockOffsetMin]);
  const [party, setParty] = useState(2);
  const [date, setDate] = useState(dates[0]!);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<ReservationRow | null>(null);

  const slots = slotsFor(s, restaurantId, date, party);
  const lunch = slots.filter((x) => x.clock < '16:00');
  const dinner = slots.filter((x) => x.clock >= '16:00');
  const chosen = slots.find((x) => x.startsAt.getTime() === startsAt && x.available);
  const summary = chosen
    ? `Mesa para ${party} · ${formatDateShort(chosen.startsAt, restaurant.timezone)} · ${formatClock12(chosen.clock)}`
    : `Mesa para ${party} · elige una hora`;

  if (created) {
    const live = s.reservations.find((r) => r.id === created.id) ?? created;
    return (
      <div className="screen">
        <Header onBack={nav.back} />
        <div className="stack gap-20" style={{ padding: '24px 16px', gap: 22 }}>
          <div className="paper ticket stack gap-12" style={{ padding: '26px 20px 22px', ['--notch' as string]: 'var(--carbon)' }}>
            <span className={`stamp stamp-in`} style={{ position: 'absolute', right: 18, top: 18, color: live.status === 'confirmed' ? 'var(--hoja-texto)' : 'var(--brasa-texto)', fontSize: 12 }}>
              {live.status === 'confirmed' ? 'CONFIRMADA' : live.status === 'rejected' ? 'RECHAZADA' : 'ENVIADA'}
            </span>
            <span className="label">{live.status === 'pending' ? 'Pendiente de confirmación' : 'Respuesta del restaurante'}</span>
            <span className="display" style={{ fontSize: 40 }}>{restaurant.name}</span>
            <span className="display h3">Mesa para {live.partySize} · {formatDateShort(new Date(live.startsAt), restaurant.timezone)} · {formatTime(new Date(live.startsAt), restaurant.timezone)}</span>
            <Perforation />
            <span style={{ lineHeight: 1.5, fontSize: 15 }}>
              {live.status === 'pending'
                ? `${restaurant.name} tiene ${RULES.responseWindowMinutes / 60} horas para responder. Te avisamos con una notificación apenas acepte.`
                : live.status === 'confirmed'
                  ? '¡Listo! Te esperan. Si no puedes ir, cancela hasta 2 horas antes.'
                  : 'No hay mesa para ese horario. Prueba otra hora u otro restaurante.'}
            </span>
          </div>
          <span className="small muted" style={{ lineHeight: 1.5 }}>
            En la demo puedes cambiar a <b>Restaurante</b> con el botón de arriba y aceptar esta solicitud tú mismo.
          </span>
          <button className="btn btn-light btn-block" onClick={() => nav.openIn('reservations', { name: 'reservation', id: live.id })}>Ver mi reserva</button>
          <button className="btn btn-ghost btn-block" onClick={() => nav.switchTab('feed')}>Seguir descubriendo</button>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (!chosen) return;
    attempt(() => {
      const row = createReservation({ restaurantId, startsAt: chosen.startsAt.getTime(), partySize: party, note });
      setCreated(row);
    });
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <Header onBack={nav.back} kicker="Reserva en" title={restaurant.name} />
      <div className="stack gap-24" style={{ padding: '8px 16px 24px', gap: 24, flex: 1 }}>
        <div className="card row between" style={{ padding: '12px 12px 12px 18px' }}>
          <span className="stack gap-4">
            <span className="bold">Personas</span>
            <span className="small muted">Hasta {RULES.maxPartySize} por reserva</span>
          </span>
          <Stepper value={party} min={1} max={RULES.maxPartySize} onChange={(v) => { setParty(v); setStartsAt(null); }} label="Personas" />
        </div>

        <div className="stack gap-10">
          <div className="row between"><span className="bold">Día</span><span className="label">{monthLabel(date)}</span></div>
          <div className="days" role="group" aria-label="Día">
            {dates.map((d, i) => (
              <button key={d} className="day" aria-pressed={d === date} onClick={() => { setDate(d); setStartsAt(null); }}>
                <small>{i === 0 ? 'HOY' : WD[weekdayOf(d)]}</small>
                <b>{Number(d.slice(8))}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="stack gap-12">
          {slots.length === 0 && <span className="muted small">{restaurant.name} no recibe reservas este día.</span>}
          {[['Almuerzo', lunch], ['Cena', dinner]].map(([label, list]) =>
            (list as typeof slots).length ? (
              <div className="stack gap-8" key={label as string}>
                <span className="bold">{label as string}</span>
                <div className="slots">
                  {(list as typeof slots).map((x) => (
                    <button
                      key={x.clock}
                      className="slot"
                      disabled={!x.available}
                      aria-pressed={x.startsAt.getTime() === startsAt}
                      onClick={() => setStartsAt(x.startsAt.getTime())}
                      title={x.reason === 'full' ? 'Sin cupo' : x.reason === 'too_soon' ? 'Muy pronto' : undefined}
                    >
                      {formatClock12(x.clock).replace(' p. m.', ' pm').replace(' a. m.', ' am')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>

        <div className="field">
          <label htmlFor="nota">Nota para el restaurante <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea id="nota" className="textarea" rows={2} maxLength={280} placeholder="Cumpleaños, alergias, silla para bebé…" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="paper ticket stack gap-10" style={{ ['--notch' as string]: 'var(--carbon)' }}>
          <span className="label">Tu solicitud</span>
          <span className="display" style={{ fontSize: 28 }}>{summary}</span>
          <Perforation />
          <span className="small" style={{ color: 'var(--tinta-2)', lineHeight: 1.45 }}>
            {restaurant.name} confirma en máximo 2 horas. Puedes cancelar sin costo hasta 2 horas antes.
          </span>
        </div>
      </div>
      <div className="sticky-cta">
        <button className="btn btn-primary btn-block" disabled={!chosen} onClick={submit}>
          <Icon name="calendar" size={18} /> Enviar solicitud
        </button>
      </div>
    </div>
  );
}

function monthLabel(date: string) {
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return `${months[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}
