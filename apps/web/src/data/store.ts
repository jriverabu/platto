// Backend de demostración: aplica las mismas reglas que la base de datos
// (packages/core) sobre datos en memoria, para que la app funcione sin cuentas.
// Las tres vistas (comensal, restaurante, admin) comparten este estado, así que
// una reserva hecha como comensal aparece al instante en el panel del restaurante.
import { useSyncExternalStore } from 'react';
import {
  RULES,
  canReview,
  cancel as cancelRule,
  computeExpiresAt,
  effectiveStatus,
  generateSlots,
  graceUntilFor,
  isListed,
  localParts,
  markAttendance as attendanceRule,
  respond as respondRule,
  summarizeRatings,
  validateNewReservation,
  validateReviewInput,
  type Plan,
  type Slot,
} from '@platto/core';
import { AppError, type DemoState, type DishRow, type ReservationRow, type ReviewRow, type Role, type VideoFile } from './model';
import { DEMO_VERSION, TZ, buildSeed } from './seed';

const STORAGE_KEY = 'platto-demo';
const MIN = 60_000;

// ---------------------------------------------------------------------------
// Estado y persistencia
// ---------------------------------------------------------------------------
function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === DEMO_VERSION) return dropDeadBlobs(parsed);
    }
  } catch {
    // Sin almacenamiento (ventana privada, vista previa): la demo empieza limpia.
  }
  return buildSeed(Date.now());
}

/** Los videos subidos en la demo viven en memoria del navegador; tras recargar ya no existen. */
function dropDeadBlobs(state: DemoState): DemoState {
  return {
    ...state,
    dishes: state.dishes.map((d) => {
      const dead = (v: VideoFile | null) => v?.src.startsWith('blob:') ?? false;
      if (!dead(d.video) && !dead(d.candidate)) return d;
      return {
        ...d,
        video: dead(d.video) ? null : d.video,
        candidate: null,
        videoStatus: dead(d.video) || d.videoStatus !== 'approved' ? 'none' : d.videoStatus,
      };
    }),
  };
}

let state: DemoState = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento */
  }
}

