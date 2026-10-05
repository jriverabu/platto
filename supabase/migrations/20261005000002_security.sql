-- ============================================================================
-- Platto · 2/4 · Seguridad
-- Reglas fijas, funciones de apoyo, protecciones de columnas y Row Level Security.
-- Principio: los clientes leen con RLS y cambian el estado de reservas y videos
-- solo a través de funciones (migración 3), nunca escribiendo las columnas directo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Reglas del negocio (mismas cifras que packages/core/src/rules.ts)
-- ---------------------------------------------------------------------------
create or replace function private.response_window() returns interval language sql immutable as $$ select interval '120 minutes' $$;
create or replace function private.min_lead() returns interval language sql immutable as $$ select interval '60 minutes' $$;
create or replace function private.cancel_cutoff() returns interval language sql immutable as $$ select interval '120 minutes' $$;
create or replace function private.attendance_opens_before() returns interval language sql immutable as $$ select interval '30 minutes' $$;
create or replace function private.booking_horizon() returns interval language sql immutable as $$ select interval '30 days' $$;
create or replace function private.max_party() returns integer language sql immutable as $$ select 12 $$;
create or replace function private.review_opens_after() returns interval language sql immutable as $$ select interval '120 minutes' $$;
create or replace function private.review_closes_after() returns interval language sql immutable as $$ select interval '14 days' $$;
create or replace function private.min_reviews_for_average() returns integer language sql immutable as $$ select 5 $$;
create or replace function private.grace_period() returns interval language sql immutable as $$ select interval '7 days' $$;

-- Lanza un error de negocio: el código va en el mensaje (la app lo traduce con packages/core)
-- y el texto en español va en hint para depuración.
create or replace function private.fail(p_code text, p_hint text default null)
returns void
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = p_code, hint = coalesce(p_hint, p_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- Funciones de apoyo para las políticas
-- ---------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function private.is_member(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.restaurant_members
    where restaurant_id = p_restaurant and profile_id = auth.uid()
  );
$$;

-- Un restaurante es visible si está activo y su suscripción está al día o en gracia.
create or replace function private.restaurant_is_listed(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurants r
    join public.subscriptions s on s.restaurant_id = r.id
    where r.id = p_restaurant
      and r.status = 'active'
      and (
        s.status in ('active', 'trialing')
        or (s.status = 'past_due' and s.grace_until is not null and s.grace_until > now())
      )
  );
$$;

-- Llamadas del servidor (service_role) o de un superusuario en el editor SQL.
-- SECURITY INVOKER a propósito: así ve el rol real de quien escribe.
create or replace function private.is_privileged()
returns boolean
language sql
stable
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin', 'service_role');
$$;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function
  private.is_admin(),
  private.is_member(uuid),
  private.restaurant_is_listed(uuid),
  private.is_privileged()
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Protecciones de columnas (lo que RLS no puede expresar por columna)
-- ---------------------------------------------------------------------------

-- Nadie se cambia el rol a sí mismo.
create or replace function private.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not (private.is_privileged() or private.is_admin()) then
    perform private.fail('FORBIDDEN', 'Solo un administrador cambia roles.');
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profile();

-- El restaurante edita sus datos, pero no su estado ni su dirección web.
create or replace function private.guard_restaurant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_privileged() or private.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status or new.slug is distinct from old.slug then
    perform private.fail('FORBIDDEN', 'El estado y la dirección del restaurante los cambia Platto.');
  end if;
  if new.cover_video_uid is distinct from old.cover_video_uid then
    perform private.fail('VIDEO_FIELDS_LOCKED', 'Los videos se cambian subiendo uno nuevo.');
  end if;
  return new;
end;
$$;

create trigger restaurants_guard before update on public.restaurants
  for each row execute function private.guard_restaurant();

-- Los campos de video de un plato solo los escriben el servidor (al procesar) y el administrador (al aprobar).
create or replace function private.guard_dish()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_category_restaurant uuid;
  v_max integer;
  v_count integer;
begin
  select restaurant_id into v_category_restaurant from public.menu_categories where id = new.category_id;
  if v_category_restaurant is distinct from new.restaurant_id then
    perform private.fail('CATEGORY_MISMATCH', 'La categoría no pertenece a este restaurante.');
  end if;

  if private.is_privileged() or private.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.video_uid := null;
    new.thumbnail_url := null;
    new.duration_seconds := null;
    new.candidate_video_uid := null;
    new.candidate_thumbnail_url := null;
    new.candidate_duration_seconds := null;
    new.video_status := 'none';
    new.video_review_note := null;

    -- Límite de platos según el plan.
    select p.max_dishes into v_max
    from public.subscriptions s join public.plans p on p.id = s.plan
    where s.restaurant_id = new.restaurant_id;
    if v_max is not null then
      select count(*) into v_count from public.dishes where restaurant_id = new.restaurant_id;
      if v_count >= v_max then
        perform private.fail('PLAN_LIMIT', format('Tu plan permite hasta %s platos.', v_max));
      end if;
    end if;
  elsif (new.video_uid, new.thumbnail_url, new.duration_seconds, new.candidate_video_uid,
         new.candidate_thumbnail_url, new.candidate_duration_seconds, new.video_status, new.video_review_note)
        is distinct from
        (old.video_uid, old.thumbnail_url, old.duration_seconds, old.candidate_video_uid,
         old.candidate_thumbnail_url, old.candidate_duration_seconds, old.video_status, old.video_review_note)
     or new.restaurant_id is distinct from old.restaurant_id then
    perform private.fail('VIDEO_FIELDS_LOCKED', 'Los videos se cambian subiendo uno nuevo.');
  end if;
  return new;
end;
$$;

create trigger dishes_guard before insert or update on public.dishes
  for each row execute function private.guard_dish();

-- Las vistas de un plato se atribuyen siempre a su restaurante real.
create or replace function private.fill_dish_view()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select restaurant_id into new.restaurant_id from public.dishes where id = new.dish_id;
  if new.restaurant_id is null then
    perform private.fail('NOT_FOUND', 'Plato no encontrado.');
  end if;
  return new;
end;
$$;

create trigger dish_views_fill before insert on public.dish_views
  for each row execute function private.fill_dish_view();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.menu_categories enable row level security;
alter table public.dishes enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blackout_dates enable row level security;
alter table public.reservations enable row level security;
alter table public.reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.dish_views enable row level security;
alter table public.saved_dishes enable row level security;
alter table public.notification_outbox enable row level security;

-- Perfiles: cada quien el suyo; el restaurante ve a quien le reservó; el admin todo.
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or private.is_admin()
  or exists (
    select 1 from public.reservations r
    where r.diner_id = profiles.id and private.is_member(r.restaurant_id)
  )
);
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or private.is_admin())
  with check (id = auth.uid() or private.is_admin());

