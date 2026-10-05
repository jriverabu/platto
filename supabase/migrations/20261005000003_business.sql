-- ============================================================================
-- Platto · 3/4 · Reglas del negocio
-- Franjas, ciclo de vida de reservas, calificaciones verificadas, videos,
-- descubrimiento y estadísticas. Espejo de packages/core.
-- Errores: el mensaje es un código estable (SLOT_FULL, TOO_SOON…) que la app traduce.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Notificaciones (cola)
-- ---------------------------------------------------------------------------
create or replace function private.notify(
  p_profile uuid, p_kind text, p_title text, p_body text,
  p_data jsonb default '{}'::jsonb, p_send_after timestamptz default now()
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_outbox (profile_id, kind, title, body, data, send_after)
  values (p_profile, p_kind, p_title, p_body, p_data, p_send_after);
$$;

create or replace function private.notify_members(
  p_restaurant uuid, p_kind text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_outbox (profile_id, kind, title, body, data)
  select m.profile_id, p_kind, p_title, p_body, p_data
  from public.restaurant_members m
  where m.restaurant_id = p_restaurant;
$$;

-- "8:00 p. m." y "vie 9 oct" en la zona del restaurante, para los textos de las notificaciones.
create or replace function private.local_label(p_at timestamptz, p_tz text)
returns text
language sql
stable
set search_path = ''
as $$
  select (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from p_at at time zone p_tz)::int + 1]
    || ' ' || extract(day from p_at at time zone p_tz)::int
    || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from p_at at time zone p_tz)::int]
    || ' · ' || (case when extract(hour from p_at at time zone p_tz)::int % 12 = 0 then 12
                      else extract(hour from p_at at time zone p_tz)::int % 12 end)
    || ':' || to_char(p_at at time zone p_tz, 'MI')
    || case when extract(hour from p_at at time zone p_tz) < 12 then ' a. m.' else ' p. m.' end;
$$;

