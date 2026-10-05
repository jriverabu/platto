/**
 * Calificaciones verificadas: solo califica quien tuvo una reserva completada,
 * entre 2 horas y 14 días después de la hora reservada, una sola vez.
 */
import { RULES } from './rules';
import { addDays, addMinutes } from './time';
import { fail, ok, type Reservation, type Result } from './types';

export const REVIEW_ERRORS = {
  notCompleted: ['REVIEW_NOT_ALLOWED', 'Solo puedes calificar visitas que el restaurante marcó como completadas.'],
  notOpen: ['REVIEW_NOT_OPEN_YET', `Podrás calificar ${RULES.reviewOpensAfterMinutes / 60} horas después de tu reserva.`],
  closed: ['REVIEW_WINDOW_CLOSED', `El plazo para calificar es de ${RULES.reviewClosesAfterDays} días.`],
  exists: ['REVIEW_EXISTS', 'Ya calificaste esta visita.'],
  rating: ['INVALID_RATING', 'La calificación va de 1 a 5.'],
  comment: ['COMMENT_TOO_LONG', `El comentario puede tener hasta ${RULES.reviewCommentMax} caracteres.`],
} as const;

export function reviewWindow(startsAt: Date): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: addMinutes(startsAt, RULES.reviewOpensAfterMinutes),
    closesAt: addDays(startsAt, RULES.reviewClosesAfterDays),
  };
}

export function canReview(
  reservation: Pick<Reservation, 'status' | 'startsAt'>,
  now: Date,
  alreadyReviewed: boolean,
): Result<true> {
  const e = (entry: readonly [string, string]) => fail<true>(entry[0], entry[1]);
  if (alreadyReviewed) return e(REVIEW_ERRORS.exists);
  if (reservation.status !== 'completed') return e(REVIEW_ERRORS.notCompleted);
  const { opensAt, closesAt } = reviewWindow(reservation.startsAt);
  if (now.getTime() < opensAt.getTime()) return e(REVIEW_ERRORS.notOpen);
  if (now.getTime() > closesAt.getTime()) return e(REVIEW_ERRORS.closed);
  return ok(true);
}

export function validateReviewInput(input: { rating: number; comment?: string | null }): Result<true> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return fail(REVIEW_ERRORS.rating[0], REVIEW_ERRORS.rating[1]);
  }
  if ((input.comment ?? '').length > RULES.reviewCommentMax) {
    return fail(REVIEW_ERRORS.comment[0], REVIEW_ERRORS.comment[1]);
  }
  return ok(true);
}

export interface RatingSummary {
  count: number;
  /** null mientras haya menos de 5 reseñas: no se muestra promedio. */
  average: number | null;
  /** Cuántas reseñas tiene cada puntaje, índice 0 = 1 estrella. */
  distribution: [number, number, number, number, number];
}

export function summarizeRatings(ratings: number[]): RatingSummary {
  const distribution: RatingSummary['distribution'] = [0, 0, 0, 0, 0];
  for (const r of ratings) {
    if (r >= 1 && r <= 5) distribution[r - 1] = (distribution[r - 1] ?? 0) + 1;
  }
  const valid = distribution.reduce((a, b) => a + b, 0);
  const sum = distribution.reduce((acc, n, i) => acc + n * (i + 1), 0);
  return {
    count: valid,
    average: valid >= RULES.minReviewsForAverage ? Math.round((sum / valid) * 10) / 10 : null,
    distribution,
  };
}

export const RATING_LABELS = ['', 'Flojo', 'Regular', 'Bien', 'Muy bien', 'Volvería mañana'] as const;

export const REVIEW_TAGS = ['Sabor', 'Porción', 'Servicio', 'Ambiente', 'Rapidez', 'Precio justo'] as const;
