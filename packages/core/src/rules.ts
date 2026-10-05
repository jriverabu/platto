/**
 * Reglas del negocio de Platto en un solo lugar.
 * La base de datos (supabase/migrations) aplica las mismas cifras;
 * si cambias una aquí, cámbiala también allá (ver docs/REGLAS.md).
 */
export const RULES = {
  /** Duración máxima de un video de plato, en segundos. */
  videoMaxSeconds: 10,
  /** Duración mínima para que el video alcance a mostrar el plato. */
  videoMinSeconds: 4,
  /** Relación alto/ancho mínima para considerar un video vertical (9:16 = 1,78). */
  videoMinAspect: 1.7,
  /** Ancho recomendado en píxeles (1080 × 1920). */
  videoRecommendedWidth: 1080,

  /** Tiempo que tiene el restaurante para responder una solicitud. */
  responseWindowMinutes: 120,
  /** Anticipación mínima para pedir una mesa. */
  minLeadMinutes: 60,
  /** El comensal puede cancelar sin penalidad hasta este tiempo antes. */
  cancelCutoffMinutes: 120,
  /** El restaurante puede marcar llegada desde este tiempo antes de la hora. */
  attendanceOpensBeforeMinutes: 30,
  /** Tamaño máximo de una reserva hecha por la app. */
  maxPartySize: 12,
  /** Días hacia adelante que se pueden reservar. */
  bookingHorizonDays: 30,

  /** La calificación se habilita este tiempo después de la hora de la reserva. */
  reviewOpensAfterMinutes: 120,
  /** Y se cierra estos días después. */
  reviewClosesAfterDays: 14,
  /** Caracteres máximos del comentario de una reseña. */
  reviewCommentMax: 300,
  /** Reseñas mínimas para mostrar el promedio público. */
  minReviewsForAverage: 5,

  /** Días de gracia cuando falla un pago antes de ocultar el perfil. */
  subscriptionGraceDays: 7,
} as const;

export type Rules = typeof RULES;
