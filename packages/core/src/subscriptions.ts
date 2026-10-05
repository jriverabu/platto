/**
 * Un restaurante aparece en Platto solo si su suscripción está al día
 * (o dentro de los 7 días de gracia después de un pago fallido).
 */
import { RULES } from './rules';
import { addDays } from './time';
import type { Plan, Subscription, SubscriptionStatus } from './types';

export function isListed(subscription: Pick<Subscription, 'status' | 'graceUntil'> | null, now: Date): boolean {
  if (!subscription) return false;
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return true;
    case 'past_due':
      return subscription.graceUntil !== null && now.getTime() < subscription.graceUntil.getTime();
    default:
      return false;
  }
}

export function graceUntilFor(failedAt: Date): Date {
  return addDays(failedAt, RULES.subscriptionGraceDays);
}

export interface PlanInfo {
  id: Plan;
  name: string;
  /** Máximo de platos con video; null = ilimitado. */
  maxDishes: number | null;
  featured: boolean;
  analytics: boolean;
  features: string[];
}

/**
 * Precios en COP pendientes de validar con los restaurantes del piloto
 * (ver docs/plan). Se configuran en la tabla `plans`, no en el código.
 */
export const PLANS: Record<Plan, PlanInfo> = {
  esencial: {
    id: 'esencial',
    name: 'Esencial',
    maxDishes: 30,
    featured: false,
    analytics: false,
    features: ['Perfil y menú en video', 'Hasta 30 platos', 'Reservas ilimitadas', 'Calificaciones verificadas'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    maxDishes: null,
    featured: true,
    analytics: true,
    features: [
      'Platos ilimitados con video',
      'Posición destacada en Descubrir',
      'Vistas por plato y reservas por mes',
      'Grabación profesional cada trimestre',
    ],
  },
};

export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  trialing: 'Periodo de prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
};
