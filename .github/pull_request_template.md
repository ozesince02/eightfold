<!-- Into `preview`, never `main` (CONTRIBUTING.md, "How changes flow"). -->

## What changed

## Why

## How it was tested

<!-- Commands run, browsers and widths looked at, themes checked. Say what wasn't tested. -->

## Checklist

- [ ] `npm run check`, `npm run build` and `npm audit` pass
- [ ] Input is validated (`sanitize.js`), output is escaped (`esc()`), no inline scripts or new origins
- [ ] No secrets, and no env files, in the diff
- [ ] New tables have row-level security and tests in `check-schema.mjs` (or no database change)
- [ ] Looked at in Light, Warm and Dark, at phone width, with reduced motion (or nothing visible changed)
- [ ] Colours use role tokens; every number says what it counts
- [ ] CHANGELOG, and decisions, patch notes, the Privacy page or the security audit log where they apply
