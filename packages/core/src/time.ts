/**
 * Utilidades de fecha y hora sin dependencias.
 * Las reservas se guardan en UTC (timestamptz) y se muestran en la zona del restaurante.
 */

const MINUTE_MS = 60_000;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function addDays(date: Date, days: number): Date {
  return addMinutes(date, days * 24 * 60);
}

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MINUTE_MS;
}

/** "HH:MM" → minutos desde la medianoche. */
export function parseClock(clock: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match) throw new Error(`Hora inválida: ${clock}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) {
    throw new Error(`Hora inválida: ${clock}`);
  }
  return hours * 60 + minutes;
}

/** Minutos desde la medianoche → "HH:MM". */
export function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseIsoDate(isoDate: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Fecha inválida: ${isoDate}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Día de la semana de una fecha de calendario: 0 = domingo … 6 = sábado. */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = parseIsoDate(isoDate);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

interface LocalParts {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  time: string;
  weekday: number;
}

function partsIn(instant: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) out[part.type] = part.value;
  return out;
}

/** Diferencia en minutos entre la hora local de `timeZone` y UTC en ese instante. */
export function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = partsIn(instant, timeZone);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  const instantSeconds = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - instantSeconds) / MINUTE_MS);
}

/** Fecha y hora locales de un restaurante → instante UTC. */
export function zonedToUtc(isoDate: string, clock: string, timeZone: string): Date {
  const [y, m, d] = parseIsoDate(isoDate);
  const minutes = parseClock(clock);
  const naive = Date.UTC(y, m - 1, d, 0, minutes);
  const firstGuess = naive - timeZoneOffsetMinutes(new Date(naive), timeZone) * MINUTE_MS;
  const offset = timeZoneOffsetMinutes(new Date(firstGuess), timeZone);
  return new Date(naive - offset * MINUTE_MS);
}

/** Instante → fecha, hora y día de la semana en la zona indicada. */
export function localParts(instant: Date, timeZone: string): LocalParts {
  const p = partsIn(instant, timeZone);
  const date = `${p.year}-${p.month}-${p.day}`;
  return {
    date,
    time: `${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`,
    weekday: weekdayOf(date),
  };
}

/** Suma días a una fecha de calendario "YYYY-MM-DD". */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = parseIsoDate(isoDate);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}
