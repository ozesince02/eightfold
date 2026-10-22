// Charts cut from paper: hills for the daily score, mountains for the year, a ring for goals.
import { raggedPath } from './paper.js';

const MOUNTAIN_PAPERS = ['#8EA46B', '#24496B', '#C9A57A', '#6E8C8A', '#E9B33F', '#E8C3BC'];

// Daily score as one torn paper hill. values: 0..1 per day (null for days not reached yet).
export function hills(values, { width = 600, height = 160, color = 'var(--matcha)', seed = 3, today = null } = {}) {
  const n = values.length;
  const step = width / (n - 1 || 1);
  const pts = [];
  values.forEach((v, i) => { if (v !== null) pts.push([i * step, height - 8 - v * (height - 24)]); });
  if (pts.length < 2) return `<svg viewBox="0 0 ${width} ${height}" class="hills" aria-hidden="true"></svg>`;
  const lastX = pts[pts.length - 1][0];
  const d = raggedPath(pts, { amp: 1.6, step: 9, seed, close: [lastX, height] });
  const marks = today !== null && values[today - 1] !== null
    ? `<circle cx="${(today - 1) * step}" cy="${height - 8 - values[today - 1] * (height - 24)}" r="5" fill="var(--sumi)"/>` : '';
  return `<svg viewBox="0 0 ${width} ${height}" class="hills" role="img" aria-label="Daily score">
    <path d="${d}" fill="${color}" style="filter:drop-shadow(0 -2px 2px rgba(30,27,24,.15))"/>${marks}</svg>`;
}

// One mountain per month, as tall as that month's success rate.
export function mountains(months, { width = 1200, height = 420, current = null, mini = false } = {}) {
  const slot = width / 12;
  const maxH = height - (mini ? 10 : 40);
  let out = '';
  months.forEach((mo, i) => {
    const cx = slot * (i + 0.5);
    const half = slot * (mini ? 0.62 : 0.78);
    if (mo.rate === null) {
      const h = maxH * 0.28;
      out += `<path class="ghost" d="M${cx - half * 0.7} ${height} L${cx} ${height - h} L${cx + half * 0.7} ${height}" />`;
      return;
    }
    const h = Math.max(10, maxH * mo.rate);
    const peak = [cx + ((i % 3) - 1) * slot * 0.08, height - h];
    const color = MOUNTAIN_PAPERS[i % MOUNTAIN_PAPERS.length];
    const d = raggedPath([[cx - half, height], [peak[0] - slot * 0.06, peak[1] + 6], peak, [peak[0] + slot * 0.05, peak[1] + 8], [cx + half, height]],
      { amp: mini ? 1 : 3, step: mini ? 6 : 14, seed: 100 + i });
    out += `<path class="mtn" data-m="${mo.m}" fill="${color}" d="${d} Z"/>`;
    // A snow cap of white paper on the months that cleared half.
    if (!mini && mo.rate >= 0.45) {
      const capH = h * 0.2;
      const t = capH / h;
      const lx = peak[0] + (cx - half - peak[0]) * t, rx = peak[0] + (cx + half - peak[0]) * t;
      const cap = raggedPath([[lx, peak[1] + capH], [peak[0], peak[1]], [rx, peak[1] + capH]], { amp: 2, step: 8, seed: 200 + i });
      out += `<path class="mtn cap" fill="#FBF8F2" d="${cap} L${(lx + rx) / 2 + 6} ${peak[1] + capH * 0.7} Z"/>`;
    }
    if (current === mo.m && !mini) {
      out += `<g transform="translate(${peak[0]} ${peak[1] - 4})"><g class="peak-flag"><path d="M0 0 V-34" stroke="var(--sumi)" stroke-width="3"/><path d="M0 -34 L26 -27 L0 -20 Z" fill="var(--shu)"/></g></g>`;
    }
  });
  return out;
}

// A paper ring: done against goal.
export function ring(fraction, { size = 120, stroke = 16, color = 'var(--shu)', track = 'rgba(30,27,24,.1)' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="ring" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c:${c}"/>
  </svg>`;
}
