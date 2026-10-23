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
