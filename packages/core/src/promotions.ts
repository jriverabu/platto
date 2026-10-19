/**
 * Promociones que crea el restaurante (solo plan Pro).
 * Una promoción se ve en Inicio, en Explorar y en el perfil del restaurante
 * los días de la semana que el restaurante eligió, entre su fecha de inicio y de fin.
 * La base de datos aplica las mismas reglas (supabase/migrations/20261019000001_promotions.sql).
 */
import { RULES } from './rules';
import { PLANS } from './subscriptions';
import { addCalendarDays, localParts } from './time';
import { fail, ok, type Plan, type Result } from './types';

export interface Promotion {
  id: string;
  restaurantId: string;
  /** Lo que se ve primero: «2x1 en chorizos». */
  title: string;
  /** Condiciones: «Martes y miércoles en la cena. No acumulable.» */
  detail: string | null;
  /** Días de la semana (0 = domingo). Vacío = todos los días. */
  weekdays: number[];
  /** Fechas locales del restaurante, YYYY-MM-DD, ambas incluidas. */
  startsOn: string;
  endsOn: string;
  /** El restaurante puede pausarla sin borrarla. */
  active: boolean;
}

export type PromotionInput = Pick<Promotion, 'title' | 'detail' | 'weekdays' | 'startsOn' | 'endsOn'>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function canUsePromotions(plan: Plan): boolean {
  return PLANS[plan].promotions;
}

/** Revisa una promoción nueva o editada. `today` es la fecha local del restaurante. */
export function validatePromotion(input: PromotionInput, today: string): Result<PromotionInput> {
  const title = input.title.trim();
  const detail = input.detail?.trim() || null;
  if (!title) return fail('PROMO_TITLE_REQUIRED', 'Escribe el nombre de la promoción.');
  if (title.length > RULES.promoTitleMax) return fail('PROMO_TITLE_TOO_LONG', `El nombre puede tener hasta ${RULES.promoTitleMax} caracteres.`);
  if (detail && detail.length > RULES.promoDetailMax) return fail('PROMO_DETAIL_TOO_LONG', `Las condiciones pueden tener hasta ${RULES.promoDetailMax} caracteres.`);
  if (!DATE.test(input.startsOn) || !DATE.test(input.endsOn)) return fail('PROMO_DATES_INVALID', 'Revisa las fechas.');
  if (input.endsOn < input.startsOn) return fail('PROMO_DATES_INVALID', 'La fecha final debe ser igual o posterior a la inicial.');
  if (input.endsOn < today) return fail('PROMO_ENDED', 'La promoción ya terminó. Elige una fecha final desde hoy.');
  if (input.endsOn > addCalendarDays(input.startsOn, RULES.promoMaxDays - 1)) {
    return fail('PROMO_TOO_LONG', `Una promoción puede durar hasta ${RULES.promoMaxDays} días.`);
  }
  const weekdays = [...new Set(input.weekdays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  return ok({ title, detail, weekdays: weekdays.length === 7 ? [] : weekdays, startsOn: input.startsOn, endsOn: input.endsOn });
}

/** Cuenta para el límite de promociones activas: encendida y sin terminar. */
export function countsTowardPromoLimit(p: Pick<Promotion, 'active' | 'endsOn'>, today: string): boolean {
  return p.active && p.endsOn >= today;
}

/** ¿Se muestra ahora? Requiere plan Pro, que esté encendida, dentro de fechas y en uno de sus días. */
export function isPromotionLive(p: Promotion, plan: Plan | null, now: Date, timeZone: string): boolean {
  if (!plan || !canUsePromotions(plan) || !p.active) return false;
  const { date, weekday } = localParts(now, timeZone);
  if (date < p.startsOn || date > p.endsOn) return false;
  return p.weekdays.length === 0 || p.weekdays.includes(weekday);
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** [] → "Todos los días", [2,3] → "Martes y miércoles", [1,3,5] → "Lun, mié y vie" */
export function formatPromoDays(weekdays: number[]): string {
  const days = [...new Set(weekdays)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
  if (days.length === 0 || days.length === 7) return 'Todos los días';
  const weekend = days.length === 2 && days.includes(6) && days.includes(0);
  if (weekend) return 'Fines de semana';
  const names = days.length <= 2 ? days.map((d) => DAY_NAMES[d]!) : days.map((d) => DAY_SHORT[d]!);
  const text = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  return text[0]!.toUpperCase() + text.slice(1);
}
