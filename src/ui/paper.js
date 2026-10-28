// Paper craft in the DOM: torn edges, the crane mark, katakana pops and confetti.
import { gsap } from 'gsap';

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds a clip-path polygon whose chosen edges look hand-torn.
// edges: any of "t r b l"; amp: depth of the tear in px; step: px between teeth.
function tornPolygon(w, h, { edges = 'trbl', amp = 7, step = 14, seed = 1 }) {
  const r = rng(seed);
  const pts = [];
  const px = (x) => `${((x / w) * 100).toFixed(2)}%`;
  const py = (y) => `${((y / h) * 100).toFixed(2)}%`;
  const jag = () => r() * amp;
  const walk = (len, fn, torn) => {
    const n = torn ? Math.max(2, Math.round(len / step)) : 1;
    for (let i = 0; i < n; i++) fn(i / n, torn ? jag() : 0);
  };
  walk(w, (t, j) => pts.push(`${px(t * w)} ${py(j)}`), edges.includes('t'));
  walk(h, (t, j) => pts.push(`${px(w - j)} ${py(t * h)}`), edges.includes('r'));
  walk(w, (t, j) => pts.push(`${px(w - t * w)} ${py(h - j)}`), edges.includes('b'));
  walk(h, (t, j) => pts.push(`${px(j)} ${py(h - t * h)}`), edges.includes('l'));
  return `polygon(${pts.join(',')})`;
}

const torn = new Map();
const ro = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver((entries) => entries.forEach((e) => applyTear(e.target)))
  : null;

function applyTear(el) {
  const opts = torn.get(el);
  const { width, height } = el.getBoundingClientRect();
  if (!opts || !width || !height) return;
  el.style.clipPath = tornPolygon(width, height, opts);
}

// <div data-tear="trbl" data-amp="8" data-seed="4"> gets torn edges that follow its size.
export function tearAll(root = document) {
  root.querySelectorAll('[data-tear]').forEach((el, i) => {
    if (torn.has(el)) return;
    torn.set(el, {
      edges: el.dataset.tear || 'trbl',
      amp: Number(el.dataset.amp || 7),
      step: Number(el.dataset.step || 14),
      seed: Number(el.dataset.seed || i * 7 + 3),
    });
    applyTear(el);
    ro?.observe(el);
  });
}

// A ragged line through points, for paper hills and mountains in SVG.
export function raggedPath(points, { amp = 3, step = 10, seed = 2, close = null } = {}) {
  const r = rng(seed);
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const jitter = k === n ? 0 : (r() - 0.5) * 2 * amp;
      d += ` L${(x0 + (x1 - x0) * t).toFixed(1)} ${(y0 + (y1 - y0) * t + jitter).toFixed(1)}`;
    }
  }
  if (close) d += ` L${close[0]} ${close[1]} L${points[0][0]} ${close[1]} Z`;
  return d;
}

// Ink that reads on a given paper: sumi on light sheets, white on dark ones.
export function inkOn(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.22 ? '#1E1B18' : '#FAF9F6';
}

export const craneMark =(a = 'var(--accent)', b = 'var(--ink)') => `
<svg viewBox="0 0 64 48" aria-hidden="true" class="crane-mark">
  <path d="M22 34 L5 13 L29 31 Z" fill="${b}"/>
  <path d="M41 34 L56 9 L35 31 Z" fill="${b}"/>
  <path d="M56 9 L63 15 L55 13 Z" fill="${b}"/>
  <path d="M19 34 L32 41 L45 34 L32 29 Z" fill="${a}"/>
  <path d="M25 31 L35 1 L40 31 Z" fill="${a}"/>
  <path d="M33 31 L35 1 L40 31 Z" fill="${b}" fill-opacity=".22"/>
</svg>`;

export const kira = (color = 'var(--yamabuki)') =>
  `<svg viewBox="0 0 24 24" class="kira" aria-hidden="true"><path fill="${color}" d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z"/></svg>`;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A manga sound effect that pops where something happened: パタ (flap), ピカ (sparkle).
export function sfxPop(x, y, text = 'パタ', { size = 28, color } = {}) {
  if (reduced()) return;
  const el = document.createElement('span');
  el.className = 'sfx sfx-pop';
  el.textContent = text;
  Object.assign(el.style, {
    position: 'fixed', left: `${x}px`, top: `${y}px`, fontSize: `${size}px`,
    zIndex: 60, transformOrigin: '50% 100%', color: color || 'var(--on-color)',
  });
  document.body.appendChild(el);
  const rot = gsap.utils.random(-18, 18);
  gsap.timeline({ onComplete: () => el.remove() })
    .fromTo(el, { xPercent: -50, yPercent: -100, scale: 0.2, rotate: rot - 20, opacity: 0 },
      { scale: 1.15, rotate: rot, opacity: 1, duration: 0.22, ease: 'back.out(3)' })
    .to(el, { scale: 1, duration: 0.12 })
    .to(el, { y: -36, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.25');
}

// Paper squares tumbling down for a perfect day.
export function confetti({ count = 46, colors = ['#C8302C', '#24496B', '#8EA46B', '#E9B33F', '#A9CBD6', '#E8C3BC', '#FBF8F2'] } = {}) {
  if (reduced()) return;
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    const s = gsap.utils.random(8, 16);
    Object.assign(el.style, {
      position: 'fixed', left: `${gsap.utils.random(0, w)}px`, top: '-30px', width: `${s}px`, height: `${s * gsap.utils.random(0.7, 1.3)}px`,
      background: colors[i % colors.length], zIndex: 70, pointerEvents: 'none',
      filter: 'drop-shadow(0 2px 2px rgba(30,27,24,.2))',
    });
    document.body.appendChild(el);
    gsap.to(el, {
      y: window.innerHeight + 60,
      x: `+=${gsap.utils.random(-120, 120)}`,
      rotate: gsap.utils.random(-540, 540),
      rotateX: gsap.utils.random(180, 900),
      duration: gsap.utils.random(1.6, 2.8),
      delay: gsap.utils.random(0, 0.5),
      ease: 'power1.in',
      onComplete: () => el.remove(),
    });
  }
}
