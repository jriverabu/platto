-- =============================================================================
-- Platto · 5 · Promociones del restaurante (plan Pro)
-- Mismas reglas que packages/core/src/promotions.ts:
--   nombre ≤ 40, condiciones ≤ 140, hasta 90 días, máximo 3 encendidas a la vez,
--   días de la semana opcionales (vacío = todos), solo planes con promociones.
-- =============================================================================

alter table public.plans add column promotions boolean not null default false;
update public.plans set promotions = true where id = 'pro';

create or replace function private.promo_max_active() returns integer language sql immutable as $$ select 3 $$;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 40),
  detail text check (detail is null or char_length(detail) <= 140),
  -- 0 = domingo … 6 = sábado. Vacío = todos los días.
  weekdays smallint[] not null default '{}' check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  -- Fechas locales del restaurante, ambas incluidas.
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_dates check (ends_on >= starts_on),
  constraint promotions_max_days check (ends_on - starts_on < 90)
);

create index promotions_restaurant_idx on public.promotions (restaurant_id, ends_on);

create trigger promotions_updated_at before update on public.promotions
  for each row execute function private.set_updated_at();

-- ¿El plan actual del restaurante incluye promociones?
create or replace function private.restaurant_has_promotions(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s join public.plans p on p.id = s.plan
    where s.restaurant_id = p_restaurant and p.promotions
  );
$$;

grant execute on function private.restaurant_has_promotions(uuid) to anon, authenticated, service_role;

-- Plan, fechas y límite de promociones encendidas.
create or replace function private.guard_promotion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date;
  v_active integer;
begin
  if tg_op = 'UPDATE' and new.restaurant_id is distinct from old.restaurant_id then
    perform private.fail('PROMO_RESTAURANT_LOCKED', 'Una promoción no se puede mover a otro restaurante.');
  end if;

  if not (private.is_privileged() or private.is_admin() or private.is_member(new.restaurant_id)) then
    perform private.fail('FORBIDDEN', 'Solo el restaurante administra sus promociones.');
  end if;

  if not (private.is_privileged() or private.is_admin()) and not private.restaurant_has_promotions(new.restaurant_id) then
    perform private.fail('PROMO_PLAN_REQUIRED', 'Las promociones vienen con el plan Pro.');
  end if;

  new.title := btrim(new.title);
  new.detail := nullif(btrim(coalesce(new.detail, '')), '');
  new.weekdays := coalesce((select array_agg(distinct d order by d) from unnest(new.weekdays) d), '{}');
  if cardinality(new.weekdays) = 7 then
    new.weekdays := '{}';
  end if;

  select (now() at time zone r.timezone)::date into v_today from public.restaurants r where r.id = new.restaurant_id;

  if new.ends_on < v_today and (tg_op = 'INSERT' or new.ends_on is distinct from old.ends_on) then
    perform private.fail('PROMO_ENDED', 'La fecha final ya pasó.');
  end if;

  if new.active and new.ends_on >= v_today then
    select count(*) into v_active
    from public.promotions p
    where p.restaurant_id = new.restaurant_id and p.active and p.ends_on >= v_today and p.id <> new.id;
    if v_active >= private.promo_max_active() then
      perform private.fail('PROMO_LIMIT', format('Puedes tener hasta %s promociones encendidas.', private.promo_max_active()));
    end if;
  end if;

  return new;
end;
$$;

create trigger promotions_guard before insert or update on public.promotions
  for each row execute function private.guard_promotion();

-- ---------------------------------------------------------------------------
-- Seguridad
-- ---------------------------------------------------------------------------
alter table public.promotions enable row level security;

-- El público ve las promociones encendidas y vigentes de restaurantes visibles con plan Pro.
-- El restaurante y el administrador ven todas las suyas.
create policy promotions_select on public.promotions for select using (
  private.is_member(restaurant_id)
  or private.is_admin()
  or (
    active
    and ends_on >= (now() at time zone 'America/Bogota')::date - 1
    and private.restaurant_is_listed(restaurant_id)
    and private.restaurant_has_promotions(restaurant_id)
  )
);

create policy promotions_write on public.promotions for all
  using (private.is_member(restaurant_id) or private.is_admin())
  with check (private.is_member(restaurant_id) or private.is_admin());

-- ---------------------------------------------------------------------------
-- Promociones que se muestran hoy (Inicio, Explorar y perfil del restaurante)
-- ---------------------------------------------------------------------------
create or replace function public.live_promotions(p_restaurant uuid default null)
returns setof public.promotions
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.promotions p
  join public.restaurants r on r.id = p.restaurant_id
  cross join lateral (select (now() at time zone r.timezone)::date as today) t
  where (p_restaurant is null or p.restaurant_id = p_restaurant)
    and p.active
    and t.today between p.starts_on and p.ends_on
    and (cardinality(p.weekdays) = 0 or extract(dow from t.today)::smallint = any (p.weekdays))
    and private.restaurant_is_listed(p.restaurant_id)
    and private.restaurant_has_promotions(p.restaurant_id)
  order by p.ends_on, p.created_at;
$$;

grant execute on function public.live_promotions(uuid) to anon, authenticated, service_role;
