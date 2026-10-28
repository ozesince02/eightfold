// Themes (D-033): every text colour in every theme is readable on what it sits on, and no
// stylesheet slips in a colour of its own. Run by `npm run check`.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tokens = read('src/styles/tokens.css');

// ---------- The palettes ----------
function block(selector) {
  const at = tokens.indexOf(selector);
  assert.ok(at >= 0, `tokens.css has ${selector}`);
  const body = tokens.slice(tokens.indexOf('{', at) + 1, tokens.indexOf('\n}', at));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}
const light = block(':root, :root[data-theme="light"]');
const THEMES = {
  light,
  warm: { ...light, ...block(':root[data-theme="warm"]') },
  dark: { ...light, ...block(':root[data-theme="dark"]') },
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [text, background, minimum]. 4.5 is WCAG AA for body text; 3 for large text and UI shapes.
const PAIRS = [
  ['ink', 'bg', 4.5], ['ink', 'sheet', 4.5], ['ink', 'bg-2', 4.5],
  ['ink-2', 'bg', 4.5], ['ink-2', 'sheet', 4.5], ['ink-2', 'bg-2', 4.5],
  ['ink-3', 'bg', 4.5], ['ink-3', 'sheet', 4.5],
  ['on-inverse', 'inverse', 4.5], ['on-inverse', 'link', 4.5],
  ['on-color', 'accent', 4.5], ['on-color', 'accent-hover', 4.5], ['on-color', 'ai', 4.5],
  ['accent-ink', 'bg', 4.5], ['accent-ink', 'sheet', 4.5],
  ['link', 'bg', 4.5], ['link', 'sheet', 4.5], ['good', 'sheet', 4.5],
  ['paper-ink', 'sora', 4.5], ['paper-ink', 'matcha', 4.5], ['paper-ink', 'yamabuki', 4.5],
  ['paper-ink', 'kraft', 4.5], ['paper-ink', 'sakura', 4.5],
  ['paper-ink-2', 'sora', 4.5], ['paper-ink-2', 'yamabuki', 4.5], ['paper-ink-2', 'sakura', 4.5], ['paper-ink-2', 'kraft', 3],
  ['paper-link', 'sakura', 4.5], ['paper-link', 'yamabuki', 4.5], ['paper-red', 'sakura', 3], ['paper-back', 'paper-ink', 4.5],
  ['accent', 'bg', 3], ['accent', 'sheet', 3], ['link', 'bg-2', 3],
];
for (const [name, t] of Object.entries(THEMES)) {
  for (const [fg, bg, min] of PAIRS) {
    assert.ok(t[fg] && t[bg], `${name}: --${fg} and --${bg} are defined`);
    const c = contrast(t[fg], t[bg]);
    assert.ok(c >= min, `${name}: --${fg} on --${bg} is ${c.toFixed(2)}:1, needs ${min}:1`);
  }
  // Comfort, not just legibility: body text never at the harsh extreme of pure black on white.
  assert.ok(contrast(t.ink, t.sheet) <= 17.5, `${name}: --ink on --sheet stays below 17.5:1`);
}
// Each theme gives every role a value: a missing one would silently show the light colour.
for (const name of ['warm', 'dark']) {
  const own = block(`:root[data-theme="${name}"]`);
  for (const role of ['bg', 'bg-2', 'bg-3', 'sheet', 'ink', 'ink-2', 'ink-3', 'inverse', 'on-inverse', 'accent', 'accent-ink', 'accent-hover', 'link', 'sora', 'matcha', 'yamabuki', 'kraft', 'sakura', 'ai']) {
    assert.ok(own[role], `${name} sets --${role}`);
  }
}
// The warm paper really is warmer: less blue in every surface than the light theme.
for (const role of ['bg', 'bg-2', 'sheet']) {
  const blue = (hex) => parseInt(hex.slice(5, 7), 16);
  assert.ok(blue(THEMES.warm[role]) < blue(light[role]) - 20, `warm --${role} has clearly less blue than light`);
}

// ---------- No stray colours ----------
// Colours live in tokens.css. A line elsewhere may name one only when it is a fixed object that
// looks the same in every light (the fake spreadsheet, the wooden scroll rods), marked
// "theme-fixed" in a comment on that line, or a whole file that starts with "theme-fixed file".
// Shadows made from the --shadow token (rgb(var(--shadow) / .16)) are fine.
const styles = readdirSync(new URL('../src/styles/', import.meta.url)).filter((f) => f.endsWith('.css') && f !== 'tokens.css');
const COLOR = /#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(/;
for (const file of styles) {
  const text = read(`src/styles/${file}`);
  if (text.startsWith('/* theme-fixed file')) continue;
  const lines = text.split('\n');
  let fixedRule = false;
  lines.forEach((line, i) => {
    if (/theme-fixed/.test(line) && /\{\s*(\/\*.*)?$/.test(line)) fixedRule = true;
    const code = line.replace(/url\("data:[^"]*"\)/g, '').replace(/rgb\(var\(--[a-z-]+\) \/ [.\d]+\)/g, '');
    if (COLOR.test(code) && !fixedRule && !/theme-fixed/.test(line)) {
      assert.fail(`${file}:${i + 1} names a colour; use a token from tokens.css (or mark a fixed object theme-fixed): ${line.trim()}`);
    }
    if (/^\}/.test(line) || /\}\s*$/.test(line)) fixedRule = false;
  });
}

// ---------- The early script and the app agree on the storage key ----------
const boot = read('public/theme.js');
const config = read('src/config.js');
assert.match(boot, /'eightfold:v1:theme'/, 'theme.js reads eightfold:v1:theme');
assert.match(config, /THEME_KEY = `\$\{STORE_KEY\}:theme`/, 'config.js names the same key');
for (const page of ['index.html', 'app.html', 'privacy.html', 'terms.html', 'patch-notes.html', '404.html']) {
  const html = read(page);
  const at = html.indexOf('<script src="/theme.js"></script>');
  assert.ok(at > 0, `${page} loads theme.js`);
  assert.ok(at < html.indexOf('<link rel="stylesheet"'), `${page} sets the theme before any stylesheet`);
}

console.log('themes: all checks pass');
