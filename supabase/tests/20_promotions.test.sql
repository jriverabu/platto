-- Promociones: plan Pro, límites, fechas y visibilidad. Usa los usuarios de 10_platform.
\set QUIET on
\pset tuples_only on
\pset format unaligned
\o /dev/null

-- Empieza sin las promociones del seed.
delete from public.promotions;

create function tests.today() returns date language sql stable as $$ select (now() at time zone 'America/Bogota')::date $$;

-- Brasa Negra (Pro) crea promociones.
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b1');

insert into public.promotions (restaurant_id, title, detail, weekdays, starts_on, ends_on)
values ('11111111-1111-4111-8111-111111111111', '  2x1 en chorizos ', '  En la cena. ', '{0,1,2,3,4,5,6}', tests.today(), tests.today() + 30);
select tests.check((select title from public.promotions limit 1) = '2x1 en chorizos', 'limpia los espacios del nombre');
select tests.check((select cardinality(weekdays) from public.promotions limit 1) = 0, 'los siete días se guardan como «todos los días»');

select tests.expect_error($$insert into public.promotions (restaurant_id, title, starts_on, ends_on)
  values ('11111111-1111-4111-8111-111111111111', 'Vencida', tests.today() - 10, tests.today() - 1)$$, 'PROMO_ENDED');
select tests.expect_error($$insert into public.promotions (restaurant_id, title, starts_on, ends_on)
  values ('11111111-1111-4111-8111-111111111111', 'Muy larga', tests.today(), tests.today() + 90)$$, '%promotions_max_days%');
select tests.expect_error($$insert into public.promotions (restaurant_id, title, starts_on, ends_on)
  values ('11111111-1111-4111-8111-111111111111', repeat('x', 41), tests.today(), tests.today() + 5)$$, '%promotions_title_check%');

insert into public.promotions (restaurant_id, title, weekdays, starts_on, ends_on) values
  ('11111111-1111-4111-8111-111111111111', 'Postre de la casa', '{5,6}', tests.today(), tests.today() + 10),
  ('11111111-1111-4111-8111-111111111111', 'Happy hour', '{}', tests.today(), tests.today() + 10);
select tests.expect_error($$insert into public.promotions (restaurant_id, title, starts_on, ends_on)
  values ('11111111-1111-4111-8111-111111111111', 'La cuarta', tests.today(), tests.today() + 5)$$, 'PROMO_LIMIT');

-- Apagada no cuenta para el límite; encenderla sí.
insert into public.promotions (restaurant_id, title, starts_on, ends_on, active)
values ('11111111-1111-4111-8111-111111111111', 'En pausa', tests.today(), tests.today() + 5, false);
select tests.expect_error($$update public.promotions set active = true where title = 'En pausa'$$, 'PROMO_LIMIT');

-- Fogón Cucuteño (Esencial) no puede, y nadie escribe en promociones ajenas.
select tests.login('00000000-0000-4000-8000-0000000000b2');
select tests.expect_error($$insert into public.promotions (restaurant_id, title, starts_on, ends_on)
  values ('22222222-2222-4222-8222-222222222222', 'Mute 2x1', tests.today(), tests.today() + 5)$$, 'PROMO_PLAN_REQUIRED');
select tests.expect_error($$insert into public.promotions (restaurant_id, title, starts_on, ends_on)
  values ('11111111-1111-4111-8111-111111111111', 'Ajena', tests.today(), tests.today() + 5)$$, 'FORBIDDEN');
select tests.check((select count(*) from public.promotions) = 3, 'otro restaurante ve solo las promociones públicas');
update public.promotions set title = 'Hackeada';
select tests.check((select count(*) from public.promotions where title = 'Hackeada') = 0, 'y no puede editarlas');
reset role;

-- El público ve las encendidas, no las pausadas.
set role anon;
select tests.logout();
select tests.check((select count(*) from public.promotions) = 3, 'el público ve las 3 encendidas');
select tests.check((select count(*) from public.live_promotions('11111111-1111-4111-8111-111111111111'))
  = 2 + (case when extract(dow from tests.today()) in (5, 6) then 1 else 0 end),
  'hoy se muestran las de todos los días y las del día de la semana');
reset role;

-- Si baja a Esencial, sus promociones dejan de verse (y vuelven si regresa a Pro).
update public.subscriptions set plan = 'esencial' where restaurant_id = '11111111-1111-4111-8111-111111111111';
set role anon;
select tests.check((select count(*) from public.promotions) = 0, 'sin plan Pro no se ven');
select tests.check((select count(*) from public.live_promotions()) = 0, 'ni en las de hoy');
reset role;
update public.subscriptions set plan = 'pro' where restaurant_id = '11111111-1111-4111-8111-111111111111';
set role anon;
select tests.check((select count(*) from public.promotions) = 3, 'al volver a Pro reaparecen');
reset role;

\echo '  ✓ 20_promotions'