-- Restaurantes
create policy restaurants_select on public.restaurants for select using (
  private.restaurant_is_listed(id) or private.is_member(id) or private.is_admin()
);
create policy restaurants_update on public.restaurants for update
  using (private.is_member(id) or private.is_admin())
  with check (private.is_member(id) or private.is_admin());
create policy restaurants_insert on public.restaurants for insert with check (private.is_admin());
create policy restaurants_delete on public.restaurants for delete using (private.is_admin());

-- Miembros
create policy members_select on public.restaurant_members for select using (
  profile_id = auth.uid() or private.is_admin()
);
create policy members_admin on public.restaurant_members for all
  using (private.is_admin()) with check (private.is_admin());

-- Planes: públicos
create policy plans_select on public.plans for select using (true);
create policy plans_admin on public.plans for all using (private.is_admin()) with check (private.is_admin());

-- Suscripciones: el restaurante la ve; la cambian los pagos (service_role) o el admin.
create policy subscriptions_select on public.subscriptions for select using (
  private.is_member(restaurant_id) or private.is_admin()
);
create policy subscriptions_admin on public.subscriptions for all
  using (private.is_admin()) with check (private.is_admin());

-- Menú
create policy categories_select on public.menu_categories for select using (
  private.restaurant_is_listed(restaurant_id) or private.is_member(restaurant_id) or private.is_admin()
);
create policy categories_write on public.menu_categories for all
  using (private.is_member(restaurant_id) or private.is_admin())
  with check (private.is_member(restaurant_id) or private.is_admin());

create policy dishes_select on public.dishes for select using (
  private.restaurant_is_listed(restaurant_id) or private.is_member(restaurant_id) or private.is_admin()
);
create policy dishes_write on public.dishes for all
  using (private.is_member(restaurant_id) or private.is_admin())
  with check (private.is_member(restaurant_id) or private.is_admin());

-- Disponibilidad: la gestiona el restaurante; los comensales consultan franjas con get_available_slots.
create policy availability_select on public.availability_rules for select using (
  private.is_member(restaurant_id) or private.is_admin()
);
create policy availability_write on public.availability_rules for all
  using (private.is_member(restaurant_id) or private.is_admin())
  with check (private.is_member(restaurant_id) or private.is_admin());

create policy blackout_select on public.blackout_dates for select using (
  private.is_member(restaurant_id) or private.is_admin()
);
create policy blackout_write on public.blackout_dates for all
  using (private.is_member(restaurant_id) or private.is_admin())
  with check (private.is_member(restaurant_id) or private.is_admin());

-- Reservas: solo lectura directa. Crear y cambiar estado: funciones de la migración 3.
create policy reservations_select on public.reservations for select using (
  diner_id = auth.uid() or private.is_member(restaurant_id) or private.is_admin()
);

-- Reseñas: públicas si el restaurante es visible y no están ocultas.
create policy reviews_select on public.reviews for select using (
  (not is_hidden and private.restaurant_is_listed(restaurant_id))
  or diner_id = auth.uid()
  or private.is_member(restaurant_id)
  or private.is_admin()
);
-- La validación completa (reserva completada, ventana de tiempo) está en el trigger reviews_validate.
create policy reviews_insert on public.reviews for insert to authenticated with check (diner_id = auth.uid());
create policy reviews_admin_update on public.reviews for update
  using (private.is_admin()) with check (private.is_admin());

create policy reports_insert on public.review_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin on public.review_reports for all
  using (private.is_admin()) with check (private.is_admin());

-- Vistas de platos: cualquiera registra una vista (anónima o propia); el restaurante consulta las suyas.
create policy dish_views_insert on public.dish_views for insert with check (viewer_id is null or viewer_id = auth.uid());
create policy dish_views_select on public.dish_views for select using (
  private.is_member(restaurant_id) or private.is_admin()
);

create policy saved_dishes_own on public.saved_dishes for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- notification_outbox: sin políticas = sin acceso desde la app. Solo el servidor.
revoke all on public.notification_outbox from anon, authenticated;
