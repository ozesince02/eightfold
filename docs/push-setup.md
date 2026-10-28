# Setting up reminders with the app closed

One-time setup for D-028 ([buddies-and-notifications.md](buddies-and-notifications.md), section 1).
Until it's done, the tracker simply doesn't offer the setting. Every step runs on your own computer
or in your own dashboard: no secret ever goes into git, chat or the site.

## What you're setting up

- **The tables:** each device's notification address, your reminder settings and time zone, and a
  log of what was sent.
- **A key pair (VAPID):** the public half goes in `.env` and the site; the private half signs every
  message, so push services know it's really from Eightfold.
- **The sender:** a Supabase Edge Function, `send-reminders`.
- **A cron job** that calls the sender at :00 and :30, with a secret only the two of them know.

## Steps

1. **Run the tables.** Supabase → SQL Editor → New query → paste
   `supabase/migrations/20261028120000_push_reminders.sql` → Run. If the editor warns about a
   destructive operation, that's the word `delete` inside `register_push()`, which only runs when
   someone signs a device up and only touches that device's own address. Nothing existing is
   changed.

2. **Make the keys.** In the project folder:

   ```bash
   npm run vapid
   ```

   It writes the private key and the cron secret to `supabase/.env.functions` and
   `supabase/schedule.local.sql` (both ignored by git, and never printed), and adds
   `VITE_VAPID_PUBLIC_KEY` to `.env`. Run it once: new keys cut off every device already signed up
   (it refuses unless you pass `-- --rotate`).

3. **Sign in to the Supabase CLI** (opens Supabase's sign-in page in your browser):

   ```bash
   npx supabase login
   ```

4. **Link this folder to the project.** If it asks for the database password, you can leave it
   blank:

   ```bash
   npx supabase link --project-ref txmseoofjrvsmxyaiwps
   ```

5. **Give the sender its secrets:**

   ```bash
   npx supabase secrets set --env-file supabase/.env.functions
   ```

6. **Deploy the sender.** `--no-verify-jwt` because the caller is the cron job, not a signed-in
   person; the function checks the cron secret instead. `--use-api` bundles it on Supabase's side,
   so Docker isn't needed:

   ```bash
   npx supabase functions deploy send-reminders --no-verify-jwt --use-api
   ```

7. **Start the cron job.** SQL Editor → paste `supabase/schedule.local.sql` → Run. It switches on
   the `pg_cron` and `pg_net` extensions if they aren't on yet, keeps the secret in Supabase Vault,
   and schedules the job.

8. **Ship the public key.** Commit the `.env` change from step 2 with the rest of this feature (or
   tell Claude to); the setting appears on the site once that's deployed.

## Checking it works

- Supabase → Edge Functions → `send-reminders` → Logs: every half hour a line like
  `{"people":1,"reminders":1,"delivered":1,"gone":0,"failed":0}`. It never logs names or addresses.
- In Chrome, Firefox or Edge on a computer or Android: sign in, Habits → Reminders → "Remind me when
  Eightfold is closed", give a habit a time about 40 minutes from now, close every Eightfold tab and
  wait for the next :00 or :30.
- On iPhone or iPad (iOS 16.4 or later): Safari → Share → Add to Home Screen, open Eightfold from
  the Home Screen, then turn it on there.

## If something's wrong

- **401 in the logs:** the cron secret in Vault doesn't match the function's `CRON_SECRET`. Run
  step 5 again, or recreate the Vault secret from `supabase/schedule.local.sql`.
- **"missing secret SUPABASE_SERVICE_ROLE_KEY":** the project's legacy API keys are off. Make a
  secret key (Settings → API Keys → Secret keys), then
  `npx supabase secrets set SENDER_SECRET_KEY=...` in your own terminal.
- **Stop it:** `select cron.unschedule('send-reminders');` in the SQL Editor. Devices stay signed
  up and simply get nothing.
