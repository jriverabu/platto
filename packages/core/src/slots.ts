/**
 * Cálculo de franjas reservables. Es la misma lógica que la función
 * public.get_available_slots de la base de datos; la app la usa para
 * mostrar horarios al instante y la base de datos tiene la última palabra.
 */
import { RULES } from './rules';
import { addCalendarDays, addMinutes, formatClock, localParts, parseClock, weekdayOf, zonedToUtc } from './time';
import type { AvailabilityRule, ReservationStatus } from './types';

/** Estados que ocupan cupo en una franja. */
export const HOLDING_STATUSES: ReadonlySet<ReservationStatus> = new Set(['pending', 'confirmed']);

export interface ExistingBooking {
  startsAt: Date;
  partySize: number;
  status: ReservationStatus;
}

export interface SlotQuery {
  /** Día local del restaurante, "YYYY-MM-DD". */
  date: string;
  timeZone: string;
  rules: AvailabilityRule[];
  /** Fechas cerradas, "YYYY-MM-DD". */
  blackoutDates: string[];
  bookings: ExistingBooking[];
  partySize: number;
  now: Date;
}

export type SlotUnavailableReason = 'full' | 'too_soon' | 'past';

export interface Slot {
  startsAt: Date;
  /** "HH:MM" local. */
  clock: string;
  capacity: number;
  remaining: number;
  available: boolean;
  reason: SlotUnavailableReason | null;
}

export function generateSlots(query: SlotQuery): Slot[] {
  const { date, timeZone, rules, blackoutDates, bookings, partySize, now } = query;
  if (blackoutDates.includes(date)) return [];

  const weekday = weekdayOf(date);
  const earliest = addMinutes(now, RULES.minLeadMinutes);
  const byClock = new Map<string, Slot>();

  for (const rule of rules) {
    if (rule.weekday !== weekday) continue;
    const start = parseClock(rule.startTime);
    const end = parseClock(rule.endTime);
    for (let minute = start; minute < end; minute += rule.slotMinutes) {
      const clock = formatClock(minute);
      const startsAt = zonedToUtc(date, clock, timeZone);
      const taken = bookings
        .filter((b) => HOLDING_STATUSES.has(b.status) && b.startsAt.getTime() === startsAt.getTime())
        .reduce((sum, b) => sum + b.partySize, 0);
      const remaining = Math.max(0, rule.capacityPeople - taken);

      let reason: SlotUnavailableReason | null = null;
      if (startsAt.getTime() <= now.getTime()) reason = 'past';
      else if (startsAt.getTime() < earliest.getTime()) reason = 'too_soon';
      else if (remaining < partySize) reason = 'full';

      const slot: Slot = {
        startsAt,
        clock,
        capacity: rule.capacityPeople,
        remaining,
        available: reason === null,
        reason,
      };
      // Si dos reglas se cruzan en la misma hora, gana la de mayor capacidad.
      const previous = byClock.get(clock);
      if (!previous || previous.capacity < slot.capacity) byClock.set(clock, slot);
    }
  }

  return [...byClock.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Los próximos días reservables, empezando por hoy en la zona del restaurante. */
export function bookableDates(now: Date, timeZone: string, days = 14): string[] {
  const today = localParts(now, timeZone).date;
  const count = Math.min(days, RULES.bookingHorizonDays);
  return Array.from({ length: count }, (_, i) => addCalendarDays(today, i));
}

/** Primera franja disponible hoy, para el texto "Hoy hay mesas desde…". */
export function firstAvailableToday(query: Omit<SlotQuery, 'date'>): Slot | null {
  const today = localParts(query.now, query.timeZone).date;
  return generateSlots({ ...query, date: today }).find((s) => s.available) ?? null;
}
