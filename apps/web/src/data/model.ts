// Modelo de datos de la app. Refleja las tablas de supabase/migrations;
// las fechas se guardan como milisegundos para poder persistir el estado de la demo.
import type { AvailabilityRule, Plan, ReservationStatus, SubscriptionStatus, VideoStatus } from '@platto/core';

export type Role = 'diner' | 'restaurant' | 'admin';

export interface Person {
  id: string;
  name: string;
  phone: string;
}

export interface RestaurantRow {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  zone: string;
  address: string;
  priceLevel: 1 | 2 | 3 | 4;
  description: string;
  timezone: string;
  status: 'draft' | 'active' | 'suspended';
  reservationsEnabled: boolean;
  /** Plato cuyo video se usa como portada. */
  coverDishId: string | null;
}

export interface SubscriptionRow {
  restaurantId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: number;
  graceUntil: number | null;
}

export interface CategoryRow {
  id: string;
  restaurantId: string;
  name: string;
  position: number;
}

export interface VideoFile {
  src: string;
  poster: string | null;
  duration: number;
  /** Segundo del clip original donde empieza la ventana de 10 s. */
  trimStart: number;
}

export interface DishRow {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCop: number;
  tags: string[];
  isAvailable: boolean;
  position: number;
  video: VideoFile | null;
  candidate: VideoFile | null;
  videoStatus: VideoStatus;
  reviewNote: string | null;
}

export interface ReservationRow {
  id: string;
  restaurantId: string;
  dinerId: string;
  startsAt: number;
  partySize: number;
  note: string | null;
  status: ReservationStatus;
  expiresAt: number;
  createdAt: number;
  respondedAt: number | null;
}

export interface ReviewRow {
  id: string;
  reservationId: string;
  restaurantId: string;
  dinerId: string;
  authorName: string;
  rating: number;
  comment: string | null;
  tags: string[];
  dishIds: string[];
  reply: string | null;
  hidden: boolean;
  reported: boolean;
  createdAt: number;
}

export interface ViewRow {
  dishId: string;
  restaurantId: string;
  seconds: number;
  at: number;
}

export interface NotificationRow {
  id: string;
  /** 'diner' | 'admin' | id de restaurante */
  to: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
}

export interface DemoState {
  version: number;
  /** Minutos que se adelantó el reloj de la demo. */
  clockOffsetMin: number;
  role: Role;
  dinerId: string;
  ownerRestaurantId: string;
  people: Person[];
  restaurants: RestaurantRow[];
  subscriptions: SubscriptionRow[];
  categories: CategoryRow[];
  dishes: DishRow[];
  rules: AvailabilityRule[];
  blackouts: { restaurantId: string; day: string }[];
  reservations: ReservationRow[];
  reviews: ReviewRow[];
  views: ViewRow[];
  saved: string[];
  notifications: NotificationRow[];
  /** Ya vio la bienvenida de la demo. */
  welcomed: boolean;
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
