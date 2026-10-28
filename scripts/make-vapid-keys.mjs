// One-time setup for reminders with the app closed (D-028). Run it yourself: npm run vapid
//
// Makes the keys and the secret the sender needs, and writes them only to files git ignores:
//   supabase/.env.functions         the Edge Function's secrets, for `npx supabase secrets set`
//   supabase/schedule.local.sql     the cron job, with its secret filled in, to run in the SQL editor
// and adds the public key (public by design) to .env as VITE_VAPID_PUBLIC_KEY.
// It never prints the private key or the secret. Running it again would make new keys, which
// silently cuts off every device already signed up, so it refuses unless you pass --rotate.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTHOR } from '../src/config.js';

const root = join(import.meta.dirname, '..');
const secretsFile = join(root, 'supabase/.env.functions');
const cronFile = join(root, 'supabase/schedule.local.sql');
const envFile = join(root, '.env');

if (existsSync(secretsFile) && !process.argv.includes('--rotate')) {
  console.error('Keys already exist (supabase/.env.functions). New keys would cut off every signed-up device.\nRun with --rotate only if you mean to replace them.');
  process.exit(1);
}

const b64u = (bytes) => Buffer.from(bytes).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const publicKey = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
const privateKey = (await crypto.subtle.exportKey('jwk', pair.privateKey)).d;
const cronSecret = b64u(crypto.getRandomValues(new Uint8Array(32)));

const env = readFileSync(envFile, 'utf8');
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url || '')) throw new Error('VITE_SUPABASE_URL in .env is missing or malformed');

writeFileSync(secretsFile, [
  '# Secrets for the send-reminders Edge Function (D-028). Never commit this file.',
  '# Load them with: npx supabase secrets set --env-file supabase/.env.functions',
  `VAPID_PUBLIC_KEY=${publicKey}`,
  `VAPID_PRIVATE_KEY=${privateKey}`,
  `VAPID_SUBJECT=mailto:${AUTHOR.email}`,
  `CRON_SECRET=${cronSecret}`,
  '',
].join('\n'), { mode: 0o600 });

writeFileSync(cronFile, `-- Runs send-reminders every 30 minutes (D-028). Holds a secret: never commit this file.
-- Paste into Supabase → SQL Editor and run once. Needs the pg_cron and pg_net extensions.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The secret the function checks, kept in Supabase Vault rather than in the job's text.
select vault.create_secret('${cronSecret}', 'send_reminders_secret', 'Bearer secret for the send-reminders function');

select cron.schedule('send-reminders', '0,30 * * * *', $$
  select net.http_post(
    url := '${url}/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'send_reminders_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);
`, { mode: 0o600 });

const line = `VITE_VAPID_PUBLIC_KEY=${publicKey}`;
writeFileSync(envFile, /^VITE_VAPID_PUBLIC_KEY=.*$/m.test(env)
  ? env.replace(/^VITE_VAPID_PUBLIC_KEY=.*$/m, line)
  : `${env.trimEnd()}\n\n# Web Push (D-028): the public half of the VAPID key. Public by design; the private half is a\n# Supabase Edge Function secret.\n${line}\n`);

console.log(`Done. Public key added to .env:\n  ${publicKey}\n
Secrets written to supabase/.env.functions and supabase/schedule.local.sql (both ignored by git).
Next: see docs/push-setup.md.`);
