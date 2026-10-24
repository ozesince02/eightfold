-- Eightfold accounts: tables, limits and row-level security (D-018).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
-- Tested against real Postgres by scripts/check-schema.mjs (npm run check).
--
-- Rules (docs/security.md):
--   * Every table has row-level security; a signed-in user reads and writes only rows with their
--     own user_id. Signed-out visitors (anon) get no access at all.
--   * The database repeats the app's validation (src/lib/sanitize.js) as constraints, so a
--     modified client still can't store bad data.
--   * Helper functions live in the `private` schema, which the Data API doesn't expose.

create schema if not exists private;

-- ---------- Tables ----------

-- One row per person, created when they first sign in.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb
    check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per year with a wish or a fold (D-017).
create table public.years (
  user_id uuid not null references public.profiles (id) on delete cascade,
  year smallint not null check (year between 1900 and 2199),
  wish text not null default '' check (char_length(wish) <= 200),
  folded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

-- A habit is the lasting thing ("german"); its name and settings live per month.
-- slug is the id the app already uses, so local data maps over without renaming anything.
create table public.habits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  color text not null default '#C9A57A' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, slug)
);

-- A month that has been used (D-017: months exist only once something changed in them).
create table public.months (
  user_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1 and month between '1900-01-01' and '2199-12-01'),
  created_at timestamptz not null default now(),
  primary key (user_id, month)
);

-- How a habit is set up in one month: the sheet's per-tab settings, and its schedule (D-013).
create table public.habit_months (
  user_id uuid not null,
  slug text not null,
  month date not null,
  name text not null check (char_length(name) between 1 and 120),
  goal smallint not null default 20 check (goal between 0 and 31),
  time time,
  start_day smallint not null default 1 check (start_day between 1 and 31),
  cadence text not null default 'daily'
    check (cadence in ('daily', 'weekdays', 'times_per_week', 'weekly', 'monthly')),
  weekdays smallint[] check (weekdays is null or (weekdays <@ '{1,2,3,4,5,6,7}'::smallint[] and cardinality(weekdays) between 1 and 7)),
  times_per_week smallint check (times_per_week between 1 and 7),
  position smallint not null default 0 check (position between 0 and 49),
  updated_at timestamptz not null default now(),
  primary key (user_id, slug, month),
  foreign key (user_id, slug) references public.habits (user_id, slug) on delete cascade,
  foreign key (user_id, month) references public.months (user_id, month) on delete cascade
);

-- One row per tick; unticking deletes the row. A tick needs its habit to be in that month.
create table public.ticks (
  user_id uuid not null,
  slug text not null,
  day date not null check (day between '1900-01-01' and '2199-12-31'),
  month date generated always as (date_trunc('month', day::timestamp)::date) stored,
  created_at timestamptz not null default now(),
  primary key (user_id, slug, day),
  foreign key (user_id, slug, month) references public.habit_months (user_id, slug, month) on delete cascade
);

-- ---------- Housekeeping triggers ----------

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.years for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.habits for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.habit_months for each row execute function private.set_updated_at();

-- Size limits per person, the same as the app's (sanitize.js LIMITS), so one account can't fill
-- the free database: 240 months, 50 habits a month, 1,000 habits, 100 years.
create function private.enforce_limits() returns trigger
language plpgsql set search_path = '' as $$
declare
  n integer;
begin
  if tg_table_name = 'months' then
    select count(*) into n from public.months where user_id = new.user_id;
    if n >= 240 then raise exception 'Eightfold limit: 240 months per person'; end if;
  elsif tg_table_name = 'habit_months' then
    select count(*) into n from public.habit_months where user_id = new.user_id and month = new.month;
    if n >= 50 then raise exception 'Eightfold limit: 50 habits per month'; end if;
  elsif tg_table_name = 'habits' then
    select count(*) into n from public.habits where user_id = new.user_id;
    if n >= 1000 then raise exception 'Eightfold limit: 1,000 habits per person'; end if;
  elsif tg_table_name = 'years' then
    select count(*) into n from public.years where user_id = new.user_id;
    if n >= 100 then raise exception 'Eightfold limit: 100 years per person'; end if;
  end if;
  return new;
end $$;

create trigger enforce_limits before insert on public.months for each row execute function private.enforce_limits();
create trigger enforce_limits before insert on public.habit_months for each row execute function private.enforce_limits();
create trigger enforce_limits before insert on public.habits for each row execute function private.enforce_limits();
create trigger enforce_limits before insert on public.years for each row execute function private.enforce_limits();

-- A profile for every new account. Runs as the table owner because the user can't write to
-- auth.users; it only ever inserts the new user's own id.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on function private.set_updated_at(), private.enforce_limits(), private.handle_new_user() from public;

-- ---------- Row-level security ----------

alter table public.profiles enable row level security;
alter table public.years enable row level security;
alter table public.habits enable row level security;
alter table public.months enable row level security;
alter table public.habit_months enable row level security;
alter table public.ticks enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy "read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- No delete policy: an account is removed by deleting the auth user, which cascades.

create policy "own years" on public.years for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own habits" on public.habits for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own months" on public.months for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own habit months" on public.habit_months for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own ticks" on public.ticks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Signed-out visitors get nothing, even before RLS is consulted. Signed-in users get only the
-- statements the app needs.
revoke all on public.profiles, public.years, public.habits, public.months, public.habit_months, public.ticks from anon;
revoke all on public.profiles, public.years, public.habits, public.months, public.habit_months, public.ticks from authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.years, public.habits, public.months, public.habit_months, public.ticks to authenticated;

-- Accounts made before this file ran (for example while testing sign-in) get their profile too.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
