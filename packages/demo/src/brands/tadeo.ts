// Tadeo Chocolatería: la primera marca real en Platto (prueba con su menú y sus videos de Instagram).
// El menú vive en tadeo.json, que también usa supabase/seed.sql (scripts/brand-to-sql.py).
import type { AvailabilityRule, Plan } from '@platto/core';
import type { DemoState, DishRow, VideoFile } from '../model';
import data from './tadeo.json';

/** Duración real de cada clip (recortado de sus reels a vertical y máximo 10 s). */
const DURATION: Record<string, number> = { 'tadeo-torta-matilda': 9, 'tadeo-bombones': 8.4, 'tadeo-capuchino': 8.1 };

function clip(slug: string): VideoFile {
  return { src: `videos/${slug}.mp4`, poster: `videos/${slug}.jpg`, duration: DURATION[slug] ?? 9, trimStart: 0 };
}

export function tadeoBrand(tz: string, periodEnd: number) {
  const r = data.restaurant;
  const restaurant: DemoState['restaurants'][number] = {
    id: r.id, slug: r.slug, name: r.name, cuisine: r.cuisine, zone: r.zone, address: r.address, lat: r.lat, lng: r.lng,
    priceLevel: r.priceLevel as 1 | 2 | 3 | 4, timezone: tz, status: 'active', reservationsEnabled: true, description: r.description, coverDishId: r.coverDishId,
  };
  const subscription: DemoState['subscriptions'][number] = {
    restaurantId: r.id, plan: r.plan as Plan, status: 'active', currentPeriodEnd: periodEnd, graceUntil: null,
  };
  const categories: DemoState['categories'] = data.categories.map((c, i) => ({ id: c.id, restaurantId: r.id, name: c.name, position: i + 1 }));
  const dishes: DishRow[] = data.categories.flatMap((c) =>
    c.dishes.map((d, i): DishRow => {
      const video = 'video' in d && d.video ? clip(d.video) : null;
      return {
        id: d.id, restaurantId: r.id, categoryId: c.id, name: d.name, description: d.description, priceCop: d.price, tags: d.tags,
        position: i + 1, isAvailable: true, video, candidate: null, videoStatus: video ? 'approved' : 'none', reviewNote: null,
      };
    }),
  );
  // Horario del menú: 7:45 a 11:45 a. m. y 2:30 a 7:00 p. m. (todos los días, por confirmar con Tadeo).
  const rules: AvailabilityRule[] = [];
  for (let weekday = 0; weekday <= 6; weekday++) {
    r.hours.forEach((h, i) => rules.push({ id: `${r.id}-${weekday}-${i}`, restaurantId: r.id, weekday, startTime: h.start, endTime: h.end, slotMinutes: 30, capacityPeople: r.capacity }));
  }
  return { restaurant, subscription, categories, dishes, rules };
}
