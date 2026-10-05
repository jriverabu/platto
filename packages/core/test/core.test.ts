import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addMinutes,
  bookableDates,
  canReview,
  cancel,
  checkVideo,
  clampTrimWindow,
  computeExpiresAt,
  defaultTrimWindow,
  effectiveStatus,
  formatClock12,
  formatCop,
  formatDateShort,
  formatDuration,
  formatTime,
  generateSlots,
  isListed,
  isVideoAcceptable,
  localParts,
  markAttendance,
  respond,
  summarizeRatings,
  validateNewReservation,
  validateReviewInput,
  weekdayOf,
  zonedToUtc,
  type AvailabilityRule,
} from '../src/index';

const BOGOTA = 'America/Bogota';

// Lunes 5 de octubre de 2026, 2:00 p. m. en Bogotá (UTC-5).
const NOW = new Date('2026-10-05T19:00:00Z');

const dinnerRule: AvailabilityRule = {
  id: 'r1',
  restaurantId: 'rest',
  weekday: 5, // viernes
  startTime: '19:00',
  endTime: '21:30',
  slotMinutes: 30,
  capacityPeople: 10,
};

describe('tiempo y zonas horarias', () => {
  it('convierte hora local de Bogotá a UTC', () => {
    assert.equal(zonedToUtc('2026-10-09', '20:00', BOGOTA).toISOString(), '2026-10-10T01:00:00.000Z');
  });

  it('respeta cambios de horario en zonas con DST', () => {
    // Madrid: invierno UTC+1, verano UTC+2.
    assert.equal(zonedToUtc('2026-01-15', '20:00', 'Europe/Madrid').toISOString(), '2026-01-15T19:00:00.000Z');
    assert.equal(zonedToUtc('2026-07-15', '20:00', 'Europe/Madrid').toISOString(), '2026-07-15T18:00:00.000Z');
  });

  it('obtiene fecha y día locales', () => {
    const parts = localParts(new Date('2026-10-10T01:00:00Z'), BOGOTA);
    assert.deepEqual(parts, { date: '2026-10-09', time: '20:00', weekday: 5 });
    assert.equal(weekdayOf('2026-10-05'), 1);
  });
});

describe('formatos', () => {
  it('formatea pesos colombianos', () => {
    assert.equal(formatCop(46000), '$46.000');
    assert.equal(formatCop(1250000), '$1.250.000');
    assert.equal(formatCop(900), '$900');
  });

  it('formatea horas y fechas como se leen en Colombia', () => {
    assert.equal(formatClock12('20:00'), '8:00 p. m.');
    assert.equal(formatClock12('12:30'), '12:30 p. m.');
    assert.equal(formatClock12('00:15'), '12:15 a. m.');
    const startsAt = zonedToUtc('2026-10-09', '20:00', BOGOTA);
    assert.equal(formatTime(startsAt, BOGOTA), '8:00 p. m.');
    assert.equal(formatDateShort(startsAt, BOGOTA), 'vie 9 oct');
    assert.equal(formatDuration(92), '1 h 32 min');
    assert.equal(formatDuration(44), '44 min');
  });
});

