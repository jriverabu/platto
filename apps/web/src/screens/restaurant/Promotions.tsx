import { useState } from 'react';
import { RULES, addCalendarDays, countsTowardPromoLimit, formatPromoDays, isPromotionLive, localParts, type Promotion } from '@platto/core';
import { deletePromotion, now, planOf, savePromotion, setPromotionActive, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Header, Icon, Sheet, Switch, attempt } from '../../components/ui';
import { dayLabel } from '../../components/Promo';

// Lunes primero, como se lee la semana en Colombia.
const WEEK = [
  { d: 1, short: 'L', name: 'lunes' },
  { d: 2, short: 'M', name: 'martes' },
  { d: 3, short: 'M', name: 'miércoles' },
  { d: 4, short: 'J', name: 'jueves' },
  { d: 5, short: 'V', name: 'viernes' },
  { d: 6, short: 'S', name: 'sábado' },
  { d: 0, short: 'D', name: 'domingo' },
];

interface Draft {
  id?: string;
  title: string;
  detail: string;
  weekdays: number[];
  startsOn: string;
  endsOn: string;
}

export function Promotions() {
  const s = useDemo();
  const nav = useNav();
  const rid = s.ownerRestaurantId;
  const rest = s.restaurants.find((r) => r.id === rid)!;
  const plan = planOf(s, rid);
  const today = localParts(new Date(now()), rest.timezone).date;
  const [draft, setDraft] = useState<Draft | null>(null);

  const mine = s.promotions.filter((p) => p.restaurantId === rid).sort((a, b) => Number(b.active) - Number(a.active) || a.endsOn.localeCompare(b.endsOn));
  const activeCount = mine.filter((p) => countsTowardPromoLimit(p, today)).length;

  if (plan !== 'pro') {
    return (
      <div className="screen">
        <Header onBack={nav.back} title="Promociones" />
        <div className="stack gap-16" style={{ padding: '4px 16px 28px' }}>
          <div className="promo">
            <span className="promo-icon" aria-hidden="true"><Icon name="tag" size={18} /></span>
            <span className="stack gap-6 grow">
              <span style={{ fontWeight: 600, fontSize: 16 }}>Las promociones vienen con el plan Pro</span>
              <span className="small" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                Crea ofertas como «2x1 en entradas» o «postre gratis en mesas de 4». Se ven sobre tus videos en Inicio, en Explorar y en tu perfil, solo los días que elijas.
              </span>
            </span>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => nav.push({ name: 'r-plan' })}>Ver plan Pro</button>
        </div>
      </div>
    );
  }

  const status = (p: Promotion) => {
    if (p.endsOn < today) return { text: 'Terminó', cls: 'badge-neutral' };
    if (!p.active) return { text: 'En pausa', cls: 'badge-neutral' };
    if (p.startsOn > today) return { text: `Empieza el ${dayLabel(p.startsOn, rest.timezone)}`, cls: 'badge-warn' };
    if (isPromotionLive(p, plan, new Date(now()), rest.timezone)) return { text: 'Se ve hoy', cls: 'badge-ok' };
    return { text: 'Hoy no aplica', cls: 'badge-neutral' };
  };

  const save = () => {
    if (!draft) return;
    const ok = attempt(
      () => savePromotion(rid, { id: draft.id, title: draft.title, detail: draft.detail, weekdays: draft.weekdays, startsOn: draft.startsOn, endsOn: draft.endsOn }),
      draft.id ? 'Promoción actualizada' : 'Promoción publicada',
    );
    if (ok) setDraft(null);
  };

  return (
    <div className="screen">
      <Header onBack={nav.back} title="Promociones" kicker={rest.name} />
      <div className="stack gap-16" style={{ padding: '4px 16px 28px' }}>
        <span className="small muted" style={{ lineHeight: 1.5 }}>
          Se ven en Inicio, en Explorar y en tu perfil los días que elijas. Puedes tener hasta {RULES.promoMaxActive} encendidas a la vez ({activeCount} de {RULES.promoMaxActive}).
        </span>
        <button
          className="btn btn-primary btn-block"
          onClick={() => setDraft({ title: '', detail: '', weekdays: [], startsOn: today, endsOn: addCalendarDays(today, 30) })}
        >
          <Icon name="plus" size={18} /> Nueva promoción
        </button>

        {mine.length === 0 && <span className="small muted" style={{ textAlign: 'center', padding: '20px 0' }}>Todavía no tienes promociones.</span>}

        <div className="stack gap-12">
          {mine.map((p) => {
            const st = status(p);
            return (
              <div key={p.id} className="card stack gap-10">
                <div className="row between gap-10" style={{ alignItems: 'flex-start' }}>
                  <span className="stack gap-4 grow" style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</span>
                    {p.detail && <span className="small" style={{ color: 'var(--text-2)', lineHeight: 1.45 }}>{p.detail}</span>}
                  </span>
                  <Switch checked={p.active} onChange={(v) => attempt(() => setPromotionActive(p.id, v), v ? 'Promoción encendida' : 'Promoción en pausa')} label={`Encender ${p.title}`} />
                </div>
                <span className="tiny muted">{formatPromoDays(p.weekdays)} · {dayLabel(p.startsOn, rest.timezone)} al {dayLabel(p.endsOn, rest.timezone)}</span>
                <div className="row between">
                  <span className={`badge ${st.cls}`}>{st.text}</span>
                  <span className="row gap-6">
                    <button className="icon-btn" style={{ width: 38, height: 38 }} aria-label={`Editar ${p.title}`} onClick={() => setDraft({ id: p.id, title: p.title, detail: p.detail ?? '', weekdays: p.weekdays, startsOn: p.startsOn, endsOn: p.endsOn })}>
                      <Icon name="edit" size={18} />
                    </button>
                    <button className="icon-btn" style={{ width: 38, height: 38 }} aria-label={`Borrar ${p.title}`} onClick={() => attempt(() => deletePromotion(p.id), 'Promoción borrada')}>
                      <Icon name="trash" size={18} />
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {draft && (
        <Sheet onClose={() => setDraft(null)} label={draft.id ? 'Editar promoción' : 'Nueva promoción'}>
          <span className="display h2">{draft.id ? 'Editar promoción' : 'Nueva promoción'}</span>
          <div className="field">
            <label htmlFor="promo-title">Nombre</label>
            <input id="promo-title" className="input" maxLength={RULES.promoTitleMax} placeholder="2x1 en entradas" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <span className="tiny muted" style={{ textAlign: 'right' }}>{draft.title.length}/{RULES.promoTitleMax}</span>
          </div>
          <div className="field">
            <label htmlFor="promo-detail">Condiciones</label>
            <textarea id="promo-detail" className="textarea" rows={2} maxLength={RULES.promoDetailMax} placeholder="Solo en la cena. No acumulable." value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Días</span>
            <div className="days" role="group" aria-label="Días de la semana">
              {WEEK.map((w) => {
                const on = draft.weekdays.length === 0 || draft.weekdays.includes(w.d);
                return (
                  <button
                    key={w.d}
                    type="button"
                    aria-pressed={on}
                    aria-label={w.name}
                    onClick={() => {
                      const base = draft.weekdays.length === 0 ? WEEK.map((x) => x.d) : draft.weekdays;
                      const next = on ? base.filter((d) => d !== w.d) : [...base, w.d];
                      if (next.length === 0) return; // al menos un día
                      setDraft({ ...draft, weekdays: next.length === 7 ? [] : next });
                    }}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
            <span className="tiny muted">{formatPromoDays(draft.weekdays)}</span>
          </div>
          <div className="row gap-10">
            <div className="field grow">
              <label htmlFor="promo-start">Desde</label>
              <input id="promo-start" className="input" type="date" min={today} value={draft.startsOn} onChange={(e) => setDraft({ ...draft, startsOn: e.target.value })} />
            </div>
            <div className="field grow">
              <label htmlFor="promo-end">Hasta</label>
              <input id="promo-end" className="input" type="date" min={draft.startsOn} max={addCalendarDays(draft.startsOn || today, RULES.promoMaxDays - 1)} value={draft.endsOn} onChange={(e) => setDraft({ ...draft, endsOn: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={!draft.title.trim()} onClick={save}>{draft.id ? 'Guardar cambios' : 'Publicar promoción'}</button>
        </Sheet>
      )}
    </div>
  );
}
