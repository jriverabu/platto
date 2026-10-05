/**
 * Tipos que reflejan las tablas de supabase/migrations.
 * Nombres de campos en camelCase; la capa de datos de la app convierte desde snake_case.
 */

export type UserRole = 'diner' | 'restaurant' | 'admin';
export type MemberRole = 'owner' | 'staff';
export type RestaurantStatus = 'draft' | 'active' | 'suspended';
export type VideoStatus = 'none' | 'processing' | 'in_review' | 'approved' | 'rejected';
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'no_show';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type Plan = 'esencial' | 'pro';

export interface Profile {
  id: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  zone: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  /** 1 a 4 ($ a $$$$). */
  priceLevel: 1 | 2 | 3 | 4;
  description: string;
  timezone: string;
  status: RestaurantStatus;
  reservationsEnabled: boolean;
  coverVideoUid: string | null;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  position: number;
}

export interface Dish {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCop: number;
  videoUid: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  videoStatus: VideoStatus;
  tags: string[];
  isAvailable: boolean;
  position: number;
}

/** Una franja de horario en la que el restaurante recibe reservas. */
export interface AvailabilityRule {
  id: string;
  restaurantId: string;
  /** 0 = domingo … 6 = sábado (igual que extract(dow) en Postgres). */
  weekday: number;
  /** "HH:MM" en la hora local del restaurante. */
  startTime: string;
  /** "HH:MM"; la última reserva posible empieza antes de esta hora. */
  endTime: string;
  slotMinutes: number;
  /** Personas que caben por franja. */
  capacityPeople: number;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  dinerId: string;
  startsAt: Date;
  partySize: number;
  note: string | null;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface Review {
  id: string;
  reservationId: string;
  restaurantId: string;
  dinerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  tags: string[];
  dishIds: string[];
  restaurantReply: string | null;
  createdAt: Date;
}

export interface Subscription {
  restaurantId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  graceUntil: Date | null;
}

/** Resultado de una operación que puede fallar por una regla del negocio. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: RuleError };

export interface RuleError {
  /** Código estable, igual al que lanza la base de datos (ERRCODE P0001 + mensaje). */
  code: string;
  /** Mensaje listo para mostrar al usuario, en español. */
  message: string;
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(code: string, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
