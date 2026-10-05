/**
 * Ciclo de vida de una reserva.
 *
 *   pending ──acepta──▶ confirmed ──llegó──▶ completed ──(2 h)──▶ se puede calificar
 *      │                   │  └──no llegó──▶ no_show
 *      │                   └──comensal cancela──▶ cancelled
 *      ├──rechaza──▶ rejected
 *      ├──2 h sin respuesta──▶ expired
 *      └──comensal cancela──▶ cancelled
 *
 * Las funciones son puras: reciben la reserva y la hora actual y devuelven el
 * nuevo estado o el error. La base de datos aplica las mismas reglas en
 * public.respond_reservation, cancel_reservation y mark_attendance.
 */
import { RULES } from './rules';
import { addMinutes, minutesBetween } from './time';
import { fail, ok, type Reservation, type ReservationStatus, type Result } from './types';

export const ERRORS = {
  notPending: ['RESERVATION_NOT_PENDING', 'Esta reserva ya fue respondida.'],
  expired: ['RESERVATION_EXPIRED', 'La solicitud venció porque no se respondió a tiempo.'],
  notCancellable: ['RESERVATION_NOT_CANCELLABLE', 'Esta reserva ya no se puede cancelar.'],
  cancelTooLate: ['CANCEL_TOO_LATE', `Solo puedes cancelar hasta ${RULES.cancelCutoffMinutes / 60} horas antes.`],
  notConfirmed: ['RESERVATION_NOT_CONFIRMED', 'Solo se marca la llegada de reservas confirmadas.'],
  attendanceTooEarly: ['ATTENDANCE_TOO_EARLY', 'Todavía no es la hora de esta reserva.'],
  invalidParty: ['INVALID_PARTY_SIZE', `La reserva debe ser de 1 a ${RULES.maxPartySize} personas.`],
  tooSoon: ['TOO_SOON', `Las reservas se piden con al menos ${RULES.minLeadMinutes} minutos de anticipación.`],
  tooFar: ['TOO_FAR', `Solo se puede reservar hasta ${RULES.bookingHorizonDays} días adelante.`],
} as const satisfies Record<string, readonly [string, string]>;

function error<T>(entry: readonly [string, string]): Result<T> {
  return fail<T>(entry[0], entry[1]);
}

/** Estados en los que la reserva ya terminó y no cambia más. */
export const FINAL_STATUSES: ReadonlySet<ReservationStatus> = new Set([
  'rejected',
  'expired',
  'cancelled',
  'completed',
  'no_show',
]);

/** Cuándo vence una solicitud nueva: a las 2 h o a la hora de la reserva, lo que pase primero. */
export function computeExpiresAt(createdAt: Date, startsAt: Date): Date {
  const window = addMinutes(createdAt, RULES.responseWindowMinutes);
  return window.getTime() < startsAt.getTime() ? window : startsAt;
}

/** Valida una solicitud nueva antes de enviarla (la base de datos repite la validación). */
export function validateNewReservation(input: { startsAt: Date; partySize: number; now: Date }): Result<true> {
  const { startsAt, partySize, now } = input;
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > RULES.maxPartySize) {
    return error(ERRORS.invalidParty);
  }
  if (minutesBetween(now, startsAt) < RULES.minLeadMinutes) return error(ERRORS.tooSoon);
  if (minutesBetween(now, startsAt) > RULES.bookingHorizonDays * 24 * 60) return error(ERRORS.tooFar);
  return ok(true);
}

/** Estado real considerando el vencimiento, aunque el job de expiración no haya corrido aún. */
export function effectiveStatus(reservation: Pick<Reservation, 'status' | 'expiresAt'>, now: Date): ReservationStatus {
  if (reservation.status === 'pending' && now.getTime() >= reservation.expiresAt.getTime()) return 'expired';
  return reservation.status;
}

/** El restaurante acepta o rechaza. */
export function respond(
  reservation: Pick<Reservation, 'status' | 'expiresAt'>,
  accept: boolean,
  now: Date,
): Result<ReservationStatus> {
  if (reservation.status !== 'pending') return error(ERRORS.notPending);
  if (effectiveStatus(reservation, now) === 'expired') return error(ERRORS.expired);
  return ok(accept ? 'confirmed' : 'rejected');
}

/** El comensal cancela. Pendientes: siempre. Confirmadas: hasta 2 h antes. */
export function cancel(reservation: Pick<Reservation, 'status' | 'startsAt' | 'expiresAt'>, now: Date): Result<ReservationStatus> {
  const status = effectiveStatus(reservation, now);
  if (status === 'pending') return ok('cancelled');
  if (status !== 'confirmed') return error(ERRORS.notCancellable);
  if (minutesBetween(now, reservation.startsAt) < RULES.cancelCutoffMinutes) return error(ERRORS.cancelTooLate);
  return ok('cancelled');
}

/** El restaurante marca si el comensal llegó. */
export function markAttendance(
  reservation: Pick<Reservation, 'status' | 'startsAt'>,
  arrived: boolean,
  now: Date,
): Result<ReservationStatus> {
  if (reservation.status !== 'confirmed') return error(ERRORS.notConfirmed);
  if (minutesBetween(now, reservation.startsAt) > RULES.attendanceOpensBeforeMinutes) {
    return error(ERRORS.attendanceTooEarly);
  }
  return ok(arrived ? 'completed' : 'no_show');
}

/** Minutos que le quedan al restaurante para responder (0 si ya venció). */
export function minutesToRespond(reservation: Pick<Reservation, 'expiresAt'>, now: Date): number {
  return Math.max(0, minutesBetween(now, reservation.expiresAt));
}

/** Texto corto para mostrar el estado. */
export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Esperando confirmación',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  expired: 'Venció sin respuesta',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
};
