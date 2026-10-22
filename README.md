# Eightfold

Fall seven times, rise eight. A paper-craft habit tracker, folded out of *oze's Habit Tracker v2* (Google Sheets).

```bash
npm install
npm run dev      # http://localhost:5173 (landing) and /app.html (tracker)
npm run build    # static site in dist/
```

## What's where

| Path | What it is |
| --- | --- |
| `index.html`, `src/landing.js`, `src/styles/landing.css` | Landing page: the crane you fold by ticking today's habits, the story, the feature zine, the year as mountains |
| `app.html`, `src/app.js`, `src/styles/app.css` | The tracker: Month (grid, today, goals, daily and weekly scores, top habits, your day), Year, Habits (edit, wish, backup) |
| `src/data/seed.js` | Jan–Oct 2026 transcribed from the sheet. `node scripts/check-seed.mjs` recomputes each month against the sheet's own rates |
| `src/lib/store.js` | All data in one localStorage object (`eightfold:v1`, which also reads data saved under the old working name `orizuru:v1`); export/import JSON |
| `src/lib/stats.js` | Everything the sheet's formulas did: per-habit done/left/progress, streaks, daily, weekly, global and goal progress, top habits, annual rates |
| `src/lib/reminders-core.js`, `src/ui/reminders.js`, `public/sw.js` | Reminders at each habit's time: system notifications with Done / In 10 minutes buttons, or a paper note on the page. `node scripts/check-reminders.mjs` tests the timing. They only fire while an Eightfold tab is open |
| `src/three/` | The Three.js crane (folds from a flat square in six stages) and its stage |
| `src/ui/` | Torn-paper edges, katakana pops, confetti, paper charts |
| `public/img/credits.json` | Sources and licences of the public-domain pictures |

## Docs

- [CHANGELOG.md](CHANGELOG.md): what changed
- [docs/decisions.md](docs/decisions.md): why
- [docs/design.md](docs/design.md): the design system
- [docs/data-storage.md](docs/data-storage.md): accounts and cloud data plan
- [docs/vision.md](docs/vision.md): ideas for later

Checks: `node scripts/check-stats.mjs`, `node scripts/check-reminders.mjs`, `node scripts/check-seed.mjs`.

## Toward phone apps

Everything is plain ES modules with no server, so the same build can be wrapped with Capacitor for Android and iOS. The store is the one piece to swap for sync later.
