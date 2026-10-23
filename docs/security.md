# Security

Reliability and security come before features (decision D-011). This page is the threat model,
the rules every change follows, and the record of what has been checked.

## What we protect

- **People's habit data:** what they do every day, when, and how consistently. Personal, sometimes
  sensitive ("therapy", "medication"). Today it lives in one browser; after accounts (D-008) it lives
  in Supabase too.
- **Their accounts and sessions**, once sign-in exists.
- **The integrity of the app:** nobody else's code should ever run on an Eightfold page.

## Where attacks could come from

| Source | Today | After accounts |
| --- | --- | --- |
| A backup file someone is sent and loads | Yes | Yes |
| A crafted link (`?remind=…`, `#/…`) | Yes | Yes |
| Another script on the same origin editing localStorage | Unlikely (no third-party scripts) | Same |
| Compromised npm packages | Build tools and the two runtime libraries (three, gsap) | Plus the Supabase client |
| Another user's data shown to you | No | Yes, with opt-in buddies |
| Stolen session tokens | No sessions | Yes |
| Over-broad database access | No database | Yes: row-level security is the guard |

## Rules for every change

1. **Validate on the way in.** Anything from outside the code (backup files, stored data, URL
   parameters, service-worker messages, later the network) goes through
   [src/lib/sanitize.js](../src/lib/sanitize.js): known keys only, strict formats (ids
   `^[a-z0-9][a-z0-9-]{0,63}$`, colours `#RRGGBB`, times `HH:MM`, real days of the month), size limits.
   Unknown keys are dropped; bad values fall back to safe defaults.
2. **Escape on the way out.** Free text (habit names, the wish) goes through `esc()` before it
   enters any HTML string. Prefer `textContent` for single values. Never put unescaped data in
   `innerHTML`, an attribute or a `style`.
3. **No inline scripts, no `eval`, no new third-party scripts.** The Content-Security-Policy in
   [public/_headers](../public/_headers) forbids them. A new external origin (fonts, Supabase) is
   added to the policy deliberately, with a note here.
4. **Secrets never in git.** Keys live in `.env` files (ignored). The Supabase *anon* key is
   public by design; the *service-role* key never reaches the browser or the repository.
5. **Least privilege in the database.** Every table has row-level security on, with
   `user_id = auth.uid()` policies. Buddy access is read-only and exposes only what was shared.
6. **Dependencies:** `npm audit` must report 0 before merging to `main`. Upgrade promptly; prefer
   fewer dependencies.
7. **Fail safe, keep data.** If data can't be read, keep it aside (`eightfold:v1:unreadable:<time>`)
   and start clean; never silently delete what someone saved.
8. **Review:** run `npm run check` (includes the security checks) on every branch, and the
   security-review skill on branches that touch data, storage, rendering, auth or headers.

## Security headers (production)

Set by Cloudflare Pages from [public/_headers](../public/_headers). Test locally with
`npm run build && node scripts/serve-dist.mjs` (serves `dist/` on http://localhost:4173 with these headers).

| Header | Value (short) | Why |
| --- | --- | --- |
| Content-Security-Policy | `default-src 'self'; script-src 'self'; …` | Blocks injected and third-party scripts, plugins, framing and form hijacking |
| — `style-src` | `'self' 'unsafe-inline' fonts.googleapis.com` | Inline `style` attributes carry habit colours; styles can't run code |
| — `font-src` | `fonts.gstatic.com` | Google Fonts files |
| — `img-src` | `'self' data: blob:` | The paper-grain texture is a data: SVG |
| — `connect-src` | `'self'` | Add the Supabase project URL when accounts arrive |
| X-Content-Type-Options | `nosniff` | No MIME sniffing |
| X-Frame-Options / `frame-ancestors` | `DENY` / `'none'` | No clickjacking |
| Referrer-Policy | `strict-origin-when-cross-origin` | Don't leak paths to other sites |
| Permissions-Policy | camera, microphone, geolocation, payment, usb off | The app needs none of them |
| Strict-Transport-Security | one year, subdomains | HTTPS only |
| Cross-Origin-Opener-Policy | `same-origin` | Isolates the window from pages it opens |

## Audit log

### 24 October 2026 — first audit (branch `hotfix/security-hardening`)

| # | Severity | Finding | Fix | Test |
| --- | --- | --- | --- | --- |
| 1 | High | The landing page put habit names into HTML unescaped. A crafted backup (or later a buddy's data) could run script. | All names and times escaped with `esc()` | Browser test: hostile names render as text, no script runs |
| 2 | High | "Load a backup" accepted any JSON; ids, colours and times went into HTML attributes unchecked, so a file could break out of an attribute. | `parseBackup()` / `cleanState()` validate every field; stored data is validated on load too; every store write validates its input | `scripts/check-security.mjs` (25 cases) |
| 3 | Medium | No Content-Security-Policy or security headers for hosting | `public/_headers`; the one inline script moved to `public/boot.js` | Production build served with the headers: no violations, fonts and the 3D crane load |
| 4 | Medium | A crafted link `app.html?remind=done&h=…&d=…` could tick a habit with no reminder having fired | URL actions only apply if that reminder fired; service-worker messages must come from our own worker | Browser test: crafted link ignored and stripped |
| 5 | High (dev only) | `npm audit`: esbuild (Vite dev server) and sharp (image script) vulnerabilities | Vite 8, sharp 0.35; dev server bound to `localhost` | `npm audit`: 0 vulnerabilities |
| 6 | Low | Corrupted or tampered stored data was either trusted or dropped | Validated on load; unreadable data kept aside, not deleted | Unit test via `cleanState` |

Not issues, checked: notification text uses plain text APIs; `confirm()` and toasts use text;
CSS selectors built from data use `CSS.escape`; the service worker builds same-origin URLs with
`URLSearchParams`; no secrets in the repository.

### Still to do (tracked)
- Before accounts: Supabase row-level security on every table, the anon key in `.env`, the Supabase
  URL in `connect-src`, auth redirect URLs locked to our domain, rate limits on magic-link email.
- When hosting: confirm the headers on the live site (securityheaders.com), enable Cloudflare's
  "Always use HTTPS".
- Consider self-hosting the two fonts to drop the Google Fonts origins from the policy.
