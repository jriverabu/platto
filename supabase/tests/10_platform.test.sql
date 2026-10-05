-- Pruebas de punta a punta de la base de datos de Platto.
-- Cada bloque cambia de rol (anon, authenticated, service_role) como lo haría la API de Supabase.
\set QUIET on
\pset tuples_only on
\pset format unaligned
\o /dev/null

-- ---------------------------------------------------------------------------
-- Utilidades de prueba
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create function tests.create_user(p_id uuid, p_email text, p_name text) returns uuid
language sql security definer as $$
  insert into auth.users (id, email, raw_user_meta_data)
  values (p_id, p_email, jsonb_build_object('full_name', p_name))
  returning id;
$$;

create function tests.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, false);
$$;

create function tests.login_service() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"service_role"}', false);
$$;

create function tests.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', false);
$$;

create function tests.check(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then
    raise exception 'FALLÓ: %', p_what;
  end if;
end;
$$;

create function tests.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
declare
  v_failed boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    v_failed := true;
    if sqlerrm not like p_pattern then
      raise exception 'Esperaba error "%" pero fue "%" en: %', p_pattern, sqlerrm, p_sql;
    end if;
  end;
  if not v_failed then
    raise exception 'Esperaba error "%" y no hubo error en: %', p_pattern, p_sql;
  end if;
end;
$$;

-- Viernes de la próxima semana (fecha local de Bogotá).
create function tests.next_friday() returns date language sql stable as $$
  select (now() at time zone 'America/Bogota')::date
         + ((5 - extract(dow from (now() at time zone 'America/Bogota'))::int + 7) % 7) + 7;
$$;

create function tests.at_local(p_day date, p_time time) returns timestamptz language sql stable as $$
  select (p_day + p_time) at time zone 'America/Bogota';
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Usuarios de prueba
-- ---------------------------------------------------------------------------
select tests.create_user('00000000-0000-4000-8000-0000000000a1', 'admin@platto.co', 'Admin Platto');
select tests.create_user('00000000-0000-4000-8000-0000000000b1', 'dueno@brasanegra.co', 'Mateo Brasa');
select tests.create_user('00000000-0000-4000-8000-0000000000b2', 'dueno@fogon.co', 'Rosa Fogón');
select tests.create_user('00000000-0000-4000-8000-0000000000c1', 'camila@correo.co', 'Camila Rojas');
select tests.create_user('00000000-0000-4000-8000-0000000000c2', 'andres@correo.co', 'Andrés Mejía');
select tests.create_user('00000000-0000-4000-8000-0000000000c3', 'valentina@correo.co', 'Valentina');
select tests.create_user('00000000-0000-4000-8000-0000000000c4', 'sergio@correo.co', 'Sergio Lara');
select tests.create_user('00000000-0000-4000-8000-0000000000c5', 'paula@correo.co', 'Paula Díaz');

update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000a1';
update public.profiles set role = 'restaurant'
  where id in ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2');
insert into public.restaurant_members (restaurant_id, profile_id, role) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000b1', 'owner'),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-0000000000b2', 'owner');

select tests.check((select count(*) from public.profiles) = 8, 'el registro crea un perfil por usuario');
select tests.check((select full_name from public.profiles where id = '00000000-0000-4000-8000-0000000000c1') = 'Camila Rojas',
  'el perfil toma el nombre del registro');

\echo '  · visitante anónimo'
set role anon;
select tests.logout();
select tests.check((select count(*) from public.restaurants) = 3, 'anónimo ve los 3 restaurantes activos');
select tests.check((select name from public.list_restaurants() limit 1) = 'Brasa Negra', 'el plan Pro aparece primero');
select tests.check((select count(*) from public.list_restaurants(p_zone => 'Usaquén')) = 1, 'filtra por zona');
select tests.check((select count(*) from public.get_available_slots('11111111-1111-4111-8111-111111111111', tests.next_friday(), 2)) = 12,
  'viernes: 6 franjas de almuerzo y 6 de cena');
select tests.check((select count(*) from public.reservations) = 0, 'anónimo no ve reservas');
select tests.check((select count(*) from public.availability_rules) = 0, 'anónimo no ve la configuración de horarios');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:00'), 2)$$,
  '%permission denied%');
select tests.expect_error($$insert into public.restaurants (slug, name) values ('pirata', 'Pirata')$$, '%row-level security%');
select tests.expect_error($$select * from public.notification_outbox$$, '%permission denied%');
reset role;

