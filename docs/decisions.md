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

## D-015 Rename to One More Fold (after setup)
Proposed · 24 Oct 2026 · to do once accounts and hosting are set up

- **Context:** `eightfold.com` and `eightfold.app` are taken. The user bought **onemorefold.com**,
  and the Cloudflare Worker is already called `onemorefold`.
- **Decision:** the product becomes **One More Fold**. The rename (wordmark, titles, landing copy,
  docs, storage key with a fallback like D-009's) happens in its own pull request **after** the
  account and hosting setup is finished, not before.
- **The story must not change, only deepen.** The core stays **"fall seven times, rise eight"**:
  one more fold *is* the eighth rise, getting up one more time. Around it, the "why this name"
  section on the landing page brings in the words that matter in the user's life:
  - "Thoughts become things" (*The Secret*): every fold turns an intention into something real;
    the thousandth is the wish.
  - "The only way to eat an elephant is one bite at a time" (heard in the film *The Six Triple Eight*):
    a thousand cranes, folded one at a time.
  - "To lose patience is to lose the battle": not one big effort, just one more.
  - *Make Your Bed*: start with one small task, done today.
  - *Ikigai*: steady, unhurried practice as a way of living.
- **Ask the user to review the new "why" copy** before merging the rename.
- **Rename the GitHub repository too:** `ozesince02/eightfold` → `ozesince02/onemorefold`. GitHub
  redirects the old URL, but then: update the local `origin` remote, check that the Cloudflare
  Worker's Git connection still builds (reconnect it if not), and update links in the docs.
  Renaming the local folder on the Desktop is optional and done last.
