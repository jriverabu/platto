import { useState } from 'react';
import { PLANS, SUBSCRIPTION_LABEL, addCalendarDays, formatDateShort, localParts, type Plan } from '@platto/core';
import { changePlan, now, setRule, toggleBlackout, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Header, Icon, Perforation, Sheet, Switch, attempt, toast } from '../../components/ui';

const MONTH = 30 * 24 * 3_600_000;

export function Account() {
  const s = useDemo();
  const nav = useNav();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const sub = s.subscriptions.find((x) => x.restaurantId === rid)!;
  const plan = PLANS[sub.plan];
  const t = now();

  const views = s.views.filter((v) => v.restaurantId === rid && v.at > t - MONTH);
  const byDish = s.dishes
    .filter((d) => d.restaurantId === rid)
    .map((d) => {
      const list = views.filter((v) => v.dishId === d.id);
      return { dish: d, views: list.length, avg: list.length ? list.reduce((a, v) => a + v.seconds, 0) / list.length : 0 };
    })
    .sort((a, b) => b.views - a.views);
  const top = Math.max(1, byDish[0]?.views ?? 1);
  const monthRes = s.reservations.filter((r) => r.restaurantId === rid && r.createdAt > t - MONTH);
  const answered = monthRes.filter((r) => r.respondedAt !== null).length;
  const decided = monthRes.filter((r) => r.status !== 'pending').length;

  return (
    <div className="screen">
      <Header kicker={rest.name} title="Cuenta" />
      <div className="stack gap-24" style={{ padding: '4px 16px 28px', gap: 24 }}>
        <div className="ticket" style={{ background: 'var(--carbon)', color: 'var(--hueso)', borderRadius: 20, padding: '20px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12, ['--notch' as string]: 'var(--hueso)' }}>
          <div className="row between">
            <span className="label">Plan actual</span>
            <span className={`badge ${sub.status === 'active' || sub.status === 'trialing' ? 'badge-ok' : 'badge-warn'}`}>{SUBSCRIPTION_LABEL[sub.status]}</span>
          </div>
          <span className="display" style={{ fontSize: 72, color: 'var(--brasa)', lineHeight: 0.8 }}>{plan.name}</span>
          <span className="small" style={{ color: 'var(--humo)' }}>
            {sub.status === 'past_due' && sub.graceUntil
              ? `Pago pendiente: sigues visible hasta el ${formatDateShort(new Date(sub.graceUntil), rest.timezone)}.`
              : `Próximo cobro: ${formatDateShort(new Date(sub.currentPeriodEnd), rest.timezone)}`}
          </span>
          <div className="perforation" aria-hidden="true" style={{ ['--notch' as string]: 'var(--hueso)' }}><span style={{ borderTopColor: 'var(--carbon-line)' }} /></div>
          <div className="stack gap-8 small">
            {plan.features.map((f) => <span key={f} className="row gap-8"><span style={{ color: 'var(--brasa)', display: 'flex' }}><Icon name="check" size={16} stroke={3} /></span>{f}</span>)}
          </div>
          <button className="btn btn-light btn-sm" onClick={() => nav.push({ name: 'r-plan' })}>Cambiar de plan</button>
        </div>

        <section className="stack gap-10">
          <div className="row between">
            <h2 className="display h3">Lo que más se ve</h2>
            <span className="label">últimos 30 días</span>
          </div>
          {plan.analytics ? (
            <div className="card bars">
              {byDish.slice(0, 5).map((x, i) => (
                <div key={x.dish.id} className="stack gap-6">
                  <span className="row between small"><span className="bold ellipsis">{x.dish.name}</span><span className="mono">{x.views} vistas · {x.avg.toFixed(1).replace('.', ',')} s</span></span>
                  <span className="bar"><i className={i === 0 ? 'hot' : ''} style={{ width: `${(x.views / top) * 100}%` }} /></span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card stack gap-8">
              <span className="small" style={{ lineHeight: 1.45 }}>Las vistas por plato y el tiempo que la gente mira cada video vienen con el plan Pro.</span>
              <button className="btn btn-dark btn-sm" onClick={() => nav.push({ name: 'r-plan' })}>Ver plan Pro</button>
            </div>
          )}
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            <div className="kpi"><b>{monthRes.length}</b><span className="tiny muted">reservas desde Platto</span></div>
            <div className="kpi"><b>{decided ? Math.round((answered / decided) * 100) : 100}%</b><span className="tiny muted">respondidas a tiempo</span></div>
          </div>
        </section>

        <div className="card list" style={{ padding: '0 14px' }}>
          <button className="row gap-12" style={{ padding: '14px 0', border: 0, background: 'none', color: 'inherit', width: '100%', textAlign: 'left' }} onClick={() => nav.push({ name: 'r-hours' })}>
            <Icon name="clock" /><span className="stack gap-4 grow"><span className="bold">Horarios y cupos</span><span className="small muted">Franjas, personas por franja y días cerrados</span></span><Icon name="chevron" size={18} />
          </button>
          <div className="row gap-12" style={{ padding: '14px 0' }}>
            <Icon name="pin" /><span className="stack gap-4 grow"><span className="bold">{rest.address}</span><span className="small muted">{rest.zone} · Bogotá</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanScreen() {
  const s = useDemo();
  const nav = useNav();
  const rid = s.ownerRestaurantId;
  const sub = s.subscriptions.find((x) => x.restaurantId === rid)!;
  const [checkout, setCheckout] = useState<Plan | null>(null);

  return (
    <div className="screen">
      <Header onBack={nav.back} title="Planes" />
      <div className="stack gap-16" style={{ padding: '4px 16px 28px' }}>
        {(Object.keys(PLANS) as Plan[]).map((id) => {
          const p = PLANS[id];
          const current = sub.plan === id;
          return (
            <div key={id} className="card stack gap-10" style={current ? { outline: '2px solid var(--carbon)' } : undefined}>
              <div className="row between"><span className="display h2">{p.name}</span>{current && <span className="badge badge-ok">Tu plan</span>}</div>
              <span className="mono">[PRECIO] COP / mes</span>
              <div className="stack gap-6 small">{p.features.map((f) => <span key={f} className="row gap-8"><Icon name="check" size={16} stroke={3} />{f}</span>)}</div>
              {!current && <button className="btn btn-dark" onClick={() => setCheckout(id)}>Cambiar a {p.name}</button>}
            </div>
          );
        })}
        <span className="tiny muted" style={{ lineHeight: 1.45 }}>El pago se hace con Mercado Pago (tarjeta, PSE o Nequi) y se renueva cada mes. Cancelas cuando quieras; tu menú y tus videos no se borran.</span>
      </div>
      {checkout && (
        <Sheet onClose={() => setCheckout(null)} label="Pago">
          <span className="label">Mercado Pago · demo</span>
          <span className="display h2">Platto {PLANS[checkout].name}</span>
          <div className="paper ticket stack gap-8" style={{ background: 'var(--hueso-2)', ['--notch' as string]: 'var(--hueso)' }}>
            <span className="row between"><span>Suscripción mensual</span><span className="mono">[PRECIO]</span></span>
            <Perforation />
            <span className="small" style={{ color: 'var(--tinta)' }}>En la app real aquí se abre el pago de Mercado Pago y la suscripción se activa cuando el pago se confirma.</span>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => { attempt(() => changePlan(rid, checkout)); toast('Pago aprobado. Plan actualizado.'); setCheckout(null); nav.back(); }}>Simular pago aprobado</button>
        </Sheet>
      )}
    </div>
  );
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function Hours() {
  const s = useDemo();
  const nav = useNav();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const today = localParts(new Date(now()), rest.timezone).date;
  const nextDays = Array.from({ length: 14 }, (_, i) => addCalendarDays(today, i));
  const rule = (w: number, b: 'a' | 'c') => s.rules.find((r) => r.id === `${rid}-${w}-${b}`);

  return (
    <div className="screen">
      <Header onBack={nav.back} title="Horarios y cupos" />
      <div className="stack gap-20" style={{ padding: '4px 16px 28px', gap: 20 }}>
        <span className="small muted" style={{ lineHeight: 1.45 }}>Almuerzo de 12:00 a 3:30 p. m. y cena de 6:30 a 10:00 p. m., en franjas de 30 minutos. El cupo es de personas por franja.</span>
        <div className="card list" style={{ padding: '0 14px' }}>
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <div key={w} className="stack gap-8" style={{ padding: '12px 0' }}>
              <span className="bold">{DAYS[w]}</span>
              {(['a', 'c'] as const).map((b) => {
                const r = rule(w, b);
                return (
                  <div key={b} className="row gap-10">
                    <Switch checked={Boolean(r)} onChange={(v) => setRule(rid, w, b, { enabled: v, capacity: 12 })} label={`${b === 'a' ? 'Almuerzo' : 'Cena'} ${DAYS[w]}`} />
                    <span className="small grow">{b === 'a' ? 'Almuerzo' : 'Cena'}</span>
                    {r && (
                      <span className="row gap-6">
                        <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Menos cupo" onClick={() => setRule(rid, w, b, { capacity: r.capacityPeople - 2 })}>−</button>
                        <span className="mono small" style={{ width: 56, textAlign: 'center' }}>{r.capacityPeople} pers.</span>
                        <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Más cupo" onClick={() => setRule(rid, w, b, { capacity: r.capacityPeople + 2 })}>+</button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="stack gap-10">
          <span className="bold">Días cerrados</span>
          <span className="small muted">Toca un día para cerrarlo o abrirlo. Ese día no se ofrecen mesas.</span>
          <div className="row gap-6 wrap">
            {nextDays.map((d) => {
              const closed = s.blackouts.some((b) => b.restaurantId === rid && b.day === d);
              return (
                <button key={d} className="chip" aria-pressed={closed} onClick={() => attempt(() => toggleBlackout(rid, d), closed ? 'Día abierto' : 'Día cerrado')}>
                  {formatDateShort(new Date(`${d}T17:00:00Z`), rest.timezone)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
