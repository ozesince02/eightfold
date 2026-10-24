-- Eightfold sync: a private Realtime channel per person (D-020).
-- Run once in the Supabase SQL editor, after 20261024120000_accounts.sql.
--
-- A device that saved changes sends a tiny "changed" broadcast on the topic `user:<their id>`;
-- the person's other devices hear it and fetch their own rows. The message carries no data.
--
-- Why not Realtime "Postgres changes" on the tables: delete events can't be checked against
-- row-level security, so subscribers could receive other people's primary keys (habit ids and
-- dates). Broadcast on a private channel is authorised by these policies instead.

create policy "listen on own channel" on realtime.messages for select to authenticated
  using (realtime.topic() = 'user:' || (select auth.uid())::text and extension = 'broadcast');

create policy "send on own channel" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'user:' || (select auth.uid())::text and extension = 'broadcast');
