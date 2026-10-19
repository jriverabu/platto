import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CITY,
  PLANS,
  canUsePromotions,
  countsTowardPromoLimit,
  distanceKm,
  formatDistance,
  formatPromoDays,
  isPromotionLive,
  referencePoint,
  validatePromotion,
  type Promotion,
} from '../src/index';

const BOGOTA = 'America/Bogota';

describe('distancias', () => {
  it('mide en línea recta entre dos puntos de Cúcuta', () => {
    // Parque Santander → Caobos: unos 1,8 km.
    const km = distanceKm(CITY.center, { lat: 7.8986, lng: -72.496 });
    assert.ok(km > 1.6 && km < 2.0, `dio ${km}`);
    assert.equal(distanceKm(CITY.center, CITY.center), 0);
  });

  it('formatea metros y kilómetros', () => {
    assert.equal(formatDistance(0.012), '50 m');
    assert.equal(formatDistance(0.34), '350 m');
    assert.equal(formatDistance(1.24), '1,2 km');
    assert.equal(formatDistance(12.6), '13 km');
  });

  it('usa el centro de la ciudad si la persona está lejos o no comparte ubicación', () => {
    assert.deepEqual(referencePoint(null), { point: CITY.center, fromUser: false });
    const bogota = { lat: 4.711, lng: -74.0721 };
    assert.equal(referencePoint(bogota).fromUser, false);
    const villaDelRosario = { lat: 7.8336, lng: -72.4741 };
    assert.deepEqual(referencePoint(villaDelRosario), { point: villaDelRosario, fromUser: true });
  });
});

describe('promociones', () => {
  const base: Promotion = {
    id: 'p1',
    restaurantId: 'r1',
    title: '2x1 en chorizos',
    detail: 'En la cena.',
    weekdays: [2, 3], // martes y miércoles
    startsOn: '2026-10-19',
    endsOn: '2026-11-30',
    active: true,
  };

  it('solo el plan Pro puede crearlas', () => {
    assert.equal(canUsePromotions('pro'), true);
    assert.equal(canUsePromotions('esencial'), false);
    assert.equal(PLANS.pro.promotions, true);
  });

  it('valida nombre, condiciones y fechas', () => {
    const today = '2026-10-19';
    const good = validatePromotion({ ...base, title: '  2x1 en chorizos ' }, today);
    assert.ok(good.ok && good.value.title === '2x1 en chorizos');
    const code = (r: ReturnType<typeof validatePromotion>) => (r.ok ? 'OK' : r.error.code);
    assert.equal(code(validatePromotion({ ...base, title: ' ' }, today)), 'PROMO_TITLE_REQUIRED');
    assert.equal(code(validatePromotion({ ...base, title: 'x'.repeat(41) }, today)), 'PROMO_TITLE_TOO_LONG');
    assert.equal(code(validatePromotion({ ...base, detail: 'x'.repeat(141) }, today)), 'PROMO_DETAIL_TOO_LONG');
    assert.equal(code(validatePromotion({ ...base, endsOn: '2026-10-18' }, today)), 'PROMO_DATES_INVALID');
    assert.equal(code(validatePromotion({ ...base, startsOn: '2026-10-01', endsOn: '2026-10-10' }, today)), 'PROMO_ENDED');
    assert.equal(code(validatePromotion({ ...base, endsOn: '2027-01-16' }, today)), 'OK'); // 90 días exactos
    assert.equal(code(validatePromotion({ ...base, endsOn: '2027-01-17' }, today)), 'PROMO_TOO_LONG');
  });

  it('los siete días equivalen a todos los días', () => {
    const r = validatePromotion({ ...base, weekdays: [0, 1, 2, 3, 4, 5, 6, 3] }, '2026-10-19');
    assert.ok(r.ok);
    assert.deepEqual(r.ok && r.value.weekdays, []);
  });

  it('se muestra solo en sus días, dentro de fechas y con plan Pro', () => {
    const tuesdayNight = new Date('2026-10-21T00:30:00Z'); // martes 20 oct, 7:30 p. m. en Cúcuta
    const monday = new Date('2026-10-19T20:00:00Z');
    assert.equal(isPromotionLive(base, 'pro', tuesdayNight, BOGOTA), true);
    assert.equal(isPromotionLive(base, 'pro', monday, BOGOTA), false);
    assert.equal(isPromotionLive(base, 'esencial', tuesdayNight, BOGOTA), false);
    assert.equal(isPromotionLive({ ...base, active: false }, 'pro', tuesdayNight, BOGOTA), false);
    assert.equal(isPromotionLive({ ...base, endsOn: '2026-10-19' }, 'pro', tuesdayNight, BOGOTA), false);
    assert.equal(isPromotionLive({ ...base, weekdays: [] }, 'pro', monday, BOGOTA), true);
  });

  it('cuenta para el límite si está encendida y no ha terminado', () => {
    assert.equal(countsTowardPromoLimit(base, '2026-10-19'), true);
    assert.equal(countsTowardPromoLimit({ ...base, active: false }, '2026-10-19'), false);
    assert.equal(countsTowardPromoLimit(base, '2026-12-01'), false);
  });

  it('describe los días', () => {
    assert.equal(formatPromoDays([]), 'Todos los días');
    assert.equal(formatPromoDays([3, 2]), 'Martes y miércoles');
    assert.equal(formatPromoDays([5]), 'Viernes');
    assert.equal(formatPromoDays([0, 6]), 'Fines de semana');
    assert.equal(formatPromoDays([5, 1, 3]), 'Lun, mié y vie');
    assert.equal(formatPromoDays([0, 1, 3]), 'Lun, mié y dom');
  });
});