function set(mutator: (draft: DemoState) => DemoState) {
  state = sweep(mutator(state));
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/** Estado completo de la demo; los componentes derivan lo que necesitan. */
export function useDemo(): DemoState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Hora actual de la demo (puede ir adelantada para mostrar flujos que toman horas). */
export function now(): number {
  return Date.now() + state.clockOffsetMin * MIN;
}

let idCounter = 0;
function newId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function notify(draft: DemoState, to: string, title: string, body: string): DemoState {
  return {
    ...draft,
    notifications: [{ id: newId('n'), to, title, body, at: now(), read: false }, ...draft.notifications].slice(0, 60),
  };
}

/** Vence las solicitudes sin respuesta (en producción lo hace pg_cron cada 5 minutos). */
function sweep(draft: DemoState): DemoState {
  const t = now();
  let next = draft;
  for (const r of draft.reservations) {
    if (r.status === 'pending' && r.expiresAt <= t) {
      next = {
        ...next,
        reservations: next.reservations.map((x) => (x.id === r.id ? { ...x, status: 'expired' } : x)),
      };
      if (r.dinerId === draft.dinerId) {
        next = notify(next, 'diner', 'Tu solicitud no recibió respuesta', `${restaurantName(draft, r.restaurantId)} no respondió a tiempo.`);
      }
    }
  }
  return next;
}

setInterval(() => {
  const before = state;
  const after = sweep(state);
  if (after !== before) {
    state = after;
    persist();
    listeners.forEach((l) => l());
  }
}, 20_000);

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------
function restaurantName(s: DemoState, id: string) {
  return s.restaurants.find((r) => r.id === id)?.name ?? 'El restaurante';
}

export function isRestaurantListed(s: DemoState, restaurantId: string): boolean {
  const r = s.restaurants.find((x) => x.id === restaurantId);
  if (!r || r.status !== 'active') return false;
  const sub = s.subscriptions.find((x) => x.restaurantId === restaurantId) ?? null;
  return isListed(sub ? { status: sub.status, graceUntil: sub.graceUntil ? new Date(sub.graceUntil) : null } : null, new Date(now()));
}

export function ratingOf(s: DemoState, restaurantId: string) {
  return summarizeRatings(s.reviews.filter((r) => r.restaurantId === restaurantId && !r.hidden).map((r) => r.rating));
}

export function featured(s: DemoState, restaurantId: string) {
  return s.subscriptions.find((x) => x.restaurantId === restaurantId)?.plan === 'pro';
}

export interface FeedItem {
  dish: DishRow;
  restaurant: DemoState['restaurants'][number];
}

/** Feed de Descubrir: platos con video aprobado de restaurantes visibles; Pro primero. */
export function selectFeed(s: DemoState, zone: string | null): FeedItem[] {
  const items = s.dishes
    .filter((d) => d.video && d.isAvailable && isRestaurantListed(s, d.restaurantId))
    .map((dish) => ({ dish, restaurant: s.restaurants.find((r) => r.id === dish.restaurantId)! }))
    .filter((i) => !zone || i.restaurant.zone === zone);
  const day = new Date(now()).toISOString().slice(0, 10);
  const shuffleKey = (id: string) => {
    let h = 0;
    for (const c of id + day) h = (h * 31 + c.charCodeAt(0)) | 0;
    return h;
  };
  return items.sort(
    (a, b) =>
      Number(featured(s, b.restaurant.id)) - Number(featured(s, a.restaurant.id)) ||
      shuffleKey(a.dish.id) - shuffleKey(b.dish.id),
  );
}

export function slotsFor(s: DemoState, restaurantId: string, date: string, partySize: number): Slot[] {
  if (!isRestaurantListed(s, restaurantId)) return [];
  const restaurant = s.restaurants.find((r) => r.id === restaurantId)!;
  return generateSlots({
    date,
    timeZone: restaurant.timezone,
    rules: s.rules.filter((r) => r.restaurantId === restaurantId),
    blackoutDates: s.blackouts.filter((b) => b.restaurantId === restaurantId).map((b) => b.day),
    bookings: s.reservations
      .filter((r) => r.restaurantId === restaurantId)
      .map((r) => ({
        startsAt: new Date(r.startsAt),
        partySize: r.partySize,
        status: effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(now())),
      })),
    partySize,
    now: new Date(now()),
  });
}

export function reviewFor(s: DemoState, reservationId: string): ReviewRow | undefined {
  return s.reviews.find((r) => r.reservationId === reservationId);
}

export function canReviewReservation(s: DemoState, r: ReservationRow) {
  return canReview({ status: r.status, startsAt: new Date(r.startsAt) }, new Date(now()), Boolean(reviewFor(s, r.id)));
}

// ---------------------------------------------------------------------------
// Acciones del comensal
// ---------------------------------------------------------------------------
function fail(code: string, message: string): never {
  throw new AppError(code, message);
}

