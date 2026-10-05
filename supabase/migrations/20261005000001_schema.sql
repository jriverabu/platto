-- ============================================================================
-- Platto · 1/4 · Esquema base
-- Tablas, tipos e índices. Permisos (RLS) en la migración 2, reglas en la 3.
-- ============================================================================

-- Esquema interno: no lo expone la API de Supabase (solo expone `public`).
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('diner', 'restaurant', 'admin');
create type public.member_role as enum ('owner', 'staff');
create type public.restaurant_status as enum ('draft', 'active', 'suspended');
create type public.video_status as enum ('none', 'processing', 'in_review', 'approved', 'rejected');
create type public.reservation_status as enum (
  'pending', 'confirmed', 'rejected', 'expired', 'cancelled', 'completed', 'no_show'
);
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'suspended', 'cancelled');

-- ---------------------------------------------------------------------------
-- Utilidad: updated_at automático
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles (uno por usuario de Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or char_length(phone) <= 30),
  role public.user_role not null default 'diner',
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Crea el perfil apenas alguien se registra.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Restaurantes
-- ---------------------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  cuisine text not null default '',
  zone text not null default '',
  city text not null default 'Bogotá',
  address text not null default '',
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  price_level smallint not null default 2 check (price_level between 1 and 4),
  description text not null default '' check (char_length(description) <= 600),
  phone text,
  timezone text not null default 'America/Bogota',
  status public.restaurant_status not null default 'draft',
  reservations_enabled boolean not null default true,
  cover_video_uid text,
  cover_thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_status_zone_idx on public.restaurants (status, zone);
create index restaurants_cuisine_idx on public.restaurants (cuisine);

create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function private.set_updated_at();

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, profile_id)
);

create index restaurant_members_profile_idx on public.restaurant_members (profile_id);

-- ---------------------------------------------------------------------------
-- Planes y suscripciones
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key,
  name text not null,
  -- Precio mensual en COP. Null mientras se valida con el piloto.
  price_cop integer check (price_cop is null or price_cop >= 0),
  -- Máximo de platos; null = ilimitado.
  max_dishes integer check (max_dishes is null or max_dishes > 0),
  featured boolean not null default false,
  analytics boolean not null default false,
  sort_order smallint not null default 0
);

insert into public.plans (id, name, price_cop, max_dishes, featured, analytics, sort_order) values
  ('esencial', 'Esencial', null, 30, false, false, 1),
  ('pro', 'Pro', null, null, true, true, 2);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants (id) on delete cascade,
  plan text not null references public.plans (id),
  status public.subscription_status not null default 'trialing',
  provider text not null default 'manual' check (provider in ('manual', 'mercadopago', 'revenuecat')),
  provider_ref text unique,
  current_period_end timestamptz,
  grace_until timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Menú
-- ---------------------------------------------------------------------------
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create index menu_categories_restaurant_idx on public.menu_categories (restaurant_id, position);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.menu_categories (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 240),
  price_cop integer not null check (price_cop between 0 and 10000000),
  tags text[] not null default '{}',
  is_available boolean not null default true,
  position integer not null default 0,

  -- Video publicado (el que ven los comensales). Máximo 10 segundos, garantizado por la base de datos.
  video_uid text,
  thumbnail_url text,
  duration_seconds numeric(4, 1) check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 10)),

  -- Video candidato: se sube, se procesa y se revisa sin quitar el publicado.
  candidate_video_uid text,
  candidate_thumbnail_url text,
  candidate_duration_seconds numeric(4, 1)
    check (candidate_duration_seconds is null or (candidate_duration_seconds > 0 and candidate_duration_seconds <= 10)),
  video_status public.video_status not null default 'none',
  video_review_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dishes_restaurant_idx on public.dishes (restaurant_id, category_id, position);
create index dishes_video_review_idx on public.dishes (video_status) where video_status in ('processing', 'in_review');
create unique index dishes_candidate_uid_idx on public.dishes (candidate_video_uid) where candidate_video_uid is not null;

create trigger dishes_updated_at before update on public.dishes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  -- 0 = domingo … 6 = sábado, igual que extract(dow).
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes smallint not null default 30 check (slot_minutes in (15, 30, 60)),
  capacity_people integer not null check (capacity_people between 1 and 500),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index availability_rules_restaurant_idx on public.availability_rules (restaurant_id, weekday);

create table public.blackout_dates (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  day date not null,
  reason text check (reason is null or char_length(reason) <= 120),
  primary key (restaurant_id, day)
);

-- ---------------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  diner_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  party_size smallint not null check (party_size between 1 and 12),
  note text check (note is null or char_length(note) <= 280),
  status public.reservation_status not null default 'pending',
  expires_at timestamptz not null,
  responded_at timestamptz,
  cancelled_at timestamptz,
  attended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_restaurant_time_idx on public.reservations (restaurant_id, starts_at);
create index reservations_diner_idx on public.reservations (diner_id, starts_at desc);
create index reservations_pending_idx on public.reservations (expires_at) where status = 'pending';
-- Un comensal no puede tener dos reservas activas en el mismo restaurante a la misma hora.
create unique index reservations_no_duplicates_idx on public.reservations (diner_id, restaurant_id, starts_at)
  where status in ('pending', 'confirmed');

create trigger reservations_updated_at before update on public.reservations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Calificaciones verificadas
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  diner_id uuid not null references public.profiles (id) on delete cascade,
  -- Nombre visible, guardado al publicar ("Camila R.") para no exponer el perfil.
  author_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 300),
  tags text[] not null default '{}',
  dish_ids uuid[] not null default '{}',
  restaurant_reply text check (restaurant_reply is null or char_length(restaurant_reply) between 1 and 500),
  replied_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (review_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- Interacción
-- ---------------------------------------------------------------------------
create table public.dish_views (
  id bigint generated always as identity primary key,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  viewer_id uuid references public.profiles (id) on delete set null,
  watched_seconds numeric(4, 1) not null default 0 check (watched_seconds between 0 and 10),
  created_at timestamptz not null default now()
);

create index dish_views_restaurant_idx on public.dish_views (restaurant_id, created_at);

create table public.saved_dishes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, dish_id)
);

-- ---------------------------------------------------------------------------
-- Notificaciones: la base de datos las encola, la función send-notifications las envía.
-- ---------------------------------------------------------------------------
create table public.notification_outbox (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index notification_outbox_due_idx on public.notification_outbox (send_after) where sent_at is null;
