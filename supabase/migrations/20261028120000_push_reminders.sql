-- Eightfold: reminders that arrive with the app closed (D-028).
-- Run once in the Supabase SQL editor, after the earlier files. Nothing here deletes data.
-- Tested against real Postgres by scripts/check-schema.mjs (npm run check).
--
--   push_settings       one row per person: reminders on or off, habits switched off, time zone.
--   push_subscriptions  one row per device that asked for notifications: where to send them.
--   push_log            what the sender already sent, so nothing is sent twice. Server only.
--
-- The sender (supabase/functions/send-reminders) reads these with the service role, which bypasses
-- row-level security. People reach only their own rows; signed-out visitors reach nothing.

-- ---------- Tables ----------

create table public.push_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reminders boolean not null default false,
  -- Habits switched off, each a habit id as in sanitize.js isId(). Joined with commas, the list
  -- must read as ids only, and split again it must give back as many as went in (so no element
  -- can hide a comma).
  off text[] not null default '{}' check (
    cardinality(off) <= 1000
    and array_to_string(off, ',') ~ '^([a-z0-9][a-z0-9-]{0,63}(,[a-z0-9][a-z0-9-]{0,63})*)?$'
    and cardinality(off) = coalesce(array_length(string_to_array(array_to_string(off, ','), ','), 1), 0)
  ),
  -- An IANA name from the browser ("Asia/Kolkata"), so "07:00" means 07:00 where the person is.
  time_zone text not null default 'UTC'
    check (char_length(time_zone) <= 64 and time_zone ~ '^(UTC|[A-Za-z]+(/[A-Za-z0-9_+-]+){1,2})$'),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Only the browsers' own push services: the sender posts to this address, so it must never be
  -- a place of someone's choosing.
  endpoint text not null unique check (
    char_length(endpoint) <= 1024
    and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[A-Za-z0-9_~:/?&=%.+-]+$'
  ),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{86,88}$'),  -- a P-256 public key, 65 bytes
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{21,24}$'),      -- 16 random bytes
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

create table public.push_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('remind')),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, slug, day)
);

create trigger set_updated_at before update on public.push_settings
  for each row execute function private.set_updated_at();

-- ---------- Signing a device up ----------

-- A browser's push address is unguessable, so whoever has it is that browser. It may still be
-- listed under someone who signed out without network, so it's moved to the caller. At most ten
-- devices per person: the oldest makes room.
create function public.register_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  delete from public.push_subscriptions where id in (
    select id from public.push_subscriptions where user_id = me order by created_at desc offset 9
  );
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (me, p_endpoint, p_p256dh, p_auth);
  insert into public.push_settings (user_id) values (me) on conflict (user_id) do nothing;
end $$;

revoke all on function public.register_push(text, text, text) from public, anon;
grant execute on function public.register_push(text, text, text) to authenticated;

-- ---------- Row-level security ----------

alter table public.push_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_log enable row level security;

create policy "own push settings" on public.push_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Devices are added only through register_push(); a person can see and remove their own.
create policy "read own devices" on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "remove own devices" on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);
-- push_log has no policies: only the sender reads or writes it.

revoke all on public.push_settings, public.push_subscriptions, public.push_log from anon, authenticated;
grant select, insert, update on public.push_settings to authenticated;
grant select, delete on public.push_subscriptions to authenticated;