export function createReservation(input: { restaurantId: string; startsAt: number; partySize: number; note: string }) {
  const s = state;
  const t = now();
  const restaurant = s.restaurants.find((r) => r.id === input.restaurantId);
  if (!restaurant || !isRestaurantListed(s, restaurant.id) || !restaurant.reservationsEnabled) {
    fail('RESTAURANT_NOT_BOOKABLE', 'Este restaurante no está recibiendo reservas en este momento.');
  }
  const check = validateNewReservation({ startsAt: new Date(input.startsAt), partySize: input.partySize, now: new Date(t) });
  if (!check.ok) fail(check.error.code, check.error.message);

  const local = localParts(new Date(input.startsAt), restaurant.timezone).date;
  const slot = slotsFor(s, restaurant.id, local, input.partySize).find((x) => x.startsAt.getTime() === input.startsAt);
  if (!slot) fail('SLOT_NOT_OFFERED', 'Ese horario no está disponible.');
  if (!slot.available) fail('SLOT_FULL', 'Ya no hay cupo para ese horario. Elige otro.');
  const duplicate = s.reservations.some(
    (r) =>
      r.dinerId === s.dinerId &&
      r.restaurantId === restaurant.id &&
      r.startsAt === input.startsAt &&
      ['pending', 'confirmed'].includes(effectiveStatus({ status: r.status, expiresAt: new Date(r.expiresAt) }, new Date(t))),
  );
  if (duplicate) fail('DUPLICATE_RESERVATION', 'Ya tienes una reserva a esa hora.');

  const row: ReservationRow = {
    id: newId('res'),
    restaurantId: restaurant.id,
    dinerId: s.dinerId,
    startsAt: input.startsAt,
    partySize: input.partySize,
    note: input.note.trim() || null,
    status: 'pending',
    createdAt: t,
    expiresAt: computeExpiresAt(new Date(t), new Date(input.startsAt)).getTime(),
    respondedAt: null,
  };
  set((d) => notify({ ...d, reservations: [...d.reservations, row] }, restaurant.id, 'Nueva solicitud de reserva', `Mesa para ${row.partySize} · ${dinerName(d, row.dinerId)}`));
  return row;
}

function dinerName(s: DemoState, id: string) {
  return s.people.find((p) => p.id === id)?.name ?? 'Comensal';
}

export function cancelReservation(id: string) {
  const r = state.reservations.find((x) => x.id === id);
  if (!r) fail('NOT_FOUND', 'Reserva no encontrada.');
  const result = cancelRule({ status: r.status, startsAt: new Date(r.startsAt), expiresAt: new Date(r.expiresAt) }, new Date(now()));
  if (!result.ok) fail(result.error.code, result.error.message);
  set((d) =>
    notify(
      { ...d, reservations: d.reservations.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) },
      r.restaurantId,
      'Reserva cancelada',
      `${dinerName(d, r.dinerId)} canceló su mesa para ${r.partySize}.`,
    ),
  );
}

export function submitReview(input: { reservationId: string; rating: number; comment: string; tags: string[]; dishIds: string[] }) {
  const r = state.reservations.find((x) => x.id === input.reservationId);
  if (!r || r.dinerId !== state.dinerId) fail('REVIEW_NOT_ALLOWED', 'Solo calificas tus propias visitas.');
  const allowed = canReviewReservation(state, r);
  if (!allowed.ok) fail(allowed.error.code, allowed.error.message);
  const valid = validateReviewInput({ rating: input.rating, comment: input.comment });
  if (!valid.ok) fail(valid.error.code, valid.error.message);
  const [first, last] = dinerName(state, r.dinerId).split(' ');
  const review: ReviewRow = {
    id: newId('rev'),
    reservationId: r.id,
    restaurantId: r.restaurantId,
    dinerId: r.dinerId,
    authorName: `${first} ${last ? `${last[0]}.` : ''}`.trim(),
    rating: input.rating,
    comment: input.comment.trim() || null,
    tags: input.tags,
    dishIds: input.dishIds.filter((id) => state.dishes.some((d) => d.id === id && d.restaurantId === r.restaurantId)),
    reply: null,
    hidden: false,
    reported: false,
    createdAt: now(),
  };
  set((d) => notify({ ...d, reviews: [review, ...d.reviews] }, r.restaurantId, `Nueva calificación: ${review.rating} de 5`, review.comment ?? 'Sin comentario.'));
}

export function toggleSaved(dishId: string) {
  set((d) => ({ ...d, saved: d.saved.includes(dishId) ? d.saved.filter((x) => x !== dishId) : [...d.saved, dishId] }));
}

