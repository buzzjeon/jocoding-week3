create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key,
  email text,
  locale text,
  timezone text,
  unit_system text default 'metric',
  gender text,
  height_cm numeric,
  weight_kg numeric,
  style_preferences jsonb,
  last_location jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.premium_subscriptions (
  user_id uuid primary key,
  email text,
  status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.daily_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  recommendation_date date not null,
  weather jsonb,
  recommendation text,
  created_at timestamptz default now(),
  unique (user_id, recommendation_date)
);

create table if not exists public.daily_recommendation_emails (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references public.daily_recommendations(id) on delete cascade,
  email text,
  sent_at timestamptz,
  status text,
  error text
);

create table if not exists public.weather_cache (
  id uuid primary key default gen_random_uuid(),
  location_key text not null,
  weather_date date not null,
  data jsonb,
  fetched_at timestamptz default now(),
  unique (location_key, weather_date)
);

alter table public.user_profiles enable row level security;
alter table public.premium_subscriptions enable row level security;
alter table public.daily_recommendations enable row level security;
alter table public.daily_recommendation_emails enable row level security;
alter table public.weather_cache enable row level security;

-- RLS Policies: user_profiles
create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

-- RLS Policies: premium_subscriptions (read-only for users, write via service_role)
create policy "Users can read own subscription"
  on public.premium_subscriptions for select
  using (auth.uid() = user_id);

-- RLS Policies: daily_recommendations (read-only for users)
create policy "Users can read own recommendations"
  on public.daily_recommendations for select
  using (auth.uid() = user_id);

-- RLS Policies: daily_recommendation_emails (read-only for users via their recommendations)
create policy "Users can read own email logs"
  on public.daily_recommendation_emails for select
  using (
    exists (
      select 1 from public.daily_recommendations dr
      where dr.id = recommendation_id and dr.user_id = auth.uid()
    )
  );

-- RLS Policies: weather_cache (no direct user access needed, service_role only)
-- No policies = deny all for anon/authenticated (correct for server-only table)
