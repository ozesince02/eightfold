# Contributing to Eightfold

Thank you for wanting to help. Eightfold is small and personal: a habit tracker that real people
trust with their routines, made by one person ([oze](https://github.com/ozesince02)) with Claude
Code as a pair programmer. This guide is the deal we all work by, human or AI.

**In one line:** security and people's data come first, features second; every change goes
through `preview` before it reaches the live site; and everything looks and sounds like paper.

## Before you start

- **Small fixes** (a typo, a clear bug, a broken link): open a pull request straight away.
- **Anything bigger** (a feature, a new dependency, a database change, a new page): open an issue
  first and describe what and why. The product direction is the owner's call, and it's kinder to
  say "not now" before you've spent a weekend on it.
- **Security problems:** never in a public issue. See [SECURITY.md](SECURITY.md).
- Read [README.md](README.md) to get it running, and the docs your change touches:
  [docs/security.md](docs/security.md) always, [docs/design.md](docs/design.md) for anything you
  can see, [docs/decisions.md](docs/decisions.md) when something looks odd (it's probably on
  purpose, and the reason is written down).

## The guardrails

These aren't style preferences. A pull request that breaks one is sent back, however good the rest
is. They come from [docs/security.md](docs/security.md), which has the full reasoning.

1. **Validate everything coming in.** Backup files, stored data, URL parameters, service-worker
   messages and network responses go through [src/lib/sanitize.js](src/lib/sanitize.js): known
   keys only, strict formats, size limits. Bad values fall back to safe defaults.
2. **Escape everything going out.** Any text from data goes through `esc()` before it enters an
   HTML string; prefer `textContent`. Never put unescaped data in `innerHTML`, an attribute or a
   `style`.
3. **No inline scripts, no `eval`, no new third-party origins.** The Content-Security-Policy in
   [public/_headers](public/_headers) forbids them. Everything (fonts included) is served from our
   own site. A new origin is a deliberate decision with a note in docs/security.md, not a quick
   fix.
4. **No secrets in git, and no env file in git at all.** `.env` is ignored; `.env.example` lists
   the public build settings. Service-role keys, database passwords, private keys and tokens live
   only in the Supabase and Cloudflare dashboards. `npm run check` fails on anything
   secret-shaped and on a tracked `.env`. If you ever commit a secret by mistake, say so straight
   away: it must be rotated, not just deleted.
5. **Least privilege in the database.** Every table has row-level security, so each person reads
   and writes only their own rows. Signed-out visitors get nothing. The database repeats the app's
   validation as constraints, so a modified client still can't store bad data.
6. **Dependencies are a risk, not a convenience.** Prefer none. A new one needs a reason in the
   pull request. Pin exact versions where it matters, prefer releases at least two weeks old, and
   keep `npm audit` at 0.
7. **Never lose someone's data.** If stored data can't be read, keep it aside and start clean; never
   silently delete what someone saved.
8. **Privacy is a promise.** No analytics, ads, trackers or fingerprinting. If a change sends data
   somewhere new, or keeps something new, the [Privacy page](privacy.html) changes in the same pull
   request.

## How changes flow

Two long-lived branches, and work goes one way: **your branch → `preview` → `main`**.

- **`main`** is the live site, onemorefold.com. It only takes pull requests from `preview`. A CI
  check ("Release source") fails any other pull request into `main`.
- **`preview`** collects finished work, and has its own preview site, where it's tried before
  release. It only takes pull requests.
- Nobody pushes to `main` or `preview` directly, except the owner in an emergency. GitHub rulesets
  enforce this: pull requests only, CI must pass, no force pushes, no deleting.

So:

1. **Fork the repository** (or, as a collaborator, create a branch) from an up-to-date `preview`.
2. **Name the branch** by what it is, lower-case, words joined by hyphens:

   | Prefix | For | Example |
   | --- | --- | --- |
   | `feature/` | New behaviour | `feature/habit-schedules` |
   | `fix/` | A bug | `fix/year-label-overlap` |
   | `hotfix/` | Something urgent on the live site, especially security | `hotfix/security-hardening` |
   | `docs/` | Documentation only | `docs/storage-decisions` |
   | `refactor/` | Same behaviour, better code | `refactor/store-adapter` |
   | `chore/` | Dependencies, tooling, config | `chore/upgrade-vite` |

3. **Commit in small, focused steps.** A short summary line, a blank line, then *why* (the diff
   already says what):

   ```
   Sync: drop an account read that finishes after sign-out

   A pull that started before signing out could write the account's data back into a browser
   that had just been cleared.
   ```

4. **Open the pull request into `preview`,** never `main`. Say what changed, why, and how you
   tested it. The pull request template asks for exactly that.
5. **CI must pass,** then the owner reviews and merges with a merge commit. The branch is deleted
   afterwards.
6. **Releases** are a pull request from `preview` into `main`, opened when the owner decides.

## Checks

Run these before you open a pull request. CI runs the same ones on every pull request.

```bash
npm run check
npm run build
npm audit
```

`npm run check` covers a lot:
- the statistics against hand-counted cases;
- reminder timing;
- hostile input to the backup loader;
- secrets and env files;
- every colour and its contrast in all three themes;
- the real database schema with its row-level security, run on PGlite;
- the sync engine;
- the Web Push encryption, against its RFC.

**Tests are plain Node scripts** in [scripts/](scripts) using `node:assert`, no framework. Put new
logic in a pure function under `src/lib/`, so it can be tested this way, and add the test to the
nearest `check-*.mjs`. A bug fix comes with a test that would have caught it.

**Look at what you changed.** For anything visible, check it in the browser, at 1440, 768 and
390 px wide, and in Light, Warm and Dark (the Paper switch in the account chit). Check it with
reduced motion too.

## Writing code here

- **Match what's around it:** plain ES modules, small functions, no framework. Comments explain
  *why*, not what.
- **Settings live in one place,** [src/config.js](src/config.js). Don't hard-code a value used in
  more than one place. Validation limits live in `LIMITS` in `sanitize.js`.
- **Pure logic in `src/lib/`, screens in `src/ui/` and the page scripts.** The reminder sender
  (an Edge Function) runs exact copies of some `src/lib` modules: after changing `dates.js`,
  `schedule.js`, `reminders-core.js` or `sync/rows.js`, run `npm run shared`. A check fails if the
  copies drift.
- **Database changes** are a **new** SQL file in [supabase/migrations](supabase/migrations), named
  with a timestamp; never edit one that has already run.
  - Every new table gets row-level security, the app's validation as constraints, and size limits.
  - Add tests to `scripts/check-schema.mjs`: someone else can't read it, signed-out visitors get
    nothing, bad values are refused, deleting an account removes it.
  - The owner runs migrations by hand in the Supabase SQL Editor.
- **No secrets in code, logs or messages.** Server code never logs habit names, emails or device
  addresses.

## Design and words

Eightfold looks like a paper-cut collage: washi sheets, torn edges, tape, origami, a few anime
touches. Cute, never childish. [docs/design.md](docs/design.md) is the reference; the essentials:

- **Colours come from role tokens only** (`--bg`, `--sheet`, `--ink`, `--accent`, `--link`, and
  the paper colours). No hex values in components; `npm run check` fails on them, and on low
  contrast.
- **No gradients, glows, glass blur or emoji.** Shadows only on paper lying on paper; controls
  are flat.
- **Accessible by default:** visible focus, 4.5:1 contrast, labels on every control, nothing
  that depends on an animation finishing, `prefers-reduced-motion` respected.
- **Voice:**
  - Plain and warm; "you" in the app.
  - Paper words: fold, crane, sheet.
  - Sentence case, and no exclamation marks outside katakana stickers.
  - A missed day is a fall, never a failure. Never scold.
- **Every number says what it counts:** "13 of 30 days", never a bare "43%".

## What else to update

Part of the change, in the same pull request:

- [CHANGELOG.md](CHANGELOG.md): a line on what changed, for people using the app.
- [src/data/patch-notes.js](src/data/patch-notes.js): for releases people will notice. Plain,
  warm, a little funny, no technical detail.
- [docs/decisions.md](docs/decisions.md): a new or updated decision when a choice would surprise
  someone later.
- [docs/security.md](docs/security.md): the audit log, when you find or fix a security issue.
- [docs/vision.md](docs/vision.md): for new ideas.
- The [Privacy page](privacy.html): when what's kept or shared changes.

## Working with Claude

Much of Eightfold is written with [Claude Code](https://claude.com/claude-code) as a pair
programmer. [CLAUDE.md](CLAUDE.md) is its standing brief, and it holds Claude to the same rules as
everyone else:
- Claude never pushes to `main` or `preview`, and never merges without the owner's yes.
- It never asks for or handles secrets.
- It never opens sign-in pages without asking.
- It runs a security review on branches that touch data, storage, rendering, auth or headers.
- It says plainly when something is a risk.

Commits it helped write carry a `Co-Authored-By: Claude` line.

If you use an AI assistant too, you're responsible for what it writes. Read it, run the checks,
and make sure it follows this guide. A pull request is judged the same way whoever typed it.

## Licence of contributions

Eightfold's code is [MIT licensed](LICENSE). By opening a pull request you agree that your
contribution is licensed the same way. The name and branding aren't part of the licence (see the
[README](README.md#licence)), so a fork needs its own.

## Be kind

Assume good intent, explain rather than dismiss, and remember there's one person on the other
end. Eightfold is about getting up after falling; the same goes for pull requests.