describe('franjas de reserva', () => {
  const base = {
    date: '2026-10-09',
    timeZone: BOGOTA,
    rules: [dinnerRule],
    blackoutDates: [],
    bookings: [],
    partySize: 2,
    now: NOW,
  };

  it('genera franjas cada 30 minutos dentro del horario', () => {
    const slots = generateSlots(base);
    assert.deepEqual(
      slots.map((s) => s.clock),
      ['19:00', '19:30', '20:00', '20:30', '21:00'],
    );
    assert.ok(slots.every((s) => s.available));
  });

  it('descuenta el cupo de reservas pendientes y confirmadas, no de las canceladas', () => {
    const at8 = zonedToUtc('2026-10-09', '20:00', BOGOTA);
    const slots = generateSlots({
      ...base,
      partySize: 4,
      bookings: [
        { startsAt: at8, partySize: 4, status: 'confirmed' },
        { startsAt: at8, partySize: 3, status: 'pending' },
        { startsAt: at8, partySize: 6, status: 'cancelled' },
      ],
    });
    const eight = slots.find((s) => s.clock === '20:00');
    assert.equal(eight?.remaining, 3);
    assert.equal(eight?.available, false);
    assert.equal(eight?.reason, 'full');
  });

  it('no ofrece franjas en días cerrados ni en días sin horario', () => {
    assert.equal(generateSlots({ ...base, blackoutDates: ['2026-10-09'] }).length, 0);
    assert.equal(generateSlots({ ...base, date: '2026-10-08' }).length, 0);
  });

  it('bloquea franjas con menos de una hora de anticipación', () => {
    const lateNow = new Date('2026-10-10T00:20:00Z'); // vie 7:20 p. m.
    const slots = generateSlots({ ...base, now: lateNow });
    assert.equal(slots.find((s) => s.clock === '19:00')?.reason, 'past');
    assert.equal(slots.find((s) => s.clock === '20:00')?.reason, 'too_soon');
    assert.equal(slots.find((s) => s.clock === '20:30')?.available, true);
  });

  it('lista los próximos días reservables desde hoy', () => {
    const days = bookableDates(NOW, BOGOTA, 7);
    assert.equal(days[0], '2026-10-05');
    assert.equal(days.length, 7);
    assert.equal(days[6], '2026-10-11');
  });
});

describe('ciclo de vida de una reserva', () => {
  const startsAt = zonedToUtc('2026-10-09', '20:00', BOGOTA);

  it('vence a las 2 horas o a la hora de la reserva', () => {
    assert.equal(computeExpiresAt(NOW, startsAt).toISOString(), addMinutes(NOW, 120).toISOString());
    const soon = addMinutes(NOW, 90);
    assert.equal(computeExpiresAt(NOW, soon).toISOString(), soon.toISOString());
  });

  it('valida tamaño y anticipación de una solicitud', () => {
    assert.equal(validateNewReservation({ startsAt, partySize: 2, now: NOW }).ok, true);
    const tooMany = validateNewReservation({ startsAt, partySize: 13, now: NOW });
    assert.equal(tooMany.ok, false);
    const tooSoon = validateNewReservation({ startsAt: addMinutes(NOW, 30), partySize: 2, now: NOW });
    assert.equal(!tooSoon.ok && tooSoon.error.code, 'TOO_SOON');
  });

  it('el restaurante acepta o rechaza solo mientras está pendiente y vigente', () => {
    const pending = { status: 'pending' as const, expiresAt: addMinutes(NOW, 120) };
    assert.deepEqual(respond(pending, true, NOW), { ok: true, value: 'confirmed' });
    assert.deepEqual(respond(pending, false, NOW), { ok: true, value: 'rejected' });
    const late = respond(pending, true, addMinutes(NOW, 121));
    assert.equal(!late.ok && late.error.code, 'RESERVATION_EXPIRED');
    const again = respond({ ...pending, status: 'confirmed' }, true, NOW);
    assert.equal(!again.ok && again.error.code, 'RESERVATION_NOT_PENDING');
    assert.equal(effectiveStatus(pending, addMinutes(NOW, 120)), 'expired');
  });

  it('el comensal cancela confirmadas solo hasta 2 horas antes', () => {
    const confirmed = { status: 'confirmed' as const, startsAt, expiresAt: addMinutes(NOW, 120) };
    assert.deepEqual(cancel(confirmed, NOW), { ok: true, value: 'cancelled' });
    const tooLate = cancel(confirmed, addMinutes(startsAt, -60));
    assert.equal(!tooLate.ok && tooLate.error.code, 'CANCEL_TOO_LATE');
    const pending = { ...confirmed, status: 'pending' as const };
    assert.deepEqual(cancel(pending, NOW), { ok: true, value: 'cancelled' });
  });

  it('la llegada se marca desde 30 minutos antes', () => {
    const confirmed = { status: 'confirmed' as const, startsAt };
    const early = markAttendance(confirmed, true, addMinutes(startsAt, -45));
    assert.equal(!early.ok && early.error.code, 'ATTENDANCE_TOO_EARLY');
    assert.deepEqual(markAttendance(confirmed, true, addMinutes(startsAt, -20)), { ok: true, value: 'completed' });
    assert.deepEqual(markAttendance(confirmed, false, addMinutes(startsAt, 30)), { ok: true, value: 'no_show' });
  });
});

