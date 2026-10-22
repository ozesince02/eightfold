# Data storage, accounts and sessions

Status: **accepted, not built yet.** Written 23 October 2026. Decision record: [decisions.md](decisions.md) D-008.
The three open questions were settled the same day; see [Decided](#decided).

## Where things stand

Eightfold is a static site: HTML, CSS and JavaScript built by Vite, with no server of its own.
All data lives in the browser's `localStorage` as one JSON object under `eightfold:v1`
([src/lib/store.js](../src/lib/store.js)). That object holds every month's habits and ticks, the
wish, colours, reminder settings and display preferences. Backups are manual JSON files.

This is fine for one person on one browser. It breaks as soon as we want any of these:

- the same data on a phone and a laptop;
- family and friends with their own accounts;
- data that survives clearing the browser;
- reminders that arrive with the app closed (these need a server to send push messages).

## What we need, now and later

| | Now (one person) | Family and friends (10–50 people) | If it grows (thousands) |
| --- | --- | --- | --- |
| Accounts | none | sign-in with email link or Google | same, plus account deletion and data export |
| Sessions | none | stay signed in on each device | same, plus revoking a device |
| Data | this browser | one copy per user in the cloud, synced to each device | same, with backups and monitoring |
| Offline | always | still works offline, syncs later | same |
| Privacy | nothing leaves the device | each user sees only their own data | same, plus a privacy policy |
| Cost | ₹0 | ₹0 | pay as we grow |
| Ops | none | none we have to run ourselves | as little as possible |

Two rules come from this table:

1. **Don't build a backend before it's needed.** The app keeps working with no account at all.
2. **Whatever we pick must not need a rewrite when it grows.** The data model and the code that
   reads and writes data should already be shaped for many users.

## Options compared

Prices and limits checked on the providers' own pages on 23 October 2026. Re-check before deciding.

| | Supabase | Firebase | PocketBase | Cloudflare D1 + Workers |
| --- | --- | --- | --- | --- |
| What it is | Hosted Postgres with auth, row-level security and a JS client | Google's hosted NoSQL (Firestore) with auth | One self-hosted binary: SQLite, auth, REST API | Serverless SQLite and functions; auth is ours to build |
| Free tier | 500 MB database, 50,000 monthly users, 2 projects | 1 GiB Firestore, 50,000 reads and 20,000 writes a day, 50,000 monthly users | Free software; we pay for a small server | 5 GB, 5 million rows read and 100,000 written a day |
| Catch on the free tier | **Projects pause after 1 week of inactivity** | Daily read/write caps | We run and back up the server | We write auth, sessions and security ourselves |
| Paid | Pro from $25 a month | Pay as you go (Blaze) | The server's cost | Usage-based |
| Data model fit | Excellent: habits and dated ticks are relational | Fair: documents per month work, cross-month queries are awkward | Good (SQLite) | Good (SQLite) |
| Sign-in | Email link, Google and more, built in | Built in | Built in | Build or buy |
| Sessions | Built in (JWT with refresh) | Built in | Built in | Build |
| Each user sees only their own data | Postgres row-level security policies | Security rules | API rules | Our own code |
| Offline sync | Ours to write (simple for our data) | Built into the Firestore SDK | Ours to write | Ours to write |
| Lock-in | Low: standard Postgres, can self-host | High: proprietary database and rules | Low, but pre-1.0: "full backward compatibility is not guaranteed before reaching v1.0.0" | Medium |
| Works in a Capacitor phone app | Yes | Yes | Yes | Yes |

## Recommendation

**Supabase, behind a small storage adapter, with the app staying local-first.**

- **Postgres fits the data.** Habits, monthly settings and dated ticks are tables. Questions like
  "longest German streak this year" become one SQL query instead of walking JSON.
- **Sign-in and sessions come built in.** Email magic links and Google sign-in cover family and
  friends without passwords to manage.
- **Row-level security** puts "each user sees only their own rows" in the database itself, not in
  app code that could have a bug.
- **Low lock-in.** It's standard Postgres. If Supabase ever stops suiting us, the data and SQL move
  to any Postgres host, or Supabase can be self-hosted.
- **Cost stays at zero for family use.** 50,000 monthly users and 500 MB is far beyond what we
  need: a year of one person's ticks is a few thousand rows.
- **The free-tier pause.** A free project pauses after a week with no activity. With daily users it
  never idles. If it ever does (say, during a holiday month), the app keeps working offline and syncs
  when the project is resumed from the dashboard. Upgrading to Pro removes the pause.

Why not the others:
- **Firebase** has great offline sync, but its document model fits our cross-month questions
  poorly and moving off it later is hard.
- **PocketBase** is lovely for small scale, but it is pre-1.0, and running our own server means
  backups and uptime are our problem.
- **Cloudflare D1** is cheap at scale, but we would have to build auth and sessions ourselves,
  which is the riskiest part to get wrong.

## How it would fit into the app

```
UI (app.js, landing.js)
   │  calls only
   ▼
store.js  ── same API as today: get, toggle, addHabit, updateHabit, setPref, ...
   │
   ├── LocalAdapter    localStorage today (IndexedDB later). Always present: the offline copy.
   └── SupabaseAdapter only when signed in. Pushes queued changes, pulls others' devices' changes.
```

- The UI never talks to Supabase directly. Swapping or adding a backend touches only the adapters.
- **Local-first:** every tick is saved locally at once, then queued for upload. The screen never
  waits for the network.
- **Conflicts are simple** for this data: a tick is a yes/no fact for one habit on one day, so the
  latest change wins. Habit edits carry an `updated_at` and the latest also wins.
- **Signing in for the first time** uploads the local data to the new account (the same path a
  JSON backup import uses today).

## Data model (Postgres)

```sql
-- One row per person; created on first sign-in.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  wish text default '',
  prefs jsonb default '{"percentView":"days"}',
  reminders jsonb default '{}',
  created_at timestamptz default now()
);

-- A habit is the lasting thing ("German"); its name, goal and time can change month to month.
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  slug text not null,                 -- today's ids: "german", "dsa"... keeps streaks across months
  color text not null,
  created_at timestamptz default now(),
  unique (user_id, slug)
);

-- How a habit is set up in one month: the sheet's per-tab settings.
create table habit_months (
  habit_id uuid references habits on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  month date not null,                -- first day of the month
  name text not null,
  goal smallint not null default 20,
  time time,                          -- reminder time, optional
  start_day smallint not null default 1,
  -- Room for habits that aren't daily (vision.md, "Weekly and monthly goals"):
  cadence text not null default 'daily'
    check (cadence in ('daily', 'weekdays', 'times_per_week', 'weekly', 'monthly')),
  weekdays smallint[],                -- for 'weekdays': 1 = Monday ... 7 = Sunday, e.g. {1,3}
  times_per_week smallint,            -- for 'times_per_week'
  position smallint not null default 0,
  updated_at timestamptz default now(),
  primary key (habit_id, month)
);

-- One row per tick. Unticking deletes the row.
create table ticks (
  habit_id uuid references habits on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  day date not null,
  created_at timestamptz default now(),
  primary key (habit_id, day)
);

-- Each user reads and writes only their own rows (same policy on every table).
alter table ticks enable row level security;
create policy "own ticks" on ticks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Today's JSON maps straight onto this: `months["2026-10"].habits[]` becomes `habit_months` rows,
`checks[id] = [days]` becomes `ticks` rows, and `wish`, `prefs`, `reminders` live on `profiles`.

Every habit imported today becomes `cadence = 'daily'`. The local JSON can gain the same fields
(`cadence`, `weekdays`, `timesPerWeek` on each month's habit) whenever schedules are built; no
migration is needed because missing means daily.

Not stored: streaks, percentages, weekly and yearly scores. They stay computed by
[stats.js](../src/lib/stats.js), as now.

## Phases

1. **Now, no backend.** Ask the browser to keep the data permanently
   (`navigator.storage.persist()`), and nudge for a backup weekly. Move the store's internals behind
   the adapter interface without changing behaviour.
2. **Accounts for family and friends.** Git repository and Cloudflare Pages deploys, a domain,
   a Supabase project in Mumbai with the tables above and row-level security, Google and magic-link
   sign-in (with custom SMTP), the sync adapter, and "upload my local data" on first sign-in.
   Signing in stays optional.
2b. **Opt-in buddies.** The `buddies` table, sharing settings and read-only policies described under
   [Decided](#decided).
3. **Push reminders.** A Supabase Edge Function (or a small scheduled job) sends Web Push at each
   habit's time, so nudges arrive with the app closed. The phone app uses native notifications instead.
4. **If it grows.** Pro plan (no pausing, daily backups), account deletion and data export, a
   privacy policy, error monitoring.

## Decided

Settled with the user on 23 October 2026.

### Sign-in: Google and email link
- **Google** for one-tap sign-in, and an **emailed magic link** for anyone who'd rather not use
  Google. No passwords anywhere.
- **Email needs a mail provider.** Supabase's built-in email is for testing only: it "will refuse to
  deliver messages to addresses that are not part of the project's team" and allows "2 messages per
  hour". Plan: a transactional email service through custom SMTP (for example Resend), on a domain
  we own so the links don't land in spam.
- **Google needs** an OAuth client and consent screen in Google Cloud, asking only for the basic
  profile and email.
- Both methods sign into the same account when the email address matches.

### Sharing: private now, opt-in buddies later
- **At launch every account is private.** One row-level security rule per table:
  `user_id = auth.uid()`.
- **Opt-in buddies are planned** (see [vision.md](vision.md)). The schema above already supports
  them: every table carries `user_id`, and progress is computed from ticks, so sharing means adding
  rules, not moving data. When it's built it will need roughly:
  - a `buddies` table (`user_id`, `buddy_id`, `status`: invited, accepted, blocked);
  - a `sharing` setting per user (what a buddy may see: cranes and streaks only, or habit names too);
  - read-only policies that let an accepted buddy read the shared figures, never edit them,
    ideally through a view that exposes only daily totals, not individual habits;
  - invite links and a way to remove a buddy at any time.
- Misses are never shown to buddies, only what was done.

### Hosting: Cloudflare Pages, Supabase in Mumbai
- **Cloudflare Pages** serves the static site: free, commercial use allowed, 500 builds a month,
  20,000 files, 25 MiB per file, and no bandwidth limit listed for static files. Its network has
  points of presence across India.
- **Supabase project in the Mumbai region** (`ap-south-1`) so the database sits close to the users.
- Vercel was the runner-up; its free Hobby plan is "restricted to non-commercial personal use only".
- **Domain:** a custom domain is needed anyway for the email links (see above). Pick one before
  phase 2.
- Deploys: connect the repository to Cloudflare Pages, build command `npm run build`, output `dist`.
  This needs the project in a git repository first.

## Sources

- [Supabase pricing](https://supabase.com/pricing): free plan limits, pausing after 1 week of inactivity, Pro from $25 a month.
- [Firebase pricing](https://firebase.google.com/pricing): Spark plan Firestore and Authentication limits.
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): free and paid limits.
- [PocketBase](https://pocketbase.io/) and its [README](https://github.com/pocketbase/pocketbase): SQLite, built-in auth, pre-1.0 compatibility note.
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp): built-in email sends only to the project's team, 2 messages per hour.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): builds, files and sizes on the free plan.
- [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines): Hobby is non-commercial personal use only.
