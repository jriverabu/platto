// Datos de demostración: cuatro restaurantes de Bogotá con menú en video,
// reservas en distintos estados y reseñas verificadas. Todo es de ejemplo.
import { addCalendarDays, localParts, zonedToUtc, type AvailabilityRule } from '@platto/core';
import type { DemoState, DishRow, ReservationRow, ReviewRow, ViewRow } from './model';

export const TZ = 'America/Bogota';
export const DEMO_VERSION = 3;

const MIN = 60_000;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function video(slug: string) {
  return { src: `videos/${slug}.mp4`, poster: `videos/${slug}.jpg`, duration: 9, trimStart: 0 };
}

export function buildSeed(nowMs: number): DemoState {
  const random = rng(20261005);
  const today = localParts(new Date(nowMs), TZ).date;
  const at = (dayOffset: number, clock: string) => zonedToUtc(addCalendarDays(today, dayOffset), clock, TZ).getTime();
  /** Redondea a los 5 minutos para que las horas se vean limpias. */
  const near = (minutes: number) => Math.round((nowMs + minutes * MIN) / (5 * MIN)) * 5 * MIN;

  const people = [
    { id: 'u-camila', name: 'Camila Rojas', phone: '300 555 0101' },
    { id: 'u-andres', name: 'Andrés Mejía', phone: '310 555 0102' },
    { id: 'u-valentina', name: 'Valentina Gómez', phone: '315 555 0103' },
    { id: 'u-sergio', name: 'Sergio Lara', phone: '320 555 0104' },
    { id: 'u-paula', name: 'Paula Díaz', phone: '301 555 0105' },
    { id: 'u-mateo', name: 'Mateo Ruiz', phone: '311 555 0106' },
    { id: 'u-laura', name: 'Laura Pineda', phone: '316 555 0107' },
    { id: 'u-juan', name: 'Juan Ortiz', phone: '317 555 0108' },
    { id: 'u-sofia', name: 'Sofía Cárdenas', phone: '318 555 0109' },
    { id: 'u-felipe', name: 'Felipe Rincón', phone: '319 555 0110' },
  ];

  const restaurants: DemoState['restaurants'] = [
    {
      id: 'r-brasa', slug: 'brasa-negra', name: 'Brasa Negra', cuisine: 'Parrilla', zone: 'Chapinero',
      address: 'Calle 59 # 5-12', priceLevel: 3, timezone: TZ, status: 'active', reservationsEnabled: true,
      description: 'Carnes al carbón y leña de naranjo, con salsas de la casa.', coverDishId: 'd-costilla',
    },
    {
      id: 'r-fogon', slug: 'fogon-sabanero', name: 'Fogón Sabanero', cuisine: 'Colombiana', zone: 'Teusaquillo',
      address: 'Carrera 17 # 39-40', priceLevel: 2, timezone: TZ, status: 'active', reservationsEnabled: true,
      description: 'Ajiaco, sobrebarriga y arepas como en la casa de la abuela.', coverDishId: 'd-ajiaco',
    },
    {
      id: 'r-corvina', slug: 'casa-corvina', name: 'Casa Corvina', cuisine: 'Mariscos', zone: 'Usaquén',
      address: 'Carrera 6 # 119-24', priceLevel: 3, timezone: TZ, status: 'active', reservationsEnabled: true,
      description: 'Ceviches y pesca del día del Pacífico colombiano.', coverDishId: 'd-ceviche',
    },
    {
      id: 'r-verde', slug: 'verde-raiz', name: 'Verde Raíz', cuisine: 'Vegetariana', zone: 'Chapinero',
      address: 'Calle 65 # 4-35', priceLevel: 2, timezone: TZ, status: 'active', reservationsEnabled: true,
      description: 'Cocina de huerta sabanera, sin carne y sin aburrir.', coverDishId: 'd-bowl',
    },
  ];

  const month = 30 * 24 * 60 * MIN;
  const subscriptions: DemoState['subscriptions'] = [
    { restaurantId: 'r-brasa', plan: 'pro', status: 'active', currentPeriodEnd: nowMs + 26 * 24 * 60 * MIN, graceUntil: null },
    { restaurantId: 'r-fogon', plan: 'esencial', status: 'active', currentPeriodEnd: nowMs + month, graceUntil: null },
    { restaurantId: 'r-corvina', plan: 'esencial', status: 'trialing', currentPeriodEnd: nowMs + 12 * 24 * 60 * MIN, graceUntil: null },
    { restaurantId: 'r-verde', plan: 'esencial', status: 'active', currentPeriodEnd: nowMs + month, graceUntil: null },
  ];

  const categories: DemoState['categories'] = [
    { id: 'c-brasa-entradas', restaurantId: 'r-brasa', name: 'Entradas', position: 1 },
    { id: 'c-brasa-fuertes', restaurantId: 'r-brasa', name: 'Fuertes', position: 2 },
    { id: 'c-fogon-sopas', restaurantId: 'r-fogon', name: 'Sopas', position: 1 },
    { id: 'c-fogon-tipicos', restaurantId: 'r-fogon', name: 'Platos típicos', position: 2 },
    { id: 'c-corvina-crudos', restaurantId: 'r-corvina', name: 'Crudos', position: 1 },
    { id: 'c-corvina-mar', restaurantId: 'r-corvina', name: 'Del mar', position: 2 },
    { id: 'c-verde-platos', restaurantId: 'r-verde', name: 'Platos', position: 1 },
  ];

  const dish = (d: Omit<DishRow, 'candidate' | 'videoStatus' | 'reviewNote' | 'isAvailable' | 'position'> & Partial<DishRow>): DishRow => ({
    isAvailable: true,
    position: 1,
    candidate: null,
    videoStatus: d.video ? 'approved' : 'none',
    reviewNote: null,
    ...d,
  });

  const dishes: DishRow[] = [
    dish({ id: 'd-chorizo', restaurantId: 'r-brasa', categoryId: 'c-brasa-entradas', name: 'Chorizo santarrosano', description: 'Tres chorizos a la brasa con arepa de maíz pelado y limón.', priceCop: 24000, tags: ['Para compartir'], video: video('chorizo-santarrosano') }),
    dish({ id: 'd-costilla', restaurantId: 'r-brasa', categoryId: 'c-brasa-fuertes', name: 'Costilla ahumada 12 horas', description: 'Costilla de res en leña de naranjo, chimichurri de la casa y papa criolla.', priceCop: 46000, tags: ['Sin gluten'], video: video('costilla-ahumada') }),
    dish({ id: 'd-picana', restaurantId: 'r-brasa', categoryId: 'c-brasa-fuertes', name: 'Picaña al carbón', description: '300 g, término a elección, con yuca frita y ají de la casa.', priceCop: 52000, tags: [], position: 2, video: video('picana-al-carbon') }),
    dish({ id: 'd-ajiaco', restaurantId: 'r-fogon', categoryId: 'c-fogon-sopas', name: 'Ajiaco santafereño', description: 'Con pollo desmechado, mazorca, guascas, crema, alcaparras y aguacate.', priceCop: 32000, tags: ['Sin gluten'], video: video('ajiaco-santafereno') }),
    dish({ id: 'd-sobrebarriga', restaurantId: 'r-fogon', categoryId: 'c-fogon-tipicos', name: 'Sobrebarriga a la criolla', description: 'En salsa de tomate y cebolla, con papa salada y arroz.', priceCop: 36000, tags: [], video: video('sobrebarriga-criolla') }),
    dish({ id: 'd-arepa', restaurantId: 'r-fogon', categoryId: 'c-fogon-tipicos', name: 'Arepa de choclo con hogao', description: 'Arepa dulce de maíz tierno, quesito y hogao de la casa.', priceCop: 16000, tags: ['Vegetariano'], position: 2, video: video('arepa-choclo') }),
    dish({ id: 'd-ceviche', restaurantId: 'r-corvina', categoryId: 'c-corvina-crudos', name: 'Ceviche de pesca del día', description: 'Corvina en leche de tigre, cebolla morada, ají y maíz tostado.', priceCop: 38000, tags: ['Picante'], video: video('ceviche-pesca') }),
    // Este plato llega con su video esperando revisión: el administrador lo aprueba en la demo.
    dish({ id: 'd-arroz', restaurantId: 'r-corvina', categoryId: 'c-corvina-mar', name: 'Arroz con mariscos', description: 'Arroz meloso con camarón, calamar y piangua.', priceCop: 49000, tags: ['Para compartir'], video: null, candidate: video('arroz-mariscos'), videoStatus: 'in_review' }),
    dish({ id: 'd-bowl', restaurantId: 'r-verde', categoryId: 'c-verde-platos', name: 'Bowl de quinua y aguacate', description: 'Quinua, remolacha, zanahoria asada, kale y aguacate con ajonjolí.', priceCop: 29000, tags: ['Vegetariano', 'Sin gluten'], video: video('bowl-quinua') }),
  ];

  // Almuerzo todos los días y cena todos los días (cupo en personas por franja).
  const capacities: Record<string, number> = { 'r-brasa': 20, 'r-fogon': 16, 'r-corvina': 12, 'r-verde': 14 };
  const rules: AvailabilityRule[] = [];
  for (const restaurantId of Object.keys(capacities)) {
    for (let weekday = 0; weekday <= 6; weekday++) {
      rules.push({ id: `${restaurantId}-${weekday}-a`, restaurantId, weekday, startTime: '12:00', endTime: '15:30', slotMinutes: 30, capacityPeople: capacities[restaurantId]! });
      rules.push({ id: `${restaurantId}-${weekday}-c`, restaurantId, weekday, startTime: '18:30', endTime: '22:00', slotMinutes: 30, capacityPeople: capacities[restaurantId]! });
    }
  }

  const reservations: ReservationRow[] = [];
  const reviews: ReviewRow[] = [];
  let seq = 0;
  const reservation = (r: Partial<ReservationRow> & Pick<ReservationRow, 'restaurantId' | 'dinerId' | 'startsAt' | 'partySize' | 'status'>): ReservationRow => {
    const row: ReservationRow = {
      id: `res-${++seq}`,
      note: null,
      createdAt: r.startsAt - 2 * 24 * 60 * MIN,
      expiresAt: r.startsAt - 2 * 24 * 60 * MIN + 120 * MIN,
      respondedAt: r.status === 'pending' ? null : r.startsAt - 2 * 24 * 60 * MIN + 20 * MIN,
      ...r,
    };
    reservations.push(row);
    return row;
  };

  // Historial con reseñas verificadas.
  const comments: Record<string, string[]> = {
    'r-brasa': [
      'La costilla se deshace con el tenedor. Volvemos seguro.',
      'La picaña llegó en el término exacto que pedimos.',
      'Ambiente cálido y la atención muy rápida.',
      'El chimichurri de la casa es otra cosa.',
      'Un poco ruidoso el viernes, pero la comida lo vale.',
    ],
    'r-fogon': [
      'El ajiaco más parecido al de mi abuela.',
      'Porciones generosas y precio justo.',
      'La arepa de choclo con hogao, imperdible.',
    ],
    'r-corvina': ['Ceviche fresquísimo, buen picante.', 'Muy rico, aunque tardaron con los platos.'],
    'r-verde': ['Ni se extraña la carne. El bowl es enorme.', 'Rico y liviano para almorzar.'],
  };
  const ratingPool: Record<string, number[]> = {
    'r-brasa': [5, 5, 4, 5, 5, 4, 5, 3, 5, 5, 4, 5],
    'r-fogon': [5, 4, 5, 4, 4, 5, 5, 4],
    'r-corvina': [5, 4, 4],
    'r-verde': [5, 4, 5, 4, 5, 5],
  };
  const tagPool = ['Sabor', 'Porción', 'Servicio', 'Ambiente', 'Rapidez', 'Precio justo'];
  const diners = people.slice(1);
  for (const [restaurantId, ratings] of Object.entries(ratingPool)) {
    ratings.forEach((rating, i) => {
      const diner = diners[(i + restaurantId.length) % diners.length]!;
      const daysAgo = 2 + i * 2;
      const res = reservation({
        restaurantId, dinerId: diner.id, startsAt: at(-daysAgo, i % 2 ? '13:00' : '20:00'),
        partySize: 2 + (i % 4), status: 'completed',
      });
      const restaurantDishes = dishes.filter((d) => d.restaurantId === restaurantId);
      const [first, last] = diner.name.split(' ');
      reviews.push({
        id: `rev-${restaurantId}-${i}`,
        reservationId: res.id,
        restaurantId,
        dinerId: diner.id,
        authorName: `${first} ${last ? `${last[0]}.` : ''}`.trim(),
        rating,
        comment: comments[restaurantId]![i] ?? null,
        tags: [tagPool[i % tagPool.length]!, tagPool[(i + 2) % tagPool.length]!],
        dishIds: [restaurantDishes[i % restaurantDishes.length]!.id],
        reply: i === 0 && restaurantId === 'r-brasa' ? '¡Gracias! Los esperamos pronto.' : null,
        hidden: false,
        reported: false,
        createdAt: res.startsAt + (3 + i) * 60 * MIN,
      });
    });
  }

  // Bandeja de Brasa Negra hoy: dos solicitudes nuevas, una mesa por llegar y la agenda de la noche.
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-andres', startsAt: at(0, '20:30') > nowMs + 2 * 60 * MIN ? at(0, '20:30') : at(1, '20:30'), partySize: 4, status: 'pending', note: 'Es un cumpleaños, ¿pueden poner una vela?', createdAt: nowMs - 25 * MIN, expiresAt: nowMs + 95 * MIN, respondedAt: null });
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-mateo', startsAt: at(5, '13:00'), partySize: 8, status: 'pending', note: 'Somos de una oficina, mesa adentro por favor.', createdAt: nowMs - 76 * MIN, expiresAt: nowMs + 44 * MIN, respondedAt: null });
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-sergio', startsAt: near(15), partySize: 3, status: 'confirmed', note: 'Terraza si se puede.', createdAt: nowMs - 26 * 60 * MIN, expiresAt: nowMs - 24 * 60 * MIN, respondedAt: nowMs - 25 * 60 * MIN });
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-paula', startsAt: near(140), partySize: 2, status: 'confirmed', note: 'Aniversario.', createdAt: nowMs - 30 * 60 * MIN, expiresAt: nowMs - 28 * 60 * MIN, respondedAt: nowMs - 29 * 60 * MIN });
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-laura', startsAt: near(-240), partySize: 2, status: 'completed', createdAt: nowMs - 48 * 60 * MIN, expiresAt: nowMs - 46 * 60 * MIN, respondedAt: nowMs - 47 * 60 * MIN });
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-juan', startsAt: near(-300), partySize: 6, status: 'no_show', createdAt: nowMs - 72 * 60 * MIN, expiresAt: nowMs - 70 * 60 * MIN, respondedAt: nowMs - 71 * 60 * MIN });

  // Camila (comensal de la demo): una visita lista para calificar y una reserva confirmada.
  reservation({ restaurantId: 'r-brasa', dinerId: 'u-camila', startsAt: near(-180), partySize: 2, status: 'completed', createdAt: nowMs - 3 * 24 * 60 * MIN, expiresAt: nowMs - 3 * 24 * 60 * MIN + 120 * MIN, respondedAt: nowMs - 3 * 24 * 60 * MIN + 10 * MIN });
  reservation({ restaurantId: 'r-fogon', dinerId: 'u-camila', startsAt: at(3, '13:00'), partySize: 4, status: 'confirmed', note: 'Almuerzo familiar.', createdAt: nowMs - 20 * 60 * MIN, expiresAt: nowMs - 18 * 60 * MIN, respondedAt: nowMs - 19 * 60 * MIN });

  // Vistas de los últimos 30 días para las estadísticas.
  const weights: Record<string, number> = { 'd-costilla': 140, 'd-picana': 98, 'd-chorizo': 54, 'd-ajiaco': 120, 'd-sobrebarriga': 60, 'd-arepa': 45, 'd-ceviche': 88, 'd-bowl': 70 };
  const views: ViewRow[] = [];
  for (const d of dishes) {
    const n = weights[d.id] ?? 0;
    for (let i = 0; i < n; i++) {
      views.push({ dishId: d.id, restaurantId: d.restaurantId, seconds: Math.round((4 + random() * 5) * 10) / 10, at: nowMs - Math.floor(random() * 30 * 24 * 60) * MIN });
    }
  }

  return {
    version: DEMO_VERSION,
    clockOffsetMin: 0,
    role: 'diner',
    dinerId: 'u-camila',
    ownerRestaurantId: 'r-brasa',
    people,
    restaurants,
    subscriptions,
    categories,
    dishes,
    rules,
    blackouts: [],
    reservations,
    reviews,
    views,
    saved: ['d-ajiaco'],
    notifications: [
      { id: 'n-1', to: 'diner', title: '¡Tu mesa está confirmada!', body: 'Fogón Sabanero te espera. Mesa para 4.', at: nowMs - 19 * 60 * MIN, read: false },
      { id: 'n-2', to: 'r-brasa', title: 'Nueva solicitud de reserva', body: 'Mesa para 8 · Grupo de oficina', at: nowMs - 76 * MIN, read: false },
      { id: 'n-3', to: 'admin', title: 'Video para revisar', body: 'Casa Corvina · Arroz con mariscos', at: nowMs - 50 * MIN, read: false },
    ],
    welcomed: false,
  };
}