export function logView(dishId: string, seconds: number) {
  const dish = state.dishes.find((d) => d.id === dishId);
  if (!dish || seconds < 1) return;
  set((d) => ({ ...d, views: [...d.views, { dishId, restaurantId: dish.restaurantId, seconds: Math.min(RULES.videoMaxSeconds, Math.round(seconds * 10) / 10), at: now() }] }));
}

export function reportReview(id: string) {
  set((d) => notify({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, reported: true } : r)) }, 'admin', 'Reseña reportada', 'Revisa la reseña en el panel de moderación.'));
}

// ---------------------------------------------------------------------------
// Acciones del restaurante
// ---------------------------------------------------------------------------
export function respondReservation(id: string, accept: boolean) {
  const r = state.reservations.find((x) => x.id === id);
  if (!r) fail('NOT_FOUND', 'Reserva no encontrada.');
  const result = respondRule({ status: r.status, expiresAt: new Date(r.expiresAt) }, accept, new Date(now()));
  if (!result.ok) fail(result.error.code, result.error.message);
  const name = restaurantName(state, r.restaurantId);
  set((d) => {
    const next = { ...d, reservations: d.reservations.map((x) => (x.id === id ? { ...x, status: result.value, respondedAt: now() } : x)) };
    if (r.dinerId !== d.dinerId) return next;
    return accept
      ? notify(next, 'diner', '¡Tu mesa está confirmada!', `${name} te espera. Mesa para ${r.partySize}.`)
      : notify(next, 'diner', 'No hay mesa para ese horario', `${name} no pudo recibirte. Mira otros horarios.`);
  });
}

export function markAttendance(id: string, arrived: boolean) {
  const r = state.reservations.find((x) => x.id === id);
  if (!r) fail('NOT_FOUND', 'Reserva no encontrada.');
  const result = attendanceRule({ status: r.status, startsAt: new Date(r.startsAt) }, arrived, new Date(now()));
  if (!result.ok) fail(result.error.code, result.error.message);
  set((d) => {
    const next = { ...d, reservations: d.reservations.map((x) => (x.id === id ? { ...x, status: result.value } : x)) };
    return arrived && r.dinerId === d.dinerId
      ? notify(next, 'diner', `¿Cómo estuvo ${restaurantName(d, r.restaurantId)}?`, 'Podrás calificar tu visita 2 horas después de tu reserva.')
      : next;
  });
}

export function replyReview(id: string, text: string) {
  const review = state.reviews.find((r) => r.id === id);
  if (!review) fail('NOT_FOUND', 'Reseña no encontrada.');
  if (review.reply) fail('REPLY_EXISTS', 'Ya respondiste esta reseña.');
  const reply = text.trim();
  if (!reply || reply.length > 500) fail('INVALID_REPLY', 'La respuesta debe tener entre 1 y 500 caracteres.');
  set((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, reply } : r)) }));
}

export function setReservationsEnabled(restaurantId: string, enabled: boolean) {
  set((d) => ({ ...d, restaurants: d.restaurants.map((r) => (r.id === restaurantId ? { ...r, reservationsEnabled: enabled } : r)) }));
}

export interface DishInput {
  id?: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCop: number;
  tags: string[];
  isAvailable: boolean;
}

export function saveDish(input: DishInput): string {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) fail('INVALID_NAME', 'El nombre debe tener entre 2 y 60 caracteres.');
  if (!Number.isFinite(input.priceCop) || input.priceCop < 0 || input.priceCop > 10_000_000) fail('INVALID_PRICE', 'Revisa el precio.');
  if (input.description.length > 240) fail('INVALID_DESCRIPTION', 'La descripción puede tener hasta 240 caracteres.');
  if (input.id) {
    set((d) => ({ ...d, dishes: d.dishes.map((x) => (x.id === input.id ? { ...x, ...input, name } : x)) }));
    return input.id;
  }
  const sub = state.subscriptions.find((x) => x.restaurantId === input.restaurantId);
  const limit = sub?.plan === 'esencial' ? 30 : null;
  if (limit !== null && state.dishes.filter((x) => x.restaurantId === input.restaurantId).length >= limit) {
    fail('PLAN_LIMIT', `Tu plan permite hasta ${limit} platos. Pásate a Pro para tener platos ilimitados.`);
  }
  const id = newId('d');
  const row: DishRow = {
    id,
    ...input,
    name,
    position: state.dishes.filter((x) => x.categoryId === input.categoryId).length + 1,
    video: null,
    candidate: null,
    videoStatus: 'none',
    reviewNote: null,
  };
  set((d) => ({ ...d, dishes: [...d.dishes, row] }));
  return id;
}

