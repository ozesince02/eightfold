# Changelog

What changed, for people using the app. Why it changed lives in [docs/decisions.md](docs/decisions.md).
Dates are when the work landed.

## Unreleased

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
