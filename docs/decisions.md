# Decisions

Every decision that shapes the app, why it was made, and what it costs. Newest last.
Add one when a choice would surprise someone reading the code later. Status is **Accepted**,
**Proposed** or **Replaced by D-xxx**.

---

## D-001 A static site: Vite, plain JavaScript, Three.js, GSAP
Accepted · 23 Oct 2026

- **Context:** a single-person habit tracker that may become a phone app and a small multi-user app.
- **Decision:** no framework. ES modules built by Vite into a static site with two pages:
  `index.html` (landing) and `app.html` (tracker). Three.js draws the crane, GSAP runs the motion.
- **Why:** the app is small, renders from one state object, and needs no server. Static files host
  anywhere for free and wrap into a phone app with Capacitor unchanged.
- **Cost:** views re-render with template strings, so focus and scroll are restored by hand
  (`render()` in app.js). If screens grow much more complex, revisit a small view library.

## D-002 All data in one localStorage object
Accepted · 23 Oct 2026 · will be extended by D-008

- **Decision:** one JSON object under `eightfold:v1`: `months[YYYY-MM] = { habits[], checks{id: [days]} }`,
  plus `wish`, `colors`, `reminders`, `prefs`. JSON backup and restore on the Habits page.
- **Why:** zero setup, works offline, trivially exported.
- **Cost:** one browser only; clearing site data deletes it. See [data-storage.md](data-storage.md).

## D-003 Seeded from the Google Sheet, January to October 2026
Accepted · 23 Oct 2026

- **Decision:** the sheet's ticks were copied by hand into `src/data/seed.js`, with habit ids
  (`move`, `dsa`, `german`...) that link renamed habits across months.
  `scripts/check-seed.mjs` recomputes every month against the sheet's printed success rate.
- **Known difference:** January shows 44% against the sheet's 45%. The sheet counted one stray tick
  in a habit row with no name; it was left out.
- **The sheet is not synced.** It was a one-time import.

## D-004 No stored formulas: every number is computed
Accepted · 23 Oct 2026

- **Decision:** `src/lib/stats.js` computes everything the sheet's formulas did from the ticks:
  per-habit done, left and progress, streaks, daily and weekly scores, monthly and yearly rates.
- **Kept from the sheet on purpose:** weeks count from the 1st (days 1–7, 8–14...), not calendar
  weeks. A habit added mid-month has a `start` day and no boxes before it.
- **Changed from the sheet:** current streaks continue across months (the sheet reset them each tab).

## D-005 The look: paper-cut collage, origami and anime touches
Accepted · 23 Oct 2026

- **Decision:** the user asked for a Vox-style paper collage with origami and anime vibes, cute but
  not girly. The full system is in [design.md](design.md).
- **Deliberate departures from the design-taste skill's house rules:** paper sheets cast shadows,
  because a shadow is what makes paper read as paper; torn edges and tape are decorative by nature.
  Gradients, glass, emoji and stock icon cards stay banned.
- **Palette adjusted after review:** the first pairing (cream with orange-vermilion) read as a generic
  "assistant" palette. The ground moved to a neutral stone washi `#E6E5E1` and the accent to crimson
  `#C8302C`, which also passes contrast for white text.

## D-006 Three ways to read a percentage: days, goal, both
Accepted · 23 Oct 2026

- **Context:** the user saw September's gym at 65% after 13 days in a 30-day month. 65% was 13
  against the sheet's 20-day goal. The app mixed three denominators without saying which.
- **Decision:**
  - **Days** (default): ticks against the days so far. Today counts only once it's ticked, so an
    unticked morning isn't a miss. Past months use every day.
  - **Goal**: ticks against each habit's monthly goal, as the sheet's PROGRESS column did.
    A habit can pass 100% (January DSA was 27 against 10). In month totals each habit counts at most
    its goal, so one overachiever can't hide the rest.
  - **Both**: the two side by side, days first.
  - A switch on the Month and Year pages changes the view; "Make default" or the Habits page sets
    the default (`prefs.percentView`).
  - Every percentage on screen says what it counts ("13 of 30 days", "13 of 20 goal days").
- **Consequence:** the current month's success rate is now counted so far. October reads 61%
  (80 of 132) where the sheet said 43% by counting 24–31 October as misses. For now October also
  shows as the best month of the year, because it's measured on 22 days.
- **Checks:** `scripts/check-stats.mjs`.

## D-007 Reminders in the browser only, for now
Accepted · 23 Oct 2026

