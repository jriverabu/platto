-- Marcas reales (supabase/seed_*.sql): se cargan después de las pruebas, que usan solo los tres
-- restaurantes de ejemplo, y aquí se revisa que el público las vea completas.
\set QUIET on
\pset tuples_only on
\pset format unaligned
\o /dev/null

set role anon;
select tests.logout();
select tests.check((select count(*) from public.restaurants where slug = 'tadeo-chocolateria') = 1, 'Tadeo aparece para el público');
select tests.check((select count(*) from public.menu_categories where restaurant_id = '55555555-5555-4555-8555-555555555555') = 10,
  'Tadeo tiene sus 10 categorías');
select tests.check((select count(*) from public.dishes where restaurant_id = '55555555-5555-4555-8555-555555555555') = 81,
  'Tadeo tiene sus 81 productos');
select tests.check((select count(*) from public.get_available_slots('55555555-5555-4555-8555-555555555555', tests.next_friday(), 2)) > 0,
  'Tadeo recibe reservas en su horario');
select tests.check((select count(*) from public.list_restaurants(p_zone => 'Colsag')) = 1, 'Tadeo filtra por su zona');
reset role;

\echo '  ✓ marcas reales'
