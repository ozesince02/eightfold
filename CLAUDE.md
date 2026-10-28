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

**Two sets of docs (D-037).** Public ones live in `docs/` and the repository root, in git, for
everyone. Private ones live in `private/`, which git ignores: they exist only on the owner's
computer. Put **open security weaknesses** (`private/security-open.md`) and anything personal the
owner doesn't want published there, never in a public doc, commit message, PR or issue. When a
weakness is fixed, move it to the public audit log in docs/security.md and delete it from the
private file. Read `private/` when it exists; it may hold context the public docs don't.

- [CONTRIBUTING.md](CONTRIBUTING.md): the rules for everyone, human or AI; keep it in step with
  this file when a rule changes. [README.md](README.md) and [SECURITY.md](SECURITY.md) are the
  public face: update them when setup, scripts or reporting change.
- [docs/security.md](docs/security.md): threat model, rules, audit log.
- [docs/design.md](docs/design.md): the design system. Read it before any UI change.
- [docs/decisions.md](docs/decisions.md): why things are the way they are (D-001...).
- [docs/data-storage.md](docs/data-storage.md): the plan for accounts and cloud data.
- [docs/buddies-and-notifications.md](docs/buddies-and-notifications.md): the plan for buddies,
  challenges and closed-app notifications.
- [docs/vision.md](docs/vision.md): future ideas.

## Branches (D-034)

Two long-lived branches, and work flows one way: **work branch → `preview` → `main`**.

- **`main`** is what gets hosted (Cloudflare). It changes only through a pull request **from
  `preview`**; CI's "Release source" check fails any other PR into `main`.
- **`preview`** is where finished work collects and gets tried before release. It changes only
  through pull requests from work branches.
- **Only the owner (Pulkit) pushes to `main` or `preview` directly**, via the ruleset bypass.
  Claude never does, even though `gh` is signed in as the owner: always a PR.

| Prefix | For | Example |
| --- | --- | --- |
| `feature/` | New behaviour | `feature/habit-schedules` |
| `fix/` | A bug, normal priority | `fix/year-label-overlap` |
| `hotfix/` | Urgent fix for what's live, especially security | `hotfix/security-hardening` |
| `docs/` | Documentation only | `docs/storage-decisions` |
| `refactor/` | Same behaviour, better code | `refactor/store-adapter` |
| `chore/` | Dependencies, tooling, config | `chore/upgrade-vite` |

- Lower-case, words joined by hyphens, short.
- **Branch from an up-to-date `preview`**; push the branch.
- **Open the PR into `preview`** (`gh pr create --base preview`) with what changed, why, and how it
  was tested. Merge it only when the owner agrees and CI passes. Delete the work branch after.
- **Releasing:** when the owner says so, open a PR from `preview` into `main` listing what it
  ships; merge it with a merge commit once CI passes. Never delete `preview` (the ruleset blocks it).
  Afterwards bring `preview` level with `main` by opening a PR from `main` into `preview` (or the
  owner fast-forwards it).
- **Hotfixes** take the same road, quickly: PR into `preview`, then straight on to `main`.
- Rules are GitHub rulesets ("main: releases from preview", "preview: pull requests only"): no
  deleting, no force pushes, a PR required, CI required. Check them with
  `gh api repos/ozesince02/eightfold/rulesets`.
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `npm ci`, `npm run check`,
  `npm run build` and `npm audit` on every PR and on pushes to `preview` and `main`, plus the
  "Release source" check. Keep its permissions read-only and its actions pinned to commit SHAs;
  when bumping an action, update the SHA and the tag comment.
- Commit messages: a short summary line, a blank line, then why. Small, focused commits.
- Another session may be working in its own git worktree (`git worktree list`). Check
  `git status` before switching branches in a shared folder.

## Configuration

- **Build settings (D-035):** the `VITE_*` values Vite builds into the site (Supabase URL,
  publishable key, VAPID public key). **No env file is ever in git**, `.env` included.
  [.env.example](.env.example) lists the names. Locally, copy it to `.env`. The hosted builds read
  them as variables: Cloudflare → Workers Builds → build variables, and GitHub → repository
  variables for CI. Only public values go there; `npm run check` fails on anything secret-looking,
  and on a tracked `.env`. Secrets live only in the Supabase / Cloudflare dashboards (and the
  git-ignored files `npm run vapid` writes). A build with the settings missing or malformed fails
  on purpose.
- **[src/config.js](src/config.js):** the one place code reads settings from (`SUPABASE_URL`,
  `CRANE_GOAL`, `STORE_KEY`, ...). Don't hard-code a value used in more than one place; add a named
  constant there. Validation limits stay in `LIMITS` in `src/lib/sanitize.js`.
- **CSP:** `public/_headers` names Supabase with placeholders that `vite.config.js` fills from
  the build settings after the build.

## When you change something

- Add a line to [CHANGELOG.md](CHANGELOG.md) (what changed, for users).
- When a release ships something people will notice, add it to the patch notes
  ([src/data/patch-notes.js](src/data/patch-notes.js), D-032): plain, warm, a little funny, no
  technical detail.
- Add or update a decision in docs/decisions.md when a choice would surprise a later reader.
- Add new ideas the owner mentions to docs/vision.md.
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

## Hosting

- **Live:** Cloudflare Worker `onemorefold` serving `dist/` ([wrangler.jsonc](wrangler.jsonc),
  D-014), deployed from `main` by Workers Builds (`npx wrangler deploy`). The tracker is `/app`.
- **Preview:** the `preview` branch is a Worker Preview at
  `https://preview-onemorefold.<account subdomain>.workers.dev` (D-034), made by
  `npm run deploy:preview`, which skips every other branch. It uses the **live** Supabase project:
  sign in there with a throwaway account when trying risky changes.
- **Dashboard settings this relies on** (the owner sets them; Claude never handles tokens):
  Workers & Pages → onemorefold → Settings → Build: production branch `main`; Build command
  `npm run build`; Deploy command `npx wrangler deploy`; Branch control → **Enable Preview
  Builds** on, Preview command `npm run deploy:preview`. Supabase → Authentication → URL
  Configuration → Redirect URLs includes the preview address with `/app`.
`npm run build && npx wrangler dev` runs the real Cloudflare runtime locally with the production headers.
`npm run build && node scripts/serve-dist.mjs` serves the production build with the real security
headers on http://localhost:4173.
