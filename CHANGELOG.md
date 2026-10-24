# Changelog

What changed, for people using the app. Why it changed lives in [docs/decisions.md](docs/decisions.md).
Dates are when the work landed.

## Unreleased

### Changed
- Landing page: the demo is "Try it with these six", and "Your day, in order" describes the
  feature for everyone rather than the sheet's habit names. "Streaks that survive the 1st" is now
  "Habits on your schedule" (chosen days, times a week, weekly, monthly); the zine's streaks panel
  says that a run keeps counting past the 1st.
- **The landing page speaks to new visitors.** Sections sit closer together; the "What it keeps"
  cards now fit on screen while they slide. Numbers are labelled as an example from oze's own sheet
  (1 January to 22 October 2026) and habit names are everyday ones. New closing words, and a
  footer with the author's name, email and GitHub. (D-021)
- **A new visitor's tracker starts empty**, instead of showing the sheet's habits. "Reset to the
  sheet" is gone. The landing page still tells the sheet's story. (D-016, D-020)
- The backup reminder stops while you're signed in and synced.
- The landing page's "Try it with today's six" now uses six generic tasks (make your bed, walk outside,
  read ten pages...) instead of real habits. (D-016)
- The tracker opens months from your first month of habits up to next month, and the arrows stop
  at those ends. Looking at a month no longer saves an empty copy of it; it's saved once you change
  something. (D-017)

### Fixed
- **Deploying to Cloudflare works.** A `wrangler.jsonc` tells Cloudflare to serve the built site
  instead of guessing from the Vite config (which failed). The tracker lives at `/app`; old
  `/app.html` links still work. (D-014)
- Development tooling uses a patched `undici` (a dependency of Wrangler) after new security
  advisories. Nothing visitors download changed.

### Added
- **Your account, in the corner.** A crumpled paper ball in the header of every page: tap it to
  sign in, or to keep going on this device only. Signed in, it's folded flat with your initial and
  shows whether your folds are saved. (D-022)
- **Sign in and sync.** Sign in with Google or an emailed link from the Account panel on the
  Habits page, and your folds are saved to your account and reach your other devices. Changes made
  offline sync when you're back. Optional: signed out, everything works as before. (D-019, D-020)
- A not-found page in the paper style.
- **Fold the year.** In December and January a slip offers a look back at the year (cranes,
  perfect days, best month, longest run, most-folded habit), lets you choose which habits come into
  January, and asks for next year's wish. (D-017)
- **A wish for each year.** Crane 1,000 of 2027 can be for something new; the year view shows each
  year's wish. Your current wish stays with 2026. (D-017)

### Docs
- D-018: the accounts database (tables, limits and row-level security), ready to run in Supabase.
  Nothing changes in the app yet.
- D-015: the product keeps the name **Eightfold**; onemorefold.com is its address. Eightfold is
  one more fold after seven: "fall seven, rise eight".
- D-016: what personal data is public for now, and the accepted risk of a public repository.

## 0.6.0 — 24 October 2026

### Added
- **Habit schedules.** A habit can repeat every day, on chosen days (say Monday and Wednesday),
  a number of times a week, once a week, or once a month. Set it under Habits → Repeats; the goal
  updates to match. (D-013)
  - The month grid only puts boxes on days a habit is due; other days show a quiet dot and are
    never counted as misses.
  - Today shows what's due today, then **This week** and **This month** strips with progress like
    "1 of 3 this week".
  - Percentages, goals and runs count in the habit's own units: days, weeks or months.
  - Reminders skip rest days and stop once a weekly or monthly goal is met.
- Arrow keys in the grid hop over rest days.

### Changed
- In the Days view the grid's columns are now "Due" and "% due", since a weekly habit is counted in weeks.

### Fixed
- On phones, the habit editor squeezed Time and From day into a 40px column; it now uses three even columns.

### Docs
- `main` now changes only through pull requests ([CLAUDE.md](CLAUDE.md), D-010).

### Tooling
- GitHub Actions CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `npm ci`, `npm run check`,
  `npm run build` and `npm audit` on every pull request and every push to `main`. Read-only
  permissions; actions pinned to commit SHAs.

## 0.5.0 — 24 October 2026

### Added
- **Your data is safer in the browser.** After your first tick of a visit, Eightfold asks the
  browser to keep its data permanently; the Backup panel shows whether it's protected and when you
  last saved a backup.
- **Weekly backup nudge:** a slip at the top of the month after 7 days without a backup, with
  "Remind me tomorrow". It disappears once accounts and sync exist. (D-012)
- If the browser ever refuses to save a change, you're told straight away.

### Security
- Backups are checked field by field before loading; a damaged or crafted file is refused with a
  plain reason and nothing changes. Stored data gets the same checks every time the app opens, and
  data that can't be read is kept aside instead of deleted.
- Habit names on the landing page are now escaped, so text in a name can never run as code.
- Security headers and a strict Content-Security-Policy for the hosted site (`public/_headers`).
- Links that act on a reminder only work for a reminder that actually fired.
- Development tools upgraded (Vite 8, sharp 0.35): `npm audit` reports 0 vulnerabilities.
- New [docs/security.md](docs/security.md) with the threat model, rules and audit log;
  `npm run check` now includes 25 hostile-data checks.

### Docs
- Branch conventions and the security-first rule in [CLAUDE.md](CLAUDE.md) (D-010, D-011).
- Accounts and cloud data decided (D-008, now accepted): Google and email-link sign-in, private
  accounts with opt-in buddies later, Cloudflare Pages hosting with Supabase in Mumbai.
  Details in [docs/data-storage.md](docs/data-storage.md).
- New ideas in [docs/vision.md](docs/vision.md): opt-in buddies, and weekly and monthly goals with
  habits on chosen days. The proposed schema leaves room for those schedules.

## 0.4.0 — 23 October 2026

### Added
- **Days, Goal or Both.** A switch on the Month and Year pages chooses how percentages are read:
  ticks against the days so far, against each habit's goal, or the two side by side. Days is the
  default; change it with "Make default" or on the Habits page. (D-006)
- Every percentage now says what it counts, for example "13 of 30 days" or "13 of 20 goal days".
- Docs: this changelog, [decisions](docs/decisions.md), the [design system](docs/design.md),
  the [data storage study](docs/data-storage.md) and the [vision](docs/vision.md).

### Changed
- This month's success rate counts only the days so far. Today counts once it's ticked.
- A month's goal total counts each habit at most at its goal.

### Fixed
- September's gym read 65% with no hint that it was against a 20-day goal, not 30 days.

## 0.3.0 — 23 October 2026

### Changed
- **Renamed to Eightfold** (was the working name Orizuru). New hero line, "Fall seven, rise eight",
  and the story behind the name in the Why section. (D-009)
- Data saved under the old name is picked up automatically.
- The project now lives in its own folder on the Desktop.

## 0.2.0 — 23 October 2026

### Added
- **Reminders** at each habit's time: system notifications with Done and "In 10 minutes" buttons,
  or a paper note on the page. Choose how early, and which habits. (D-007)
- "Next nudge" line under Today.

### Fixed
- Ticking a square no longer scrolls the month grid back to the 1st.

## 0.1.0 — 23 October 2026

### Added
- Landing page: the crane that folds as you tick today's habits, the story, the feature zine,
  the year as paper mountains, what's new.
- Tracker: the month grid with goals and streaks, today's checklist, daily and weekly scores,
  top habits, your day in order, the year view, a habit editor, the 1,000-crane wish, JSON backup.
- January to October 2026 imported from the Google Sheet.