- **Decision:** a timer checks every 20 seconds. A habit that has a time, is switched on, started
  and is not ticked fires once a day, up to two hours late. A system notification is used when the tab is in
  the background (with Done and "In 10 minutes" buttons through a service worker, `public/sw.js`);
  a paper note shows on the page when it's in front or notifications are blocked.
- **Limit:** browsers only run this while an Eightfold tab is open. Reminders with the app closed
  need push from a server (D-008, phase 3) or the phone app.
- **Checks:** `scripts/check-reminders.mjs`.

## D-008 Accounts and cloud data: Supabase behind a storage adapter, local-first
Accepted · 23 Oct 2026 · not built yet

- **Context:** family and friends may use the app, which needs sign-in, sessions and data that
  outlives a browser, without loading the app with a backend before it's needed.
- **Decision:** keep the app working with no account. When accounts come, add Supabase (Postgres,
  built-in auth and sessions, row-level security) behind the same `store.js` API, syncing a local copy.
  Full comparison with Firebase, PocketBase and Cloudflare D1, the schema, and the phases are in
  [data-storage.md](data-storage.md).
- **Settled with the user:**
  - **Sign-in:** Google and emailed magic links; no passwords. Email needs a custom SMTP provider,
    because Supabase's built-in email only reaches the project's own team, 2 messages an hour.
  - **Sharing:** every account private at launch. Opt-in buddies come later; the schema keeps
    `user_id` on every row so sharing is new rules, not moved data.
  - **Hosting:** Cloudflare Pages for the site, Supabase in Mumbai for the database.
    A custom domain is needed (also for email links), and the project needs a git repository.

## D-009 The name: Eightfold
Accepted · 23 Oct 2026

- **Context:** working name was Orizuru (paper crane). The user wanted something personal and global:
  they were inconsistent for years and are now building discipline.
- **Decision:** Eightfold. Fall seven times, rise eight: this is the eighth rise. It also means
  folding (every tick is a fold), and nods to the Eightfold Path, which began in India.
- **Note:** a large AI hiring company is also called Eightfold; for app stores, list as
  "Eightfold: Habits".
- **Migration:** data saved under the old key `orizuru:v1` is read automatically and saved under
  `eightfold:v1`. The 3D model is still called an orizuru in code comments: that's the Japanese
  word for a paper crane.

## D-010 Git workflow: main is production, work on prefixed branches
Accepted · 24 Oct 2026

- **Decision:** the repository lives at github.com/ozesince02/eightfold. `main` is what Cloudflare
  Pages hosts and is never committed to directly. Work happens on `feature/`, `fix/`, `hotfix/`,
  `docs/`, `refactor/` or `chore/` branches (conventions in [CLAUDE.md](../CLAUDE.md)) and merges
  into `main` once checks and the build pass and the user agrees.
- **Why:** hosting from a branch that only receives finished, checked work keeps the live app stable.
- **Update, 24 Oct 2026:** `main` changes only through pull requests, merged when the user agrees.

## D-011 Security and reliability before features
Accepted · 24 Oct 2026

- **Context:** the app will hold family and friends' personal data. The user set the priority:
  "features are secondary but reliability is primary".
- **Decision:** every change follows [security.md](security.md): validate input through
  `src/lib/sanitize.js`, escape output, a strict Content-Security-Policy and security headers
  (`public/_headers`), no secrets in git, `npm audit` at zero, row-level security once there's a
  database, and an audit log of what was found and fixed.
- **Cost:** some inline convenience is gone (the boot snippet is a file now), and new external
  services need a deliberate CSP change.

## D-012 Local data safety, and backups only while unsynced
Accepted · 24 Oct 2026

- **Decision:** storage goes through an adapter (`src/lib/adapters/local.js`). The app asks the
  browser for persistent storage after a real click (Firefox may show a prompt, so never on load),
  reports a refused save once, and nudges for a JSON backup every 7 days with a one-day snooze.
- **The user's rule:** once data is on Supabase, changes sync in real time, or as soon as there is a
  network, and the backup nudge goes away. The nudge is tied to `adapter.mode === 'local'`.
- **Checks:** `scripts/check-backup.mjs`.

## D-013 Habit schedules: chosen days, times a week, weekly and monthly
Accepted · 24 Oct 2026

- **Context:** the user wants long-term goals (weekly, monthly) beside daily ones, and habits that
  belong only on some days ("Monday and Wednesday"), shown gracefully in the data and the UI.
- **Decision:** each month's habit has a cadence (`src/lib/schedule.js`):
  - **Every day** (`daily`, the default; existing data has no cadence key and stays daily).
  - **On chosen days** (`weekdays`, 1 = Monday ... 7 = Sunday). Other days are rest days: no box,
    never a miss, and they neither break nor extend a run.
  - **Times a week** (`times_per_week`, N from 1 to 7). Any day counts. Weeks are the app's weeks from
    the 1st; a short last week (29th–31st) asks for round(N × days ÷ 7), at least 1.
  - **Once a week** (`weekly`) and **once a month** (`monthly`), on any day.
