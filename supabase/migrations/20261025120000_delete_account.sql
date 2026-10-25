-- Eightfold: "Delete my account" (D-025).
-- Run once in the Supabase SQL editor, after the two earlier files.
--
-- A signed-in person can delete their own sign-in, and nothing else. Everything they stored goes
-- with it: profiles cascades from auth.users, and every other table cascades from profiles. Their
-- sessions and Google link are Supabase's own rows on auth.users and cascade too.
-- SECURITY DEFINER because people can't touch auth.users themselves; the function only ever
-- deletes the caller (auth.uid() comes from their signed token), and signed-out visitors can't call it.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
