/**
 * Formatos para Colombia escritos a mano, para que se vean igual en iOS, Android y web
 * (Intl no da el mismo resultado en todos los motores de JavaScript).
 */
import { localParts, parseClock } from './time';

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 46000 → "$46.000" */
export function formatCop(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$${digits}`;
}

/** "20:00" → "8:00 p. m." */
export function formatClock12(clock: string): string {
  const total = parseClock(clock) % (24 * 60);
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours24 < 12 ? 'a. m.' : 'p. m.';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** Instante → "8:00 p. m." en la zona del restaurante. */
export function formatTime(instant: Date, timeZone: string): string {
  return formatClock12(localParts(instant, timeZone).time);
}

/** Instante → "vie 9 oct" en la zona del restaurante. */
export function formatDateShort(instant: Date, timeZone: string): string {
  const { date, weekday } = localParts(instant, timeZone);
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return `${WEEKDAYS_SHORT[weekday]} ${day} ${MONTHS_SHORT[month - 1]}`;
}

/** 3 → "$$$" */
export function formatPriceLevel(level: number): string {
  return '$'.repeat(Math.min(4, Math.max(1, Math.round(level))));
}

/** 4.83 → "4,8" */
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** Minutos → "1 h 32 min", "44 min" */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.ceil(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
