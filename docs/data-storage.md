# Data storage, accounts and sessions

Status: **built: database (D-018), sign-in (D-019) and sync (D-020), 24 October 2026.** Written 23 October 2026. Decision record: [decisions.md](decisions.md) D-008.
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

### Sync behaviour (agreed 24 October 2026)
Built 24 October 2026 (D-020): [src/lib/sync/](../src/lib/sync/), tested end to end on real
Postgres by [scripts/check-sync.mjs](../scripts/check-sync.mjs).

- **Online:** every change is written to Supabase within a second of being made. Other devices
  hear a tiny "changed" broadcast on the person's private Realtime channel (`user:<id>`) and fetch
  their rows. (Not Realtime "Postgres changes": its delete events can't be checked against RLS.)
- **Offline:** changes are saved on the device at once and queued. The queue is sent when the browser
  reports it's back online (the `online` event), when the app is opened, and on a short retry timer.
- **The screen never waits for the network.** A small status shows "Saved", "Saving…" or
  "Offline: will sync".
- **Backup nudges stop once data is synced.** The weekly "save a backup" slip exists only because
  the data lives in one browser; the synced adapter reports `mode: 'synced'` and `store.backupDue()`
  returns 0. The Save and Load backup buttons stay, for people who want their own copy.
- **Signed out or no account:** the app keeps working exactly as today, local only, with the nudge.
- **First sign-in on a browser:** an empty account takes this browser's folds; an empty browser
  takes the account's; when both have folds, the person chooses "Keep both" (a union: no tick is
  lost) or "Use only my account's" (this browser's copy is kept aside under a dated key).
- **Conflicts:** each row is its own fact; the last write to reach the account wins. Ticks made on
  two offline devices both survive. Before taking the account's copy, a device sends its queue.
- **Also fetched:** when the tab becomes visible again, when the browser comes back online, and
  every five minutes while the tab is visible.

## What phase 1 put in place (24 October 2026)

- **The adapter seam:** [src/lib/adapters/local.js](../src/lib/adapters/local.js) is now the only
  code that touches `localStorage`. `store.js` calls `load`, `save`, `keepAside`, `protection` and
  `protect` on it, so a Supabase adapter can be added beside it.
- **Persistent storage:** after the first tick of a visit, the app asks the browser to keep the data
  permanently (`navigator.storage.persist()`); the Backup panel shows whether it's protected.
- **Failed saves are reported:** if the browser refuses to save (storage full or blocked), a toast
  says so once instead of the change disappearing silently.
- **Weekly backup nudge** in local mode, with "Remind me tomorrow"; the Backup panel shows when the
  last backup was made.

## Data model (Postgres)

Built 24 October 2026 (D-018): [supabase/migrations/20261024120000_accounts.sql](../supabase/migrations/20261024120000_accounts.sql),
tested on real Postgres by [scripts/check-schema.mjs](../scripts/check-schema.mjs).

| Table | One row per | Local JSON it comes from |
| --- | --- | --- |
| `profiles` | person (made by a trigger at sign-up) | `prefs` |
| `years` | year with a wish or a fold | `years["2026"]` (D-017) |
| `habits` | habit, keyed by `(user_id, slug)` | the habit id (`german`) and `colors[id]` |
| `months` | month that has been used | `months["2026-10"]` existing at all |
| `habit_months` | habit in a month: name, goal, time, start day, schedule, position | `months[key].habits[]` |
| `ticks` | ticked day | `months[key].checks[id]` |

- **Keys are the app's own ids.** A habit is `(user_id, slug)`, so local data maps over with no
  id translation, and streaks across months keep working.
- **`months` is its own table** so a month whose habits were all removed stays empty instead of
  falling back to a draft of the month before (D-017).
- **A tick needs its habit in that month** (foreign key on `user_id, slug, month`); removing a
  habit from a month removes its ticks, exactly as the app does.
- **The database repeats the app's validation** as constraints (slug and colour formats, name and
  wish lengths, goal, start day, cadence, weekdays) and its size limits as triggers (240 months,
  50 habits a month, 1,000 habits, 100 years), so a modified client can't store bad data or fill the
  free database.
- **Row-level security on every table:** a signed-in user reads and writes only rows with their own
  `user_id`; signed-out visitors (`anon`) have no grants at all; a profile can't be deleted by its
  user (deleting the account cascades instead).
- **Not in the cloud:** reminder settings and the reminder log stay on each device (notifications
  are per device), and so do backup reminders. Streaks, percentages and scores stay computed by
  [stats.js](../src/lib/stats.js).
- **Realtime** (`supabase_realtime` publication) is added with the sync adapter, in its own
  migration.

## Phases

1. **Now, no backend. Done 24 Oct 2026** (see above). Ask the browser to keep the data permanently
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
- **27 October 2026:** the fuller plan, with several buddies, three sharing levels and challenges,
  is in [buddies-and-notifications.md](buddies-and-notifications.md). It proposes showing a buddy
  your consistency as totals (never which days were missed), which would replace the rule above.

### Hosting: Cloudflare Pages, Supabase in Mumbai
- **Cloudflare Pages** serves the static site: free, commercial use allowed, 500 builds a month,
  20,000 files, 25 MiB per file, and no bandwidth limit listed for static files. Its network has
  points of presence across India.
- **Supabase project in the Mumbai region** (`ap-south-1`) so the database sits close to the users.
- Vercel was the runner-up; its free Hobby plan is "restricted to non-commercial personal use only".
- **Domain:** `onemorefold.com`, bought 24 October 2026 (the product keeps the name Eightfold, D-015).
- **Deploys (updated 24 Oct 2026, D-014):** Cloudflare now connects a repository as a *Worker*
  rather than a Pages project. `wrangler.jsonc` makes it a static-assets Worker serving `dist/`;
  Cloudflare runs `npm run build`, then `npx wrangler deploy`. Each push to `main` deploys.
- **On the live site the tracker is `/app`** (not `/app.html`). Supabase's redirect URLs must be:
  `https://onemorefold.com/app`, the Worker's preview address (`https://*.workers.dev/app`) and
  `http://localhost:5173/app.html` for development.

## Sources

- [Supabase pricing](https://supabase.com/pricing): free plan limits, pausing after 1 week of inactivity, Pro from $25 a month.
- [Firebase pricing](https://firebase.google.com/pricing): Spark plan Firestore and Authentication limits.
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/): free and paid limits.
- [PocketBase](https://pocketbase.io/) and its [README](https://github.com/pocketbase/pocketbase): SQLite, built-in auth, pre-1.0 compatibility note.
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp): built-in email sends only to the project's team, 2 messages per hour.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): builds, files and sizes on the free plan.
- [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines): Hobby is non-commercial personal use only.