- **How they count:**
  - Units follow the schedule: days, weeks, or the month.
  - Days view: done against what was due so far. The current day, week or month only counts once it's done, so it's
    never a miss before it ends.
  - Goal view: completed units against the goal. Extra ticks in a week don't count past its target.
  - Changing a schedule resets the goal to what the schedule implies (Mon/Wed/Fri in October is 13,
    three a week is 13, once a week is 5). The goal stays editable.
  - A day's score counts habits due that day plus weekly and monthly ticks made that day, so a
    weekly habit never makes a day look worse.
  - Streaks walk back in the habit's unit and across months while the schedule's unit stays the same.
  - Raw ticks still all count as folds (cranes).
- **In the app:** Today lists what's due today, then "This week" and "This month" strips with
  progress ("1 of 3 this week"). The grid shows dots on rest days and dashed boxes for any-day habits.
  Reminders skip rest days and stop once a weekly or monthly goal is met.
- **Checks:** `scripts/check-schedules.mjs` (hand-counted October 2026 cases).

## D-014 Hosting as a Cloudflare Worker serving static files
Accepted · 24 Oct 2026 · refines D-008's "Cloudflare Pages"

- **Context:** Cloudflare's dashboard now creates a Worker (Workers Builds) when connecting a
  repository, not a classic Pages project. With no config in the repo, its deploy step
  (`npx wrangler deploy`) tried to auto-detect the project from `vite.config.js` and failed.