export function deleteDish(id: string) {
  set((d) => ({
    ...d,
    dishes: d.dishes.filter((x) => x.id !== id),
    restaurants: d.restaurants.map((r) => (r.coverDishId === id ? { ...r, coverDishId: null } : r)),
  }));
}

export function addCategory(restaurantId: string, name: string): string {
  const clean = name.trim();
  if (!clean || clean.length > 40) fail('INVALID_NAME', 'El nombre de la categoría debe tener entre 1 y 40 caracteres.');
  if (state.categories.some((c) => c.restaurantId === restaurantId && c.name.toLowerCase() === clean.toLowerCase())) {
    fail('DUPLICATE', 'Ya existe esa categoría.');
  }
  const id = newId('c');
  set((d) => ({
    ...d,
    categories: [...d.categories, { id, restaurantId, name: clean, position: d.categories.filter((c) => c.restaurantId === restaurantId).length + 1 }],
  }));
  return id;
}

/**
 * Sube un video. En producción: video-upload-url → Cloudflare Stream → stream-webhook.
 * En la demo el "procesamiento" toma 2 segundos y el plato queda en revisión.
 */
export function uploadDishVideo(dishId: string, file: VideoFile) {
  const dish = state.dishes.find((d) => d.id === dishId);
  if (!dish) fail('NOT_FOUND', 'Plato no encontrado.');
  set((d) => ({ ...d, dishes: d.dishes.map((x) => (x.id === dishId ? { ...x, candidate: file, videoStatus: 'processing', reviewNote: null } : x)) }));
  setTimeout(() => {
    set((d) =>
      notify(
        { ...d, dishes: d.dishes.map((x) => (x.id === dishId && x.videoStatus === 'processing' ? { ...x, videoStatus: 'in_review' } : x)) },
        'admin',
        'Video para revisar',
        `${restaurantName(d, dish.restaurantId)} · ${dish.name}`,
      ),
    );
  }, 2000);
}

export function setRule(restaurantId: string, weekday: number, block: 'a' | 'c', patch: { enabled?: boolean; capacity?: number }) {
  const id = `${restaurantId}-${weekday}-${block}`;
  set((d) => {
    const existing = d.rules.find((r) => r.id === id);
    if (patch.enabled === false) return { ...d, rules: d.rules.filter((r) => r.id !== id) };
    if (!existing) {
      return {
        ...d,
        rules: [
          ...d.rules,
          {
            id,
            restaurantId,
            weekday,
            startTime: block === 'a' ? '12:00' : '18:30',
            endTime: block === 'a' ? '15:30' : '22:00',
            slotMinutes: 30,
            capacityPeople: patch.capacity ?? 12,
          },
        ],
      };
    }
    return { ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, capacityPeople: Math.max(1, Math.min(500, patch.capacity ?? r.capacityPeople)) } : r)) };
  });
}

export function toggleBlackout(restaurantId: string, day: string) {
  set((d) => {
    const exists = d.blackouts.some((b) => b.restaurantId === restaurantId && b.day === day);
    return {
      ...d,
      blackouts: exists ? d.blackouts.filter((b) => !(b.restaurantId === restaurantId && b.day === day)) : [...d.blackouts, { restaurantId, day }],
    };
  });
}