\echo '  · comensal crea reservas'
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000c1');
select tests.check(
  (select status = 'pending' and expires_at between now() + interval '119 minutes' and now() + interval '121 minutes'
   from public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:00'), 4, 'Cumpleaños')),
  'la solicitud queda pendiente y vence en 2 horas');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:00'), 2)$$,
  'DUPLICATE_RESERVATION');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:30'), 13)$$,
  'INVALID_PARTY_SIZE');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:10'), 2)$$,
  'SLOT_NOT_OFFERED');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', now() + interval '30 minutes', 2)$$,
  'TOO_SOON');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', now() + interval '40 days', 2)$$,
  'TOO_FAR');
select tests.expect_error($$insert into public.reservations (restaurant_id, diner_id, starts_at, party_size, expires_at)
  values ('11111111-1111-4111-8111-111111111111', auth.uid(), now() + interval '2 days', 2, now() + interval '1 hour')$$,
  '%row-level security%');

-- Cupo: la cena de Brasa Negra recibe 20 personas por franja.
select tests.login('00000000-0000-4000-8000-0000000000c2');
select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:00'), 12);
select tests.login('00000000-0000-4000-8000-0000000000c3');
select tests.expect_error($$select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:00'), 5)$$,
  'SLOT_FULL');
select public.create_reservation('11111111-1111-4111-8111-111111111111', tests.at_local(tests.next_friday(), '20:00'), 4);
select tests.check(
  (select remaining = 0 and not available and reason = 'full'
   from public.get_available_slots('11111111-1111-4111-8111-111111111111', tests.next_friday(), 1) where clock = '20:00'),
  'la franja de las 8 queda llena con 20 personas');
select tests.check((select count(*) from public.reservations) = 1, 'cada comensal ve solo sus reservas');
select tests.expect_error($$select public.respond_reservation((select id from public.reservations limit 1), true)$$, 'NOT_FOUND');
reset role;

select tests.check(
  (select count(*) from public.notification_outbox
   where profile_id = '00000000-0000-4000-8000-0000000000b1' and kind = 'reservation_requested') = 3,
  'el dueño recibe una notificación por cada solicitud');

\echo '  · restaurante responde'
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b1');
select tests.check((select count(*) from public.reservations) = 3, 'el dueño ve las solicitudes de su restaurante');
select tests.check((select full_name from public.profiles where id = '00000000-0000-4000-8000-0000000000c1') = 'Camila Rojas',
  'el dueño ve el nombre de quien le reservó');
