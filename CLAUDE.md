# Eightfold

A paper-collage habit tracker ("fall seven times, rise eight"). Static site: Vite, plain JavaScript,
Three.js, GSAP. Landing page `index.html`, tracker `app.html`. Data in localStorage (`eightfold:v1`).

## Read before working

- [docs/design.md](docs/design.md): the design system. Read it before any UI change; follow it.
- [docs/decisions.md](docs/decisions.md): why things are the way they are (D-001...).
- [docs/data-storage.md](docs/data-storage.md): the plan for accounts and cloud data.
- [docs/vision.md](docs/vision.md): future ideas.

## When you change something

- Add a line to [CHANGELOG.md](CHANGELOG.md) (what changed, for users).
- Add or update a decision in docs/decisions.md when a choice would surprise a later reader.
- Add new ideas the user mentions to docs/vision.md.
- Every percentage on screen must say what it counts (D-006).

## Checks

```bash
node scripts/check-stats.mjs && node scripts/check-reminders.mjs && node scripts/check-seed.mjs
npm run build
```

`npm run dev` serves on http://localhost:5173 (landing) and /app.html (tracker).