/** En producción: subscription-checkout abre Mercado Pago y payments-webhook activa el plan. */
export function changePlan(restaurantId: string, plan: Plan) {
  set((d) =>
    notify(
      {
        ...d,
        subscriptions: d.subscriptions.map((s) =>
          s.restaurantId === restaurantId ? { ...s, plan, status: 'active', graceUntil: null, currentPeriodEnd: now() + 30 * 24 * 60 * MIN } : s,
        ),
      },
      restaurantId,
      'Suscripción actualizada',
      `Tu plan ahora es ${plan === 'pro' ? 'Pro' : 'Esencial'}.`,
    ),
  );
}

// ---------------------------------------------------------------------------
// Acciones del administrador
// ---------------------------------------------------------------------------
export function reviewVideo(dishId: string, approve: boolean, note: string) {
  const dish = state.dishes.find((d) => d.id === dishId);
  if (!dish || dish.videoStatus !== 'in_review' || !dish.candidate) fail('NOTHING_TO_REVIEW', 'Este plato no tiene un video en revisión.');
  set((d) => {
    const dishes = d.dishes.map((x) =>
      x.id !== dishId
        ? x
        : approve
          ? { ...x, video: x.candidate, candidate: null, videoStatus: 'approved' as const, reviewNote: null }
          : { ...x, videoStatus: 'rejected' as const, reviewNote: note.trim() || 'No cumple el estándar visual.' },
    );
    const restaurants = d.restaurants.map((r) => (r.id === dish.restaurantId && !r.coverDishId && approve ? { ...r, coverDishId: dishId } : r));
    return notify(
      { ...d, dishes, restaurants },
      dish.restaurantId,
      approve ? 'Tu video ya está publicado' : 'Tu video necesita cambios',
      approve ? `${dish.name} ya se ve en Platto.` : `${dish.name}: ${note.trim() || 'No cumple el estándar visual.'}`,
    );
  });
}

export function setRestaurantStatus(restaurantId: string, status: 'active' | 'suspended') {
  set((d) => ({ ...d, restaurants: d.restaurants.map((r) => (r.id === restaurantId ? { ...r, status } : r)) }));
}

export function simulatePaymentFailure(restaurantId: string) {
  set((d) =>
    notify(
      {
        ...d,
        subscriptions: d.subscriptions.map((s) =>
          s.restaurantId === restaurantId ? { ...s, status: 'past_due', graceUntil: graceUntilFor(new Date(now())).getTime() } : s,
        ),
      },
      restaurantId,
      'No pudimos cobrar tu suscripción',
      `Tienes ${RULES.subscriptionGraceDays} días para actualizar tu medio de pago.`,
    ),
  );
}

export function markPaid(restaurantId: string) {
  set((d) => ({
    ...d,
    subscriptions: d.subscriptions.map((s) =>
      s.restaurantId === restaurantId ? { ...s, status: 'active', graceUntil: null, currentPeriodEnd: now() + 30 * 24 * 60 * MIN } : s,
    ),
  }));
}

export function setReviewHidden(id: string, hidden: boolean) {
  set((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, hidden, reported: false } : r)) }));
}

// ---------------------------------------------------------------------------
// Controles de la demo
// ---------------------------------------------------------------------------
export function setRole(role: Role) {
  set((d) => ({ ...d, role }));
}

export function advanceClock(minutes: number) {
  set((d) => ({ ...d, clockOffsetMin: d.clockOffsetMin + minutes }));
}

export function markNotificationsRead(to: string) {
  set((d) => ({ ...d, notifications: d.notifications.map((n) => (n.to === to ? { ...n, read: true } : n)) }));
}

export function setWelcomed() {
  set((d) => ({ ...d, welcomed: true }));
}

export function resetDemo() {
  state = buildSeed(Date.now());
  state.welcomed = true;
  persist();
  listeners.forEach((l) => l());
}

export { TZ };
