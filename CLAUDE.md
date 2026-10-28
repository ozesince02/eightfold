# Eightfold

A paper-collage habit tracker ("fall seven times, rise eight"). Static site: Vite, plain JavaScript,
Three.js, GSAP. Landing page `index.html`, tracker `app.html`. Data in localStorage (`eightfold:v1`),
synced to Supabase when signed in (`src/lib/sync/`, D-020); SQL in `supabase/migrations/`.
Repository: https://github.com/ozesince02/eightfold

## Priorities

**Security and reliability first, features second.** Every change follows the rules in
[docs/security.md](docs/security.md): validate everything coming in (`src/lib/sanitize.js`), escape
everything going into HTML (`esc()`), no inline scripts or new third-party origins without updating
the CSP, no secrets in git, `npm audit` at 0. Run the security-review skill on branches that touch
data, storage, rendering, auth or headers. Say plainly when something is a risk.

## Read before working

- [docs/security.md](docs/security.md): threat model, rules, audit log.
- [docs/design.md](docs/design.md): the design system. Read it before any UI change.
- [docs/decisions.md](docs/decisions.md): why things are the way they are (D-001...).
- [docs/data-storage.md](docs/data-storage.md): the plan for accounts and cloud data.
- [docs/buddies-and-notifications.md](docs/buddies-and-notifications.md): the plan for buddies,
  challenges and closed-app notifications.
- [docs/vision.md](docs/vision.md): future ideas.

## Branches

`main` is what gets hosted (Cloudflare Pages). Never commit to it directly.

| Prefix | For | Example |
| --- | --- | --- |
| `feature/` | New behaviour | `feature/habit-schedules` |
| `fix/` | A bug, normal priority | `fix/year-label-overlap` |
| `hotfix/` | Urgent fix for what's live, especially security | `hotfix/security-hardening` |
| `docs/` | Documentation only | `docs/storage-decisions` |
| `refactor/` | Same behaviour, better code | `refactor/store-adapter` |
| `chore/` | Dependencies, tooling, config | `chore/upgrade-vite` |

- Lower-case, words joined by hyphens, short.
- Branch from an up-to-date `main`; push the branch.
- **`main` changes only through a pull request.** Open a PR into `main` with what changed, why, and
  how it was tested (`gh pr create`; the GitHub CLI is installed and signed in). Merge it only when
  the user agrees and the CI checks pass. Delete the branch after merging.
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `npm ci`, `npm run check`,
  `npm run build` and `npm audit` on every PR and push to `main`. Keep its permissions read-only and
  its actions pinned to commit SHAs; when bumping an action, update the SHA and the tag comment.
- Commit messages: a short summary line, a blank line, then why. Small, focused commits.

## Configuration

- **[.env](.env):** deployment settings Vite builds into the site (`VITE_*` only). Committed, so
  it holds **public values only** (the Supabase URL and publishable key); `npm run check` fails if
  anything secret-looking appears. Secrets live in the Supabase / Cloudflare dashboards or in
  `.env.local` (ignored). A build with these settings missing or malformed fails on purpose.
- **[src/config.js](src/config.js):** the one place code reads settings from (`SUPABASE_URL`,
  `CRANE_GOAL`, `STORE_KEY`, ...). Don't hard-code a value used in more than one place; add a named
  constant there. Validation limits stay in `LIMITS` in `src/lib/sanitize.js`.
- **CSP:** `public/_headers` names Supabase with placeholders that `vite.config.js` fills from
  `.env` after the build.

## When you change something

- Add a line to [CHANGELOG.md](CHANGELOG.md) (what changed, for users).
- When a release ships something people will notice, add it to the patch notes
  ([src/data/patch-notes.js](src/data/patch-notes.js), D-032): plain, warm, a little funny, no
  technical detail.
- Add or update a decision in docs/decisions.md when a choice would surprise a later reader.
- Add new ideas the user mentions to docs/vision.md.
- Add to the audit log in docs/security.md when you find or fix a security issue.
- Every percentage on screen must say what it counts (D-006).
- Colours come from role tokens only (`--bg`, `--sheet`, `--ink`, `--accent`, `--link` ...; see
  docs/design.md and D-033). Look at every UI change in Light, Warm and Dark (the Paper switch in
  the account chit); `npm run check` fails on hard-coded colours and low contrast.

## Checks

```bash
npm run check      # stats, reminders, seed and security checks
npm run build
npm audit
```

`npm run dev` serves on http://localhost:5173 (landing) and /app.html (tracker).
Hosting: Cloudflare Worker serving `dist/` ([wrangler.jsonc](wrangler.jsonc), D-014); on the live site the tracker is `/app`.
`npm run build && npx wrangler dev` runs the real Cloudflare runtime locally with the production headers.
`npm run build && node scripts/serve-dist.mjs` serves the production build with the real security
headers on http://localhost:4173.