- **Decision:** `wrangler.jsonc` declares a static-assets Worker that serves `dist/` (built by
  `npm run build`). No server code. `public/_headers` still sets the security headers (verified on
  Cloudflare's local runtime), `public/404.html` is the not-found page, and
  `html_handling: auto-trailing-slash` serves the tracker at `/app` (old `/app.html` links redirect,
  keeping their query string).
- **Pinned tooling:** Wrangler is a dev dependency at an exact version at least two weeks old
  (4.149.0), so Cloudflare installs that rather than whatever is newest, and `npm audit` covers it.
- **Note:** the Worker name in `wrangler.jsonc` must match the Worker's name in the dashboard.

## D-015 The product stays Eightfold; onemorefold.com is the domain
Accepted · 24 Oct 2026 · replaces the earlier plan (same day) to rename the product to One More Fold

- **Context:** `eightfold.com` and `eightfold.app` are taken. The user bought **onemorefold.com**,
  and the Cloudflare Worker is called `onemorefold`. The first plan was to rename the product to
  One More Fold once setup was done.
- **Decision:** the product keeps the name **Eightfold**; **onemorefold.com** is only its address.
  The two names tell the same story: the idea is **"fall seven times, rise eight"**, and eightfold
  is one more fold after seven. Nothing is renamed: not the code, the storage key, the docs or the
  GitHub repository (`ozesince02/eightfold`). The Worker keeps its name `onemorefold` (D-014).
- **The landing page can say so.** A "why this name" section can later connect the name and the
  domain, and bring in the words that matter in the user's life:
  - "Thoughts become things" (*The Secret*): every fold turns an intention into something real;
    the thousandth is the wish.
  - "The only way to eat an elephant is one bite at a time" (heard in the film *The Six Triple Eight*):
    a thousand cranes, folded one at a time.
  - "To lose patience is to lose the battle": not one big effort, just one more.
  - *Make Your Bed*: start with one small task, done today.
  - *Ikigai*: steady, unhurried practice as a way of living.
- **Ask the user to review that copy** before merging it.

## D-016 What personal data is public, for now
Accepted · 24 Oct 2026 · revisit when accounts ship

- **Context:** with the site live on onemorefold.com, the app falls back to the January–October
  sheet data (`src/data/seed.js`) for any visitor with nothing saved, and the landing page quotes
  the owner's habits, times and numbers. The GitHub repository is public, so the data is also in
  its history.
- **Decisions by the owner:**
  - **Live tracker:** left as is until accounts exist. When accounts ship, new visitors and new
    accounts start empty; the owner's history moves into the owner's account only.
  - **Landing page:** the goal is the real story and headline totals (ticks, months, the year's
    mountains, perfect days) with no habit names, times or day-by-day grids. **Step one (24 Oct):**
    the "Try it with today's six" demo uses six generic tasks (`src/data/demo.js`). The rest of the
    page keeps its current detail until the owner asks to change it.
  - **Repository:** stays public. The owner judged that a list of habits worked on can't be used
    maliciously. Recorded as an accepted risk in [security.md](security.md).

## D-017 Years: months only when used, a wish per year, and folding the year
Accepted · 24 Oct 2026

- **Context:** the tracker began with 2026 data only. Months are stored by key (`"2026-10"`), so
  2027 is just more months, and habits already carry over from one month to the next. Three things
  around that didn't fit a second year: opening any month (even 2031 or 2019) saved an empty copy
  of it; the arrows went forward and back forever; and there was one wish for all time while the
  crane count resets every year.
- **Decision:**
  - **Months are saved only when something changes in them.** Opening a month that hasn't been
    used shows a draft (last month's habits, empty grid) without saving it. Ticking, adding,
    editing, moving or removing a habit saves the month. This month is always saved, as in the
    sheet, so reminders and the Today list work from the 1st. Once synced, browsing never writes
    rows to the database.
  - **Limits:** the tracker opens months from the first one with a habit in it (nothing before
    the user started) up to next month (so it can be set up ahead). Years go from the first year up
    to this one. An address outside that lands on the nearest month or year that is allowed.
  - **One wish per year:** `years["2026"].wish`. Crane 1,000 of each year is for something new;
    past years keep theirs. An old backup's single `wish` moves to the latest year that has months.
  - **Fold the year:** from 1 December to 31 January, a slip on the current month offers a look
    back at the year (cranes, perfect days, best month, longest run, most-folded habit), a
    checklist of the habits to carry into January (all ticked by default), and next year's wish.
    Folding records `years["2026"].foldedAt`. A habit you let go that already has ticks in January
    stays, and you're told so: ticks are never thrown away. Skipping the ritual changes nothing:
    habits carry over by themselves.
- **Data:** a top-level `years` map, `{ "2026": { wish, foldedAt } }`, validated in
  `cleanState()` (four-digit years, wish capped at 200 characters, at most 100 years). In Postgres
  it becomes a `years` table (see data-storage.md); `profiles.wish` goes away.
- **Later:** a year recap and comparisons between years (vision.md) read the same data; nothing
  extra needs storing for them.

## D-018 The accounts database
Accepted · 24 Oct 2026

- **Context:** sign-in and sync need somewhere to keep each person's data (D-008: Supabase).
- **Decision:** six tables (`profiles`, `years`, `habits`, `months`, `habit_months`, `ticks`) in
  one migration, `supabase/migrations/20261024120000_accounts.sql`, run once in the Supabase SQL
  editor. Details in data-storage.md.
  - **The app's ids are the keys** (`user_id, slug`) instead of new UUIDs: no mapping table, nothing
    to keep in step, and a backup file still maps one to one.
  - **The database enforces the same rules as `sanitize.js`**, plus per-person size limits, because
    anyone can call the Data API with their own session; the app's checks alone aren't enough.
  - **Row-level security on every table; `anon` has no grants at all.** Helper functions live in a
    `private` schema the Data API doesn't expose.
  - **Reminders stay on the device.** Notification permission and timing belong to each phone or
    laptop, so they're not synced.
- **Tested on real Postgres** (PGlite, a dev dependency) in `npm run check`: one user can't read,
  change, delete or plant another's rows; signed-out visitors can't read anything; bad data and
  too many rows are refused; deleting an account removes everything. Turning RLS off on a table
  makes the check fail.
- **Open (owner's call):** whether anyone can sign up, or only invited people. Recommended for
  family and friends: turn off "Allow new users to sign up" in Supabase and invite people from the
  dashboard; the per-person limits cap the damage if sign-up stays open.

## D-019 Sign-in, and settings in one place
Accepted · 24 Oct 2026

- **Sign-in:** Supabase Auth with Google or an emailed link, from an Account panel on the Habits
  page. Optional: signed out, the tracker works exactly as before.
  - **PKCE flow:** Google's redirect and the email link bring back a one-time code that only the
    browser that asked can exchange, never a token in the address bar. So the email link must be
    opened in the same browser; the panel says so.
  - **Loaded late:** the Supabase client is its own chunk, fetched after the tracker has rendered,
    so the landing page never loads it and a slow network never delays the grid.
  - **Errors:** a failed sign-in coming back as `?error=` shows a fixed message (the description
    in the URL is never displayed); the code and error are removed from the address afterwards.
  - **Sign out** is for this device only, and leaves the local data where it is.
  - **This PR doesn't sync yet.** It's meant to ship together with the sync PR that follows.
- **Settings:** deployment values live in `.env` and are read only through `src/config.js`,
  together with product constants (`CRANE_GOAL`, `STORE_KEY`, `BACKUP_EVERY_DAYS`). `.env` is
  committed because everything in it is public and ends up in the built site anyway (Vite's
  convention); secrets go in `.env.local` or the dashboards. Guards: `npm run check` fails if `.env`
  holds any name other than the two public settings or a value that looks like a key; the build
  fails if they're missing or the key isn't a publishable one; the CSP's Supabase entries are filled
  from `.env` so the two can't drift apart.

## D-020 Sync, and new visitors start empty
Accepted · 24 Oct 2026

- **How:** the store still saves to localStorage first. The sync engine turns each save into row
  changes (a diff of the state as rows against what the account has), queues them on the device,
  and sends them in batches; then it fetches the account's rows and takes them if nothing changed
  here meanwhile. Whole-state diffs mean every way of changing data (ticks, editor, import, fold)
  syncs without each one knowing about the network.
- **Other devices** learn of changes from a broadcast on a private per-person Realtime channel,
  authorised by RLS on `realtime.messages` (migration `20261024130000_sync_channel.sql`). Realtime
  "Postgres changes" was rejected: delete events bypass RLS and would hand other people's keys out.
- **First sign-in with folds on both sides asks** ("Keep both" or "Use only my account's") instead
  of guessing; neither choice deletes anything.
- **Refused rows** (bad data or a limit) are dropped one by one so they can't block the queue, and
  the person is told. Network errors retry with backoff up to a minute.
- **Signing out** stops syncing and clears the queue; the folds stay in the browser.
- **Shared browsers:** the browser remembers which account it last synced with. If someone else
  signs in, the earlier person's folds are kept aside on the device and the tracker starts from the
  new account: they are never uploaded to it or merged into it.
- **Nothing is replaced without a copy:** before "Keep both", before "Use only my account's", and
  before the account's copy replaces local rows the account refused, the browser's data is kept
  aside under a dated key.
- **New visitors start empty (D-016).** The tracker no longer falls back to the sheet's data, and
  "Reset to the sheet" is gone. The landing page still tells the sheet's story from `seedState()`.
- **Tested** by `scripts/check-sync.mjs`: the real engine against the real schema and RLS, with
  several devices, a second person, offline edits across a reload, conflicting offline ticks, both
  first-sign-in choices, more than 1,000 rows and the broadcast. Skipping deletes in the engine
  makes it fail.

## D-021 The landing page tells oze's story, under everyday names
Accepted · 24 Oct 2026

- **Context:** the landing page showed the owner's real habits and numbers as if they were the
  visitor's, and phrased them as "now" ("October is still being folded"). With the app open to
  everyone, a first-time visitor couldn't tell whose numbers these were.
- **Decision:** the numbers stay real (they're the story) but are **labelled as oze's**, from
  1 January to 22 October 2026, the day before Eightfold was born, and computed **as of that date**
  (`STORY_DATE`), so they never drift. **Habit names are everyday stand-ins** (`STORY_ALIASES` in
  `src/data/demo.js`: "Read ten pages", "Walk outside"...), and the page says so. The closing
  speaks to new visitors and quotes oze. The footer names the author from `AUTHOR` in config.js.
- **Layout:** the space between sections is margin (64–128px by screen width), not padding, so the
  pinned "What it keeps" section holds only its content; its cards size to the screen's height and,
  on screens under 900px tall, the decorative page hides. All cards stay on screen while it slides.

## D-022 The account is a piece of paper in the header
Accepted · 24 Oct 2026

- **Context:** sign-in lived in a panel on the Habits page, three clicks from anywhere and easy to
  miss; once signed in, nothing on screen said so.
- **Decision:** both pages carry the account in the header's right corner (`src/ui/account-menu.js`,
  `src/styles/account.css`). Signed out it's a **crumpled paper ball** that floats a little ("Sign
  in" beside it on wider screens): not yours yet. Signed in it's **folded flat**, a red square on
  its corner with your initial and the sync dot ("Signed in"): yours. Tapping it opens a **chit**,
  taped at the top and torn at the bottom: sign-in choices with "Not now, keep it on this device",
  or who you are, sync status and Sign out (plus "Open your tracker" on the landing page).
- Sign-in from either page returns to the tracker (`APP_PATH`). The Habits page's Account panel is
  gone; the "two sets of folds" slip on the month stays.
- **Accessibility:** a real button with `aria-expanded` and a label that says the state; the chit
  is a labelled dialog, takes focus, closes on Escape or a tap outside and returns focus. Phones
  get the paper without the label and a full-width chit under it. Reduced motion: no float, no unfold.