select tests.check((select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000c4') = 0,
  'el dueño no ve perfiles de quien no le ha reservado');
select tests.check(
  (select status = 'confirmed' from public.respond_reservation(
     (select id from public.reservations where diner_id = '00000000-0000-4000-8000-0000000000c1'), true)),
  'acepta la reserva de Camila');
select tests.expect_error($$select public.respond_reservation(
  (select id from public.reservations where diner_id = '00000000-0000-4000-8000-0000000000c1'), false)$$,
  'RESERVATION_NOT_PENDING');
select public.respond_reservation((select id from public.reservations where diner_id = '00000000-0000-4000-8000-0000000000c2'), false);
select tests.check(
  (select remaining = 12 from public.get_available_slots('11111111-1111-4111-8111-111111111111', tests.next_friday(), 1) where clock = '20:00'),
  'rechazar libera el cupo');

select tests.login('00000000-0000-4000-8000-0000000000b2');
select tests.check((select count(*) from public.reservations) = 0, 'otro restaurante no ve esas reservas');
select tests.expect_error($$select public.respond_reservation(
  '00000000-0000-0000-0000-000000000000'::uuid, true)$$, 'NOT_FOUND');
reset role;

select tests.check(
  (select count(*) from public.notification_outbox
   where profile_id = '00000000-0000-4000-8000-0000000000c1' and kind in ('reservation_confirmed', 'reservation_reminder')) = 2,
  'Camila recibe la confirmación y queda programado su recordatorio');

\echo '  · comensal cancela'
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000c1');
select tests.check(
  (select status = 'cancelled' from public.cancel_reservation((select id from public.reservations limit 1))),
  'cancela una confirmada con días de anticipación');
select tests.expect_error($$select public.cancel_reservation((select id from public.reservations limit 1))$$,
  'RESERVATION_NOT_CANCELLABLE');
reset role;
select tests.check(
  (select count(*) from public.notification_outbox
   where profile_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'reservation_reminder') = 0,
  'al cancelar se borra el recordatorio');

-- Cancelar tarde: confirmada que empieza en 1 hora.
insert into public.reservations (id, restaurant_id, diner_id, starts_at, party_size, status, expires_at)
values ('e0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
        '00000000-0000-4000-8000-0000000000c1', now() + interval '1 hour', 2, 'confirmed', now());
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000c1');
select tests.expect_error($$select public.cancel_reservation('e0000000-0000-4000-8000-000000000001')$$, 'CANCEL_TOO_LATE');
reset role;

\echo '  · vencimiento automático'
update public.reservations set expires_at = now() - interval '1 minute'
where diner_id = '00000000-0000-4000-8000-0000000000c3';
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b1');
select tests.expect_error($$select public.respond_reservation(
  (select id from public.reservations where diner_id = '00000000-0000-4000-8000-0000000000c3'), true)$$,
  'RESERVATION_EXPIRED');
select tests.expect_error($$select public.expire_pending_reservations()$$, '%permission denied%');
set role service_role;
select tests.login_service();
select tests.check(public.expire_pending_reservations() = 1, 'el job vence la solicitud sin respuesta');
reset role;
select tests.check(
  (select status = 'expired' from public.reservations where diner_id = '00000000-0000-4000-8000-0000000000c3'),
  'la reserva queda vencida');

\echo '  · llegada'
insert into public.reservations (id, restaurant_id, diner_id, starts_at, party_size, status, expires_at) values
  ('e0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   '00000000-0000-4000-8000-0000000000c2', now() + interval '10 minutes', 2, 'confirmed', now()),
  ('e0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   '00000000-0000-4000-8000-0000000000c2', now() + interval '2 days', 2, 'confirmed', now());
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b1');
select tests.expect_error($$select public.mark_attendance('e0000000-0000-4000-8000-000000000003', true)$$, 'ATTENDANCE_TOO_EARLY');
select tests.check((select status = 'completed' from public.mark_attendance('e0000000-0000-4000-8000-000000000002', true)),
  'marca que llegó');
select tests.expect_error($$select public.mark_attendance('e0000000-0000-4000-8000-000000000002', false)$$, 'RESERVATION_NOT_CONFIRMED');
reset role;
select tests.check(
  (select send_after >= now() + interval '129 minutes' from public.notification_outbox
   where kind = 'review_invite' and data ->> 'reservation_id' = 'e0000000-0000-4000-8000-000000000002'),
  'la invitación a calificar sale 2 horas después de la hora reservada');

\echo '  · calificaciones verificadas'
-- Visitas pasadas completadas, una por comensal, y casos que no se pueden calificar.
insert into public.reservations (id, restaurant_id, diner_id, starts_at, party_size, status, expires_at) values
  ('f0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c1', now() - interval '3 hours', 2, 'completed', now()),
  ('f0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c2', now() - interval '1 day', 4, 'completed', now()),
  ('f0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c3', now() - interval '2 days', 2, 'completed', now()),
  ('f0000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c4', now() - interval '3 days', 3, 'completed', now()),
  ('f0000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c5', now() - interval '4 days', 2, 'completed', now()),
  ('f0000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c1', now() - interval '5 days', 2, 'no_show', now()),
  ('f0000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c1', now() - interval '15 days', 2, 'completed', now());

set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000c2');
select tests.expect_error($$insert into public.reviews (reservation_id, diner_id, rating)
  values ('e0000000-0000-4000-8000-000000000002', auth.uid(), 5)$$, 'REVIEW_NOT_OPEN_YET');
select tests.expect_error($$insert into public.reviews (reservation_id, diner_id, rating)
  values ('f0000000-0000-4000-8000-000000000001', auth.uid(), 1)$$, 'REVIEW_NOT_ALLOWED');

select tests.login('00000000-0000-4000-8000-0000000000c1');
insert into public.reviews (reservation_id, diner_id, rating, comment, tags, dish_ids, restaurant_reply)
values ('f0000000-0000-4000-8000-000000000001', auth.uid(), 5, '  La costilla se deshace.  ', '{Sabor,Porción}',
        array[(select id from public.dishes where name = 'Costilla ahumada 12 horas'),
              (select id from public.dishes where name = 'Ajiaco santafereño')],
        'Respuesta falsa');
select tests.check(
  (select author_name = 'Camila R.' and comment = 'La costilla se deshace.' and restaurant_reply is null
          and cardinality(dish_ids) = 1
   from public.reviews where reservation_id = 'f0000000-0000-4000-8000-000000000001'),
  'la reseña guarda nombre corto, limpia el texto e ignora platos de otro restaurante y respuestas falsas');
select tests.expect_error($$insert into public.reviews (reservation_id, diner_id, rating)
  values ('f0000000-0000-4000-8000-000000000001', auth.uid(), 4)$$, 'REVIEW_EXISTS');
select tests.expect_error($$insert into public.reviews (reservation_id, diner_id, rating)
  values ('f0000000-0000-4000-8000-000000000006', auth.uid(), 1)$$, 'REVIEW_NOT_ALLOWED');
select tests.expect_error($$insert into public.reviews (reservation_id, diner_id, rating)
  values ('f0000000-0000-4000-8000-000000000007', auth.uid(), 3)$$, 'REVIEW_WINDOW_CLOSED');
select tests.check(
  (select rating_avg is null and rating_count = 1 from public.restaurant_rating('11111111-1111-4111-8111-111111111111')),
  'con menos de 5 reseñas no se muestra promedio');

select tests.login('00000000-0000-4000-8000-0000000000c2');
insert into public.reviews (reservation_id, diner_id, rating) values ('f0000000-0000-4000-8000-000000000002', auth.uid(), 4);
select tests.login('00000000-0000-4000-8000-0000000000c3');
insert into public.reviews (reservation_id, diner_id, rating) values ('f0000000-0000-4000-8000-000000000003', auth.uid(), 5);
select tests.login('00000000-0000-4000-8000-0000000000c4');
insert into public.reviews (reservation_id, diner_id, rating) values ('f0000000-0000-4000-8000-000000000004', auth.uid(), 4);
select tests.login('00000000-0000-4000-8000-0000000000c5');
insert into public.reviews (reservation_id, diner_id, rating, comment) values ('f0000000-0000-4000-8000-000000000005', auth.uid(), 5, 'Volvemos seguro');
select tests.check(
  (select rating_avg = 4.6 and rating_count = 5 from public.restaurant_rating('11111111-1111-4111-8111-111111111111')),
  'con 5 reseñas el promedio es 4,6');
select tests.expect_error($$select public.reply_review((select id from public.reviews limit 1), 'Gracias')$$, 'NOT_FOUND');

select tests.login('00000000-0000-4000-8000-0000000000b1');
select tests.check(
  (select restaurant_reply = '¡Gracias, Paula!' from public.reply_review(
     (select id from public.reviews where comment = 'Volvemos seguro'), '¡Gracias, Paula!')),
  'el restaurante responde una vez');
select tests.expect_error($$select public.reply_review((select id from public.reviews where comment = 'Volvemos seguro'), 'Otra')$$,
  'REPLY_EXISTS');
update public.reviews set rating = 5;
select tests.check((select count(*) from public.reviews where rating < 5) = 2, 'el restaurante no puede editar ni borrar reseñas');
delete from public.reviews;
select tests.check((select count(*) from public.reviews) = 5, 'borrar reseñas no tiene efecto para el restaurante');
reset role;

set role anon;
select tests.logout();
select tests.check((select count(*) from public.reviews) = 5, 'las reseñas son públicas');
reset role;

set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000a1');
select public.set_review_hidden((select id from public.reviews where rating = 4 limit 1), true);
reset role;
set role anon;
select tests.logout();
select tests.check((select count(*) from public.reviews) = 4, 'una reseña ocultada por el admin deja de verse');
reset role;

\echo '  · menú y videos'
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b1');
insert into public.dishes (restaurant_id, category_id, name, price_cop, video_uid, video_status)
values ('11111111-1111-4111-8111-111111111111', 'a1000000-0000-4000-8000-000000000002', 'Punta de anca', 49000, 'video-falso', 'approved');
select tests.check((select video_uid is null and video_status = 'none' from public.dishes where name = 'Punta de anca'),
  'el restaurante no puede publicar un video sin pasar por el proceso');
select tests.expect_error($$update public.dishes set video_uid = 'otro' where name = 'Punta de anca'$$, 'VIDEO_FIELDS_LOCKED');
update public.dishes set price_cop = 51000, is_available = false where name = 'Punta de anca';
select tests.check((select price_cop = 51000 from public.dishes where name = 'Punta de anca'), 'cambia precio y disponibilidad');
select tests.expect_error($$insert into public.dishes (restaurant_id, category_id, name, price_cop)
  values ('22222222-2222-4222-8222-222222222222', 'a2000000-0000-4000-8000-000000000001', 'Intruso', 1000)$$,
  '%row-level security%');
select tests.expect_error($$insert into public.dishes (restaurant_id, category_id, name, price_cop)
  values ('11111111-1111-4111-8111-111111111111', 'a2000000-0000-4000-8000-000000000001', 'Cruce', 1000)$$,
  'CATEGORY_MISMATCH');
select tests.expect_error($$update public.restaurants set status = 'suspended' where id = '11111111-1111-4111-8111-111111111111'$$,
  'FORBIDDEN');
update public.restaurants set description = 'Leña de naranjo desde 2014.' where id = '11111111-1111-4111-8111-111111111111';
reset role;

-- El servidor registra un video procesado (lo hace stream-webhook con la llave de servicio).
set role service_role;
select tests.login_service();
update public.dishes set candidate_video_uid = 'cf-uid-1', candidate_duration_seconds = 8.4,
  candidate_thumbnail_url = 'https://example.com/t.jpg', video_status = 'in_review'
where name = 'Costilla ahumada 12 horas';
select tests.expect_error($$update public.dishes set candidate_duration_seconds = 10.5 where name = 'Picaña al carbón'$$,
  '%check constraint%');
reset role;

set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b1');
select tests.expect_error($$select public.review_dish_video((select id from public.dishes where name = 'Costilla ahumada 12 horas'), true)$$,
  'FORBIDDEN');
select tests.login('00000000-0000-4000-8000-0000000000a1');
select tests.check(
  (select video_uid = 'cf-uid-1' and duration_seconds = 8.4 and video_status = 'approved' and candidate_video_uid is null
   from public.review_dish_video((select id from public.dishes where name = 'Costilla ahumada 12 horas'), true)),
  'el admin aprueba y el video pasa a publicado');
reset role;

set role anon;
select tests.logout();
select tests.check((select count(*) = 1 and bool_and(dish_name = 'Costilla ahumada 12 horas') from public.discover_feed()),
  'el feed muestra solo platos con video aprobado');
insert into public.dish_views (dish_id, restaurant_id, watched_seconds)
values ((select dish_id from public.discover_feed() limit 1), '22222222-2222-4222-8222-222222222222', 7.5);
reset role;
select tests.check((select restaurant_id = '11111111-1111-4111-8111-111111111111' from public.dish_views limit 1),
  'una vista se atribuye al restaurante real del plato');

-- Límite de platos del plan Esencial (se baja a 2 solo para la prueba).
update public.plans set max_dishes = 2 where id = 'esencial';
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000b2');
select tests.expect_error($$insert into public.dishes (restaurant_id, category_id, name, price_cop)
  values ('22222222-2222-4222-8222-222222222222', 'a2000000-0000-4000-8000-000000000002', 'Tamal', 15000)$$,
  'PLAN_LIMIT');
select tests.check((select (public.restaurant_stats('22222222-2222-4222-8222-222222222222') -> 'top_dishes') = 'null'::jsonb),
  'el plan Esencial no incluye estadísticas por plato');
select tests.login('00000000-0000-4000-8000-0000000000b1');
select tests.check(
  (select (s -> 'analytics_enabled')::boolean and jsonb_array_length(s -> 'top_dishes') > 0
   from public.restaurant_stats('11111111-1111-4111-8111-111111111111') s),
  'el plan Pro ve vistas por plato');
reset role;
update public.plans set max_dishes = 30 where id = 'esencial';

\echo '  · roles y suscripciones'
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000c1');
select tests.expect_error($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'FORBIDDEN');
update public.profiles set full_name = 'Camila Rojas M.' where id = auth.uid();
reset role;

update public.subscriptions set status = 'past_due', grace_until = now() - interval '1 minute'
where restaurant_id = '33333333-3333-4333-8333-333333333333';
set role authenticated;
select tests.login('00000000-0000-4000-8000-0000000000c1');
select tests.check((select count(*) from public.restaurants) = 2, 'un restaurante con pago vencido deja de aparecer');
select tests.check((select count(*) from public.get_available_slots('33333333-3333-4333-8333-333333333333', tests.next_friday(), 2)) = 0,
  'y no ofrece horarios');
select tests.expect_error($$select public.create_reservation('33333333-3333-4333-8333-333333333333', tests.at_local(tests.next_friday(), '20:00'), 2)$$,
  'RESTAURANT_NOT_BOOKABLE');
reset role;
update public.subscriptions set grace_until = now() + interval '3 days'
where restaurant_id = '33333333-3333-4333-8333-333333333333';
set role anon;
select tests.logout();
select tests.check((select count(*) from public.restaurants) = 3, 'durante los 7 días de gracia sigue visible');
reset role;

\echo '  ✓ 10_platform'
