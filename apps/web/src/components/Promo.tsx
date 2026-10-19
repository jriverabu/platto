import { formatDateShort, formatPromoDays, type Promotion } from '@platto/core';
import { Icon } from './ui';

/** Fecha local YYYY-MM-DD → "vie 9 oct" (mediodía en Colombia para no cambiar de día). */
export function dayLabel(day: string, timeZone: string) {
  return formatDateShort(new Date(`${day}T17:00:00Z`), timeZone);
}

export function PromoCard({ p, timeZone }: { p: Promotion; timeZone: string }) {
  return (
    <div className="promo">
      <span className="promo-icon" aria-hidden="true"><Icon name="tag" size={18} /></span>
      <span className="stack gap-4 grow" style={{ minWidth: 0 }}>
        <span className="label" style={{ color: 'var(--brand-hi)' }}>Promoción</span>
        <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{p.title}</span>
        {p.detail && <span className="small" style={{ color: 'var(--text-2)', lineHeight: 1.45 }}>{p.detail}</span>}
        <span className="tiny muted">{formatPromoDays(p.weekdays)} · hasta el {dayLabel(p.endsOn, timeZone)}</span>
      </span>
    </div>
  );
}