-- ---------------------------------------------------------------------------
-- Franjas disponibles
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_restaurant uuid,
  p_date date,
  p_party integer default 2
)
returns table (
  starts_at timestamptz,
  clock text,
  capacity integer,
  remaining integer,
  available boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
begin
  select r.timezone into v_tz from public.restaurants r where r.id = p_restaurant;
  if v_tz is null
     or not (private.restaurant_is_listed(p_restaurant) or private.is_member(p_restaurant) or private.is_admin())
     or exists (select 1 from public.blackout_dates b where b.restaurant_id = p_restaurant and b.day = p_date) then
    return;
  end if;

  return query
  with candidate as (
    select distinct on (t.local_time)
      t.local_time,
      ((p_date + t.local_time) at time zone v_tz) as at,
      ar.capacity_people
    from public.availability_rules ar
    cross join lateral (
      select gs::time as local_time
      from generate_series(
        p_date + ar.start_time,
        p_date + ar.end_time - interval '1 second',
        make_interval(mins => ar.slot_minutes)
      ) gs
    ) t
    where ar.restaurant_id = p_restaurant
      and ar.weekday = extract(dow from p_date)
    order by t.local_time, ar.capacity_people desc
  ),
  taken as (
    select res.starts_at as at, sum(res.party_size)::integer as people
    from public.reservations res
    where res.restaurant_id = p_restaurant
      and res.starts_at >= (p_date::timestamp at time zone v_tz)
      and res.starts_at < ((p_date + 1)::timestamp at time zone v_tz)
      and (res.status = 'confirmed' or (res.status = 'pending' and res.expires_at > now()))
    group by res.starts_at
  )
  select
    c.at,
    to_char(c.local_time, 'HH24:MI'),
    c.capacity_people,
    greatest(0, c.capacity_people - coalesce(tk.people, 0)),
    case
      when c.at <= now() then false
      when c.at < now() + private.min_lead() then false
      when c.capacity_people - coalesce(tk.people, 0) < p_party then false
      else true
    end,
    case
      when c.at <= now() then 'past'
      when c.at < now() + private.min_lead() then 'too_soon'
      when c.capacity_people - coalesce(tk.people, 0) < p_party then 'full'
      else null
    end
  from candidate c
  left join taken tk on tk.at = c.at
  order by c.at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Crear una reserva (comensal)
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_restaurant uuid,
  p_starts_at timestamptz,
  p_party integer,
  p_note text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_restaurant public.restaurants;
  v_slot record;
  v_row public.reservations;
begin
  if v_uid is null then
    perform private.fail('AUTH_REQUIRED', 'Inicia sesión para reservar.');
  end if;
  if p_party is null or p_party < 1 or p_party > private.max_party() then
    perform private.fail('INVALID_PARTY_SIZE', 'Número de personas inválido.');
  end if;

  -- Bloquea el restaurante: dos solicitudes simultáneas no pueden sobrevender la misma franja.
  select * into v_restaurant from public.restaurants where id = p_restaurant for update;
  if not found or not private.restaurant_is_listed(p_restaurant) or not v_restaurant.reservations_enabled then
    perform private.fail('RESTAURANT_NOT_BOOKABLE', 'Este restaurante no está recibiendo reservas.');
  end if;
  if p_starts_at < now() + private.min_lead() then
    perform private.fail('TOO_SOON', 'Reserva con al menos una hora de anticipación.');
  end if;
  if p_starts_at > now() + private.booking_horizon() then
    perform private.fail('TOO_FAR', 'Solo se puede reservar hasta 30 días adelante.');
  end if;

  select * into v_slot
  from public.get_available_slots(p_restaurant, (p_starts_at at time zone v_restaurant.timezone)::date, p_party) s
  where s.starts_at = p_starts_at;
  if not found then
    perform private.fail('SLOT_NOT_OFFERED', 'Ese horario no está disponible.');
  end if;
  if not v_slot.available then
    perform private.fail('SLOT_FULL', 'Ya no hay cupo para ese horario.');
  end if;

  if exists (
    select 1 from public.reservations
    where diner_id = v_uid and restaurant_id = p_restaurant and starts_at = p_starts_at
      and (status = 'confirmed' or (status = 'pending' and expires_at > now()))
  ) then
    perform private.fail('DUPLICATE_RESERVATION', 'Ya tienes una reserva a esa hora.');
  end if;

  insert into public.reservations (restaurant_id, diner_id, starts_at, party_size, note, expires_at)
  values (
    p_restaurant, v_uid, p_starts_at, p_party, nullif(btrim(p_note), ''),
    least(now() + private.response_window(), p_starts_at)
  )
  returning * into v_row;

  perform private.notify_members(
    p_restaurant, 'reservation_requested', 'Nueva solicitud de reserva',
    format('Mesa para %s · %s', p_party, private.local_label(p_starts_at, v_restaurant.timezone)),
    jsonb_build_object('reservation_id', v_row.id)
  );
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Responder (restaurante)
-- ---------------------------------------------------------------------------
create or replace function public.respond_reservation(p_reservation uuid, p_accept boolean)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.reservations;
  v_restaurant public.restaurants;
begin
  select * into v_row from public.reservations where id = p_reservation for update;
  if not found or not (private.is_member(v_row.restaurant_id) or private.is_admin()) then
    perform private.fail('NOT_FOUND', 'Reserva no encontrada.');
  end if;
  if v_row.status <> 'pending' then
    perform private.fail('RESERVATION_NOT_PENDING', 'Esta reserva ya fue respondida.');
  end if;
  if v_row.expires_at <= now() then
    perform private.fail('RESERVATION_EXPIRED', 'La solicitud venció.');
  end if;

  update public.reservations
  set status = case when p_accept then 'confirmed'::public.reservation_status else 'rejected'::public.reservation_status end,
      responded_at = now()
  where id = p_reservation
  returning * into v_row;

  select * into v_restaurant from public.restaurants where id = v_row.restaurant_id;
  perform private.notify(
    v_row.diner_id,
    case when p_accept then 'reservation_confirmed' else 'reservation_rejected' end,
    case when p_accept then '¡Tu mesa está confirmada!' else 'No hay mesa para ese horario' end,
    case when p_accept
      then format('%s te espera el %s.', v_restaurant.name, private.local_label(v_row.starts_at, v_restaurant.timezone))
      else format('%s no pudo recibirte. Mira otros horarios u opciones cerca.', v_restaurant.name)
    end,
    jsonb_build_object('reservation_id', v_row.id)
  );

  if p_accept then
    -- Recordatorio 3 horas antes (si todavía falta más de eso).
    if v_row.starts_at - interval '3 hours' > now() then
      perform private.notify(
        v_row.diner_id, 'reservation_reminder', 'Hoy tienes reserva',
        format('%s · %s · mesa para %s', v_restaurant.name,
               private.local_label(v_row.starts_at, v_restaurant.timezone), v_row.party_size),
        jsonb_build_object('reservation_id', v_row.id),
        v_row.starts_at - interval '3 hours'
      );
    end if;
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar (comensal)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_reservation(p_reservation uuid)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.reservations;
  v_tz text;
begin
  select * into v_row from public.reservations where id = p_reservation for update;
  if not found or v_row.diner_id is distinct from auth.uid() then
    perform private.fail('NOT_FOUND', 'Reserva no encontrada.');
  end if;

  if v_row.status = 'pending' and v_row.expires_at > now() then
    null; -- siempre se puede retirar una solicitud
  elsif v_row.status = 'confirmed' then
    if v_row.starts_at - now() < private.cancel_cutoff() then
      perform private.fail('CANCEL_TOO_LATE', 'Solo puedes cancelar hasta 2 horas antes.');
    end if;
  else
    perform private.fail('RESERVATION_NOT_CANCELLABLE', 'Esta reserva ya no se puede cancelar.');
  end if;

  update public.reservations set status = 'cancelled', cancelled_at = now()
  where id = p_reservation returning * into v_row;

  -- Quita el recordatorio pendiente.
  delete from public.notification_outbox
  where sent_at is null and kind = 'reservation_reminder' and data ->> 'reservation_id' = v_row.id::text;

  select timezone into v_tz from public.restaurants where id = v_row.restaurant_id;
  perform private.notify_members(
    v_row.restaurant_id, 'reservation_cancelled', 'Reserva cancelada',
    format('Mesa para %s · %s', v_row.party_size, private.local_label(v_row.starts_at, v_tz)),
    jsonb_build_object('reservation_id', v_row.id)
  );
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marcar llegada (restaurante)
-- ---------------------------------------------------------------------------
create or replace function public.mark_attendance(p_reservation uuid, p_arrived boolean)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.reservations;
  v_name text;
begin
  select * into v_row from public.reservations where id = p_reservation for update;
  if not found or not (private.is_member(v_row.restaurant_id) or private.is_admin()) then
    perform private.fail('NOT_FOUND', 'Reserva no encontrada.');
  end if;
  if v_row.status <> 'confirmed' then
    perform private.fail('RESERVATION_NOT_CONFIRMED', 'Solo se marca la llegada de reservas confirmadas.');
  end if;
  if now() < v_row.starts_at - private.attendance_opens_before() then
    perform private.fail('ATTENDANCE_TOO_EARLY', 'Todavía no es la hora de esta reserva.');
  end if;

  update public.reservations
  set status = case when p_arrived then 'completed'::public.reservation_status else 'no_show'::public.reservation_status end,
      attended_at = now()
  where id = p_reservation
  returning * into v_row;

  if p_arrived then
    select name into v_name from public.restaurants where id = v_row.restaurant_id;
    perform private.notify(
      v_row.diner_id, 'review_invite', format('¿Cómo estuvo %s?', v_name),
      'Califica tu visita en 10 segundos. Tu opinión es verificada.',
      jsonb_build_object('reservation_id', v_row.id),
      greatest(now(), v_row.starts_at + private.review_opens_after())
    );
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vencimiento automático (lo ejecuta pg_cron cada 5 minutos)
-- ---------------------------------------------------------------------------
create or replace function public.expire_pending_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    update public.reservations res
    set status = 'expired'
    where res.status = 'pending' and res.expires_at <= now()
    returning res.id, res.diner_id, res.restaurant_id
  loop
    v_count := v_count + 1;
    perform private.notify(
      v_row.diner_id, 'reservation_expired', 'Tu solicitud no recibió respuesta',
      (select format('%s no respondió a tiempo. Te mostramos otras opciones cerca.', name)
         from public.restaurants where id = v_row.restaurant_id),
      jsonb_build_object('reservation_id', v_row.id)
    );
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Calificaciones verificadas
-- ---------------------------------------------------------------------------
create or replace function private.validate_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.reservations;
  v_name text;
begin
  select * into v_res from public.reservations where id = new.reservation_id;
  if not found or v_res.diner_id is distinct from auth.uid() then
    perform private.fail('REVIEW_NOT_ALLOWED', 'Solo calificas tus propias visitas.');
  end if;
  if exists (select 1 from public.reviews where reservation_id = new.reservation_id) then
    perform private.fail('REVIEW_EXISTS', 'Ya calificaste esta visita.');
  end if;
  if v_res.status <> 'completed' then
    perform private.fail('REVIEW_NOT_ALLOWED', 'Solo se califican visitas completadas.');
  end if;
  if now() < v_res.starts_at + private.review_opens_after() then
    perform private.fail('REVIEW_NOT_OPEN_YET', 'Podrás calificar 2 horas después de tu reserva.');
  end if;
  if now() > v_res.starts_at + private.review_closes_after() then
    perform private.fail('REVIEW_WINDOW_CLOSED', 'El plazo para calificar es de 14 días.');
  end if;

  -- Datos que no decide quien escribe.
  new.restaurant_id := v_res.restaurant_id;
  new.diner_id := v_res.diner_id;
  new.restaurant_reply := null;
  new.replied_at := null;
  new.is_hidden := false;
  new.comment := nullif(btrim(coalesce(new.comment, '')), '');
  new.dish_ids := coalesce(array(
    select d.id from public.dishes d
    where d.id = any (new.dish_ids) and d.restaurant_id = v_res.restaurant_id
  ), '{}');

  select case
           when position(' ' in btrim(full_name)) > 0
             then split_part(btrim(full_name), ' ', 1) || ' ' || left(split_part(btrim(full_name), ' ', 2), 1) || '.'
           else coalesce(nullif(btrim(full_name), ''), 'Comensal')
         end
    into v_name
  from public.profiles where id = v_res.diner_id;
  new.author_name := coalesce(v_name, 'Comensal');
  return new;
end;
$$;

create trigger reviews_validate before insert on public.reviews
  for each row execute function private.validate_review();

create or replace function private.after_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_members(
    new.restaurant_id, 'review_received', format('Nueva calificación: %s de 5', new.rating),
    coalesce(left(new.comment, 120), 'Sin comentario.'),
    jsonb_build_object('review_id', new.id)
  );
  return null;
end;
$$;

create trigger reviews_after_insert after insert on public.reviews
  for each row execute function private.after_review();

create or replace function public.reply_review(p_review uuid, p_reply text)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.reviews;
begin
  select * into v_row from public.reviews where id = p_review for update;
  if not found or not private.is_member(v_row.restaurant_id) then
    perform private.fail('NOT_FOUND', 'Reseña no encontrada.');
  end if;
  if v_row.restaurant_reply is not null then
    perform private.fail('REPLY_EXISTS', 'Ya respondiste esta reseña.');
  end if;
  if p_reply is null or char_length(btrim(p_reply)) = 0 or char_length(p_reply) > 500 then
    perform private.fail('INVALID_REPLY', 'La respuesta debe tener entre 1 y 500 caracteres.');
  end if;
  update public.reviews set restaurant_reply = btrim(p_reply), replied_at = now()
  where id = p_review returning * into v_row;
  return v_row;
end;
$$;

-- Calificación pública: promedio solo con 5 reseñas o más.
create or replace function public.restaurant_rating(p_restaurant uuid)
returns table (rating_avg numeric, rating_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when count(*) >= private.min_reviews_for_average() then round(avg(rating)::numeric, 1) end,
    count(*)::integer
  from public.reviews
  where restaurant_id = p_restaurant and not is_hidden;
$$;

-- ---------------------------------------------------------------------------
-- Moderación (administrador)
-- ---------------------------------------------------------------------------
create or replace function public.review_dish_video(p_dish uuid, p_approve boolean, p_note text default null)
returns public.dishes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.dishes;
begin
  if not private.is_admin() then
    perform private.fail('FORBIDDEN', 'Solo administradores.');
  end if;
  select * into v_row from public.dishes where id = p_dish for update;
  if not found then
    perform private.fail('NOT_FOUND', 'Plato no encontrado.');
  end if;
  if v_row.video_status <> 'in_review' or v_row.candidate_video_uid is null then
    perform private.fail('NOTHING_TO_REVIEW', 'Este plato no tiene un video en revisión.');
  end if;

  if p_approve then
    update public.dishes
    set video_uid = candidate_video_uid,
        thumbnail_url = candidate_thumbnail_url,
        duration_seconds = candidate_duration_seconds,
        candidate_video_uid = null,
        candidate_thumbnail_url = null,
        candidate_duration_seconds = null,
        video_status = 'approved',
        video_review_note = null
    where id = p_dish returning * into v_row;
  else
    update public.dishes
    set video_status = 'rejected', video_review_note = coalesce(nullif(btrim(p_note), ''), 'No cumple el estándar visual.')
    where id = p_dish returning * into v_row;
  end if;

  perform private.notify_members(
    v_row.restaurant_id,
    case when p_approve then 'video_approved' else 'video_rejected' end,
    case when p_approve then 'Tu video ya está publicado' else 'Tu video necesita cambios' end,
    case when p_approve then format('%s ya se ve en Platto.', v_row.name)
         else format('%s: %s', v_row.name, v_row.video_review_note) end,
    jsonb_build_object('dish_id', v_row.id)
  );
  return v_row;
end;
$$;

create or replace function public.set_review_hidden(p_review uuid, p_hidden boolean)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.reviews;
begin
  if not private.is_admin() then
    perform private.fail('FORBIDDEN', 'Solo administradores.');
  end if;
  update public.reviews set is_hidden = p_hidden where id = p_review returning * into v_row;
  if not found then
    perform private.fail('NOT_FOUND', 'Reseña no encontrada.');
  end if;
  update public.review_reports set resolved_at = now() where review_id = p_review and resolved_at is null;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Descubrimiento (público)
-- ---------------------------------------------------------------------------
create or replace function public.list_restaurants(
  p_zone text default null,
  p_cuisine text default null,
  p_max_price integer default null,
  p_search text default null
)
returns table (
  id uuid, slug text, name text, cuisine text, zone text, price_level smallint,
  description text, cover_video_uid text, cover_thumbnail_url text, lat double precision, lng double precision,
  rating_avg numeric, rating_count integer, featured boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.slug, r.name, r.cuisine, r.zone, r.price_level, r.description,
         r.cover_video_uid, r.cover_thumbnail_url, r.lat, r.lng,
         rt.rating_avg, rt.rating_count, p.featured
  from public.restaurants r
  join public.subscriptions s on s.restaurant_id = r.id
  join public.plans p on p.id = s.plan
  cross join lateral public.restaurant_rating(r.id) rt
  where private.restaurant_is_listed(r.id)
    and (p_zone is null or r.zone = p_zone)
    and (p_cuisine is null or r.cuisine = p_cuisine)
    and (p_max_price is null or r.price_level <= p_max_price)
    and (p_search is null or r.name ilike '%' || p_search || '%' or r.cuisine ilike '%' || p_search || '%')
  order by p.featured desc, rt.rating_avg desc nulls last, r.name;
$$;

-- El feed de Descubrir: platos con video aprobado de restaurantes visibles.
-- Los planes Pro aparecen primero; dentro de cada grupo se mezcla por día para que el feed cambie.
create or replace function public.discover_feed(
  p_limit integer default 20,
  p_offset integer default 0,
  p_zone text default null
)
returns table (
  dish_id uuid, dish_name text, description text, price_cop integer,
  video_uid text, thumbnail_url text, duration_seconds numeric,
  restaurant_id uuid, restaurant_name text, restaurant_slug text, zone text,
  rating_avg numeric, rating_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.name, d.description, d.price_cop,
         d.video_uid, d.thumbnail_url, d.duration_seconds,
         r.id, r.name, r.slug, r.zone,
         rt.rating_avg, rt.rating_count
  from public.dishes d
  join public.restaurants r on r.id = d.restaurant_id
  join public.subscriptions s on s.restaurant_id = r.id
  join public.plans p on p.id = s.plan
  cross join lateral public.restaurant_rating(r.id) rt
  where private.restaurant_is_listed(r.id)
    and d.video_uid is not null
    and d.is_available
    and (p_zone is null or r.zone = p_zone)
  order by p.featured desc, md5(d.id::text || current_date::text)
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- Estadísticas del restaurante (plan Pro)
-- ---------------------------------------------------------------------------
create or replace function public.restaurant_stats(
  p_restaurant uuid,
  p_from timestamptz default date_trunc('month', now()),
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_analytics boolean;
  v_result jsonb;
begin
  if not (private.is_member(p_restaurant) or private.is_admin()) then
    perform private.fail('NOT_FOUND', 'Restaurante no encontrado.');
  end if;

  select p.analytics into v_analytics
  from public.subscriptions s join public.plans p on p.id = s.plan
  where s.restaurant_id = p_restaurant;

  select jsonb_build_object(
    'reservations', (
      select jsonb_build_object(
        'total', count(*),
        'completed', count(*) filter (where status = 'completed'),
        'no_show', count(*) filter (where status = 'no_show'),
        'people', coalesce(sum(party_size) filter (where status in ('confirmed', 'completed')), 0),
        'answered_in_time', count(*) filter (where responded_at is not null),
        'expired', count(*) filter (where status = 'expired')
      )
      from public.reservations
      where restaurant_id = p_restaurant and created_at >= p_from and created_at < p_to
    ),
    'rating', (select to_jsonb(rt) from public.restaurant_rating(p_restaurant) rt),
    'top_dishes', case when coalesce(v_analytics, false) then (
      select coalesce(jsonb_agg(x order by x.views desc), '[]'::jsonb)
      from (
        select d.id as dish_id, d.name, count(v.id) as views,
               round(avg(v.watched_seconds), 1) as avg_watched_seconds
        from public.dishes d
        left join public.dish_views v on v.dish_id = d.id and v.created_at >= p_from and v.created_at < p_to
        where d.restaurant_id = p_restaurant
        group by d.id, d.name
        order by views desc
        limit 10
      ) x
    ) else null end,
    'analytics_enabled', coalesce(v_analytics, false)
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
-- Postgres permite ejecutar funciones a PUBLIC por defecto: se cierra y se abre a quien corresponde.
revoke execute on function
  public.get_available_slots(uuid, date, integer),
  public.create_reservation(uuid, timestamptz, integer, text),
  public.respond_reservation(uuid, boolean),
  public.cancel_reservation(uuid),
  public.mark_attendance(uuid, boolean),
  public.expire_pending_reservations(),
  public.reply_review(uuid, text),
  public.restaurant_rating(uuid),
  public.review_dish_video(uuid, boolean, text),
  public.set_review_hidden(uuid, boolean),
  public.list_restaurants(text, text, integer, text),
  public.discover_feed(integer, integer, text),
  public.restaurant_stats(uuid, timestamptz, timestamptz)
from public, anon, authenticated;

grant execute on function
  public.get_available_slots(uuid, date, integer),
  public.restaurant_rating(uuid),
  public.list_restaurants(text, text, integer, text),
  public.discover_feed(integer, integer, text)
to anon, authenticated;

grant execute on function
  public.create_reservation(uuid, timestamptz, integer, text),
  public.respond_reservation(uuid, boolean),
  public.cancel_reservation(uuid),
  public.mark_attendance(uuid, boolean),
  public.reply_review(uuid, text),
  public.review_dish_video(uuid, boolean, text),
  public.set_review_hidden(uuid, boolean),
  public.restaurant_stats(uuid, timestamptz, timestamptz)
to authenticated;

grant execute on function public.expire_pending_reservations() to service_role;

revoke execute on function
  private.notify(uuid, text, text, text, jsonb, timestamptz),
  private.notify_members(uuid, text, text, text, jsonb)
from public, anon, authenticated;
