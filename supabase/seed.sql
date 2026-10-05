-- Datos de demostración para desarrollo local (`supabase db reset`).
-- Tres restaurantes de ejemplo en Bogotá, con menú y horarios. No incluye usuarios:
-- regístrate en la app y conviértete en administrador con el comando de docs/CONFIGURACION.md.

insert into public.restaurants (id, slug, name, cuisine, zone, address, lat, lng, price_level, description, status) values
  ('11111111-1111-4111-8111-111111111111', 'brasa-negra', 'Brasa Negra', 'Parrilla de leña', 'Chapinero',
   'Calle 59 # 5-12', 4.6466, -74.0619, 3,
   'Carnes al carbón y leña de naranjo, con salsas de la casa.', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'fogon-sabanero', 'Fogón Sabanero', 'Cocina santafereña', 'Teusaquillo',
   'Carrera 17 # 39-40', 4.6271, -74.0717, 2,
   'Ajiaco, tamales y sobrebarriga como en la casa de la abuela.', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'casa-corvina', 'Casa Corvina', 'Pescados y mariscos', 'Usaquén',
   'Carrera 6 # 119-24', 4.6957, -74.0308, 3,
   'Ceviches, tiraditos y pesca del día del Pacífico colombiano.', 'active');

insert into public.subscriptions (restaurant_id, plan, status, provider, current_period_end) values
  ('11111111-1111-4111-8111-111111111111', 'pro', 'active', 'manual', now() + interval '30 days'),
  ('22222222-2222-4222-8222-222222222222', 'esencial', 'active', 'manual', now() + interval '30 days'),
  ('33333333-3333-4333-8333-333333333333', 'esencial', 'trialing', 'manual', now() + interval '30 days');

insert into public.menu_categories (id, restaurant_id, name, position) values
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Entradas', 1),
  ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Fuertes', 2),
  ('a2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Sopas', 1),
  ('a2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Platos típicos', 2),
  ('a3000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Crudos', 1),
  ('a3000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Del mar', 2);

insert into public.dishes (restaurant_id, category_id, name, description, price_cop, tags, position) values
  ('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000001', 'Chorizo santarrosano',
   'Tres chorizos a la brasa con arepa de maíz pelado y limón.', 24000, '{"Para compartir"}', 1),
  ('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000002', 'Costilla ahumada 12 horas',
   'Costilla de res en leña de naranjo, chimichurri de la casa y papa criolla.', 46000, '{"Sin gluten"}', 1),
  ('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000002', 'Picaña al carbón',
   '300 g, término a elección, con yuca frita y ají de la casa.', 52000, '{}', 2),
  ('22222222-2222-4222-8222-222222222222', 'a2000000-0000-4000-8000-000000000001', 'Ajiaco santafereño',
   'Con pollo desmechado, mazorca, guascas, crema, alcaparras y aguacate.', 32000, '{"Sin gluten"}', 1),
  ('22222222-2222-4222-8222-222222222222', 'a2000000-0000-4000-8000-000000000002', 'Sobrebarriga a la criolla',
   'En salsa de tomate y cebolla, con papa salada y arroz.', 36000, '{}', 1),
  ('33333333-3333-4333-8333-333333333333', 'a3000000-0000-4000-8000-000000000001', 'Ceviche de pesca del día',
   'Corvina en leche de tigre, cebolla morada, ají y maíz tostado.', 38000, '{"Picante"}', 1),
  ('33333333-3333-4333-8333-333333333333', 'a3000000-0000-4000-8000-000000000002', 'Arroz con mariscos',
   'Arroz meloso con camarón, calamar y piangua.', 49000, '{"Para compartir"}', 1);

-- Horarios: almuerzo todos los días y cena de martes a sábado.
insert into public.availability_rules (restaurant_id, weekday, start_time, end_time, slot_minutes, capacity_people)
select r.id, d.weekday, s.start_time, s.end_time, 30, s.capacity
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 40),
  ('22222222-2222-4222-8222-222222222222'::uuid, 30),
  ('33333333-3333-4333-8333-333333333333'::uuid, 24)
) as r(id, base_capacity)
cross join generate_series(0, 6) as d(weekday)
cross join lateral (values
  ('12:00'::time, '15:00'::time, r.base_capacity / 2, true),
  ('19:00'::time, '22:00'::time, r.base_capacity / 2, d.weekday between 2 and 6)
) as s(start_time, end_time, capacity, applies)
where s.applies;
