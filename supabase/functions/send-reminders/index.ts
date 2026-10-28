// send-reminders (D-028): Supabase Cron calls this every 30 minutes. It finds the habits due in
// each person's next half hour (in their own time zone), sends one encrypted Web Push to each of
// their devices, and remembers what it sent so nothing goes out twice.
//
// Secrets (Supabase → Edge Functions → Secrets, never in git):
//   CRON_SECRET         the cron job sends it as "Authorization: Bearer ..."; anything else is refused
//   VAPID_PUBLIC_KEY    the same public key the site has in .env (VITE_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY   its private half
//   VAPID_SUBJECT       mailto: address the push services can reach us at
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. If the project's legacy API
// keys are switched off, make a secret key (sb_secret_...) and set it as SENDER_SECRET_KEY instead.
//
// Deployed with --no-verify-jwt, because the caller is the cron job, not a signed-in person; the
// CRON_SECRET check below takes the place of that. It never logs habit names or addresses.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { sendPush } from '../_shared/webpush.js';
import { clocks, planReminders, logCutoff } from '../_shared/plan.js';

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing secret ${name}`);
  return value;
};

// Compares hashes, so the time it takes says nothing about how much of the secret matched.
async function sameSecret(given: string, expected: string) {
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([hash(given), hash(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function run(now: Date) {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || env('SENDER_SECRET_KEY');
  const db = createClient(env('SUPABASE_URL'), key, { auth: { persistSession: false } });
  const vapid = { publicKey: env('VAPID_PUBLIC_KEY'), privateKey: env('VAPID_PRIVATE_KEY'), subject: env('VAPID_SUBJECT') };
  const check = <T>({ data, error }: { data: T | null; error: unknown }) => { if (error) throw error; return data as T; };

  const settings = check(await db.from('push_settings').select('user_id, off, time_zone').eq('reminders', true).limit(5000)) as any[];
  if (!settings.length) return { people: 0, sent: 0 };
  const subs = check(await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', settings.map((s) => s.user_id))) as any[];
  const people = clocks(settings.filter((s) => subs.some((d) => d.user_id === s.user_id)), now);
  if (!people.length) return { people: 0, sent: 0 };

  const ids = people.map((p) => p.user_id);
  const months = [...new Set(people.map((p) => p.month))];
  const days = [...new Set(people.map((p) => p.day))];
  const [habitMonths, ticks, sent] = await Promise.all([
    db.from('habit_months').select('user_id, slug, month, name, goal, time, start_day, cadence, weekdays, times_per_week, position')
      .in('user_id', ids).in('month', months).not('time', 'is', null).then(check),
    db.from('ticks').select('user_id, slug, day').in('user_id', ids).in('month', months).then(check),
    db.from('push_log').select('user_id, slug, day').in('user_id', ids).in('day', days).eq('kind', 'remind').then(check),
  ]) as any[][];

  const plan = planReminders({ people, habitMonths, ticks, sent });
  let delivered = 0, gone = 0, failed = 0;
  for (const item of plan) {
    // Claim it first: if another run got there, the row exists and nothing is returned.
    const claimed = check(await db.from('push_log')
      .upsert({ user_id: item.user_id, kind: 'remind', slug: item.slug, day: item.day }, { onConflict: 'user_id,kind,slug,day', ignoreDuplicates: true })
      .select('slug')) as any[];
    if (!claimed.length) continue;
    await Promise.all(subs.filter((d) => d.user_id === item.user_id).map(async (device) => {
      try {
        const status = await sendPush(device, item.payload, vapid);
        if (status === 404 || status === 410) {
          gone++;
          await db.from('push_subscriptions').delete().eq('id', device.id);
        } else if (status >= 200 && status < 300) {
          delivered++;
          await db.from('push_subscriptions').update({ last_ok_at: now.toISOString() }).eq('id', device.id);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }));
  }
  await db.from('push_log').delete().lt('day', logCutoff(now));
  return { people: people.length, reminders: plan.length, delivered, gone, failed };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!(await sameSecret(req.headers.get('authorization') || '', `Bearer ${env('CRON_SECRET')}`))) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const result = await run(new Date());
    console.log(JSON.stringify(result));
    return Response.json(result);
  } catch (err) {
    console.error('send-reminders failed:', err instanceof Error ? err.message : 'unknown error');
    return new Response('Failed', { status: 500 });
  }
});