describe('calificaciones verificadas', () => {
  const startsAt = new Date('2026-10-01T01:00:00Z');
  const completed = { status: 'completed' as const, startsAt };

  it('abre 2 horas después y cierra a los 14 días', () => {
    assert.equal(canReview(completed, addMinutes(startsAt, 60), false).ok, false);
    assert.equal(canReview(completed, addMinutes(startsAt, 121), false).ok, true);
    assert.equal(canReview(completed, addMinutes(startsAt, 15 * 24 * 60), false).ok, false);
  });

  it('solo para visitas completadas y una sola vez', () => {
    const noShow = canReview({ ...completed, status: 'no_show' }, addMinutes(startsAt, 180), false);
    assert.equal(!noShow.ok && noShow.error.code, 'REVIEW_NOT_ALLOWED');
    const twice = canReview(completed, addMinutes(startsAt, 180), true);
    assert.equal(!twice.ok && twice.error.code, 'REVIEW_EXISTS');
  });

  it('valida puntaje y largo del comentario', () => {
    assert.equal(validateReviewInput({ rating: 5, comment: 'Delicioso' }).ok, true);
    assert.equal(validateReviewInput({ rating: 6 }).ok, false);
    assert.equal(validateReviewInput({ rating: 4, comment: 'x'.repeat(301) }).ok, false);
  });

  it('muestra promedio solo con 5 reseñas o más', () => {
    assert.equal(summarizeRatings([5, 4, 5, 4]).average, null);
    const summary = summarizeRatings([5, 4, 5, 4, 5]);
    assert.equal(summary.average, 4.6);
    assert.deepEqual(summary.distribution, [0, 0, 0, 2, 3]);
  });
});

describe('suscripciones', () => {
  it('aparece si está activa, en prueba o dentro de la gracia', () => {
    assert.equal(isListed({ status: 'active', graceUntil: null }, NOW), true);
    assert.equal(isListed({ status: 'trialing', graceUntil: null }, NOW), true);
    assert.equal(isListed({ status: 'past_due', graceUntil: addMinutes(NOW, 60) }, NOW), true);
    assert.equal(isListed({ status: 'past_due', graceUntil: addMinutes(NOW, -1) }, NOW), false);
    assert.equal(isListed({ status: 'suspended', graceUntil: null }, NOW), false);
    assert.equal(isListed(null, NOW), false);
  });
});

describe('video de 10 segundos', () => {
  it('acepta un video vertical de 4 a 10 segundos', () => {
    assert.equal(isVideoAcceptable({ durationSeconds: 9.4, width: 1080, height: 1920 }), true);
    assert.deepEqual(checkVideo({ durationSeconds: 9.4, width: 1080, height: 1920 }), []);
  });

  it('rechaza videos largos, cortos u horizontales', () => {
    const codes = (d: number, w: number, h: number) => checkVideo({ durationSeconds: d, width: w, height: h }).map((i) => i.code);
    assert.deepEqual(codes(10.4, 1080, 1920), ['TOO_LONG']);
    assert.deepEqual(codes(2, 1080, 1920), ['TOO_SHORT']);
    assert.deepEqual(codes(8, 1920, 1080), ['NOT_VERTICAL']);
  });

  it('solo advierte por baja resolución', () => {
    const issues = checkVideo({ durationSeconds: 8, width: 720, height: 1280 });
    assert.deepEqual(issues.map((i) => i.level), ['warning']);
    assert.equal(isVideoAcceptable({ durationSeconds: 8, width: 720, height: 1280 }), true);
  });

  it('propone y ajusta una ventana de recorte de 10 segundos', () => {
    assert.deepEqual(defaultTrimWindow(23), { start: 6.5, end: 16.5 });
    assert.deepEqual(defaultTrimWindow(8), { start: 0, end: 8 });
    assert.deepEqual(clampTrimWindow(23, 20), { start: 13, end: 23 });
    assert.deepEqual(clampTrimWindow(23, -3), { start: 0, end: 10 });
  });
});
