import { gsap } from 'gsap';
import { store, STORE_KEY } from './lib/store.js';
import { today, monthKey, parseKey, shiftMonth, monthName, monthShort, dayLong, minutesOf, weekday, daysIn } from './lib/dates.js';
import { monthStats, yearStats, currentStreak, percent, pct, VIEWS, VIEW_LABELS, rankHabits, rateOf, summarise } from './lib/stats.js';
import { craneMark, sfxPop, confetti } from './ui/paper.js';
import { hills, mountains, ring } from './ui/charts.js';
import { daysLeftInYear } from './ui/insights.js';
import { createCraneStage } from './three/stage.js';
import { startReminders, enableReminders, disableReminders, sendTestReminder, permissionState, nextReminder } from './ui/reminders.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view');
const widget = $('.crane-widget');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAPERS = ['#C8302C', '#24496B', '#8EA46B', '#E9B33F', '#C9A57A', '#A9CBD6', '#E8C3BC', '#6E8C8A', '#B98A5E', '#D98E73', '#1E1B18'];
const NARROW = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

$$('[data-mark]').forEach((el) => { el.innerHTML = craneMark(); });

let now = today();
let ui = { swatchFor: null, pct: null };
let stage = null;
let lastProgress = -1;

// ---------- Routing: #/month/2026-10, #/year/2026, #/habits/2026-10 ----------
function route() {
  const [name = 'month', arg] = location.hash.replace(/^#\/?/, '').split('#')[0].split('/');
  const current = monthKey(now.y, now.m);
  if (name === 'year') return { name, year: Number(arg) || now.y };
  const key = /^\d{4}-\d{2}$/.test(arg || '') ? arg : current;
  return { name: name === 'habits' ? 'habits' : 'month', key };
}

// ---------- Render ----------
let queued = false;
function scheduleRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; render(); });
}

function render() {
  now = today();
  const r = route();
  if (r.key) store.ensureMonth(r.key);
  const focusKey = document.activeElement?.dataset?.focus;
  const gridScroll = $('.grid-scroll', view)?.scrollLeft || 0;
  const year = yearStats(store.get(), now.y, now);

  $$('.views a').forEach((a) => {
    const v = a.dataset.view;
    a.href = v === 'year' ? `#/year/${r.year || (r.key ? parseKey(r.key).y : now.y)}` : `#/${v}/${r.key || monthKey(now.y, now.m)}`;
    if (v === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $('[data-cranes-chip]').innerHTML = `<b>${year.cranes}</b> cranes in ${now.y}`;

  if (r.name === 'year') view.innerHTML = yearView(r.year);
  else if (r.name === 'habits') view.innerHTML = habitsView(r.key);
  else view.innerHTML = monthView(r.key, year);

  placeCrane();
  const grid = $('.grid-scroll', view);
  if (grid) grid.scrollLeft = gridScroll;
  if (focusKey) $(`[data-focus="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
}

function placeCrane() {
  const slot = $('.crane-slot', view);
  if (!slot) { widget.hidden = true; document.body.appendChild(widget); return; }
  slot.appendChild(widget);
  widget.hidden = false;
  if (!stage) stage = createCraneStage($('canvas', widget), { view: 'widget', color: '#C8302C', onCraneClick: (e) => sfxPop(e.clientX, e.clientY, 'パタパタ') });
  const p = Number(slot.dataset.progress || 0);
  if (p !== lastProgress) { stage.setProgress(p, lastProgress >= 0); lastProgress = p; }
}

// ---------- Month ----------
function monthView(key, year) {
  const { y, m } = parseKey(key);
  const state = store.get();
  const month = state.months[key];
  const s = monthStats(month, y, m, now);
  const isCurrent = s.isCurrent;
  const prev = shiftMonth(y, m, -1), next = shiftMonth(y, m, 1);
  const color = (id) => store.color(id);

  const nav = `<div class="month-nav">
      ${viewSwitch()}
      <a class="icon-btn" href="#/month/${monthKey(prev.y, prev.m)}" aria-label="${monthName(prev.m)} ${prev.y}">${icon.prev}</a>
      ${isCurrent ? '' : `<a class="icon-btn" href="#/month/${monthKey(now.y, now.m)}">This month</a>`}
      <a class="icon-btn" href="#/month/${monthKey(next.y, next.m)}" aria-label="${monthName(next.m)} ${next.y}">${icon.next}</a>
    </div>`;

  if (!s.habits.length) {
    return `<div class="title-row"><h1>${monthName(m)} ${y}</h1><p class="finding">No habits in this month yet.</p>${nav}</div>
      <section class="panel empty-state"><h2>An empty sheet of paper</h2><p>Add the habits you want to fold this month.</p><a class="btn" href="#/habits/${key}">Add habits</a></section>`;
  }

  const v = pctView();
  const lead = rankHabits(s.habits, v)[0];
  const best = [...s.habits].sort((a, b) => b.longest - a.longest)[0];
  const monthWords = { days: `${percent(s.total.daysPct)} of the days${isCurrent ? ' so far' : ''}`, goal: `${percent(s.total.goalPct)} of this month's goals` };
  const leadWords = { days: `${percent(lead.daysPct)} of its days`, goal: `${percent(lead.goalPct)} of its goal` };
  const say = (words) => (v === 'both' ? `${words.days} and ${words.goal}` : words[v]);
  const finding = s.total.done === 0
    ? `Nothing folded yet in ${monthName(m)}. The month starts with ${s.habits.length} habits from last month.`
    : `<strong>${s.total.done} folds</strong>: ${say(monthWords)}. ${esc(lead.name)} leads at ${say(leadWords)}; ${esc(best.name)} had the longest run, ${best.longest} days.`;

  const blocks = [];
  blocks.push(isCurrent ? todayPanel(key, s, color) : summaryPanel(s, color));
  blocks.push(cranePanel(s, year));
  blocks.push(figuresPanel(s));
  blocks.push(gridPanel(key, s, color));
  blocks.push(dailyPanel(s));
  blocks.push(weeklyPanel(s));
  const timed = s.habits.filter((h) => h.time);
  blocks.push(rankedPanel(s, color, timed.length ? 'span-6' : 'span-12'));
  if (timed.length) blocks.push(dayPanel(key, s, color));

  return `<div class="title-row"><h1>${monthName(m)} ${y}</h1><p class="finding">${finding}</p>${nav}</div>
    <div class="board">${blocks.join('')}</div>`;
}

function todayPanel(key, s, color) {
  const d = now.d;
  const habits = s.habits.filter((h) => h.cells[d - 1] !== null).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const done = habits.filter((h) => h.cells[d - 1]).length;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const next = habits.find((h) => !h.cells[d - 1] && h.time && minutesOf(h.time) >= nowMin);
  const state = store.get();
  const rows = habits.map((h) => {
    const on = h.cells[d - 1];
    const streak = currentStreak(state, h.id, now);
    return `<li><button class="tag${h === next ? ' is-next' : ''}" type="button" aria-pressed="${on}" data-toggle="${h.id}:${d}" data-focus="tag:${h.id}" style="--c:${color(h.id)}">
      <span class="tag-box" aria-hidden="true"></span>
      <span class="tag-time">${h.time || '—'}</span>
      <span class="tag-name">${esc(h.name)}</span>
      <span class="tag-streak">${streak ? `${streak}-day run` : h === next ? 'next' : ''}</span>
    </button></li>`;
  }).join('');
  const foot = done === habits.length ? 'Every habit folded today. A whole crane.'
    : next ? `Next up: ${esc(next.name)} at ${next.time}.` : `${habits.length - done} still open today.`;
  const rem = store.reminders();
  const nudge = nextReminder(state, new Date());
  const remLine = !rem.enabled
    ? `<a href="#/habits/${key}#reminders">Turn on reminders</a>`
    : nudge ? `Next nudge at ${clock(nudge.at)} for ${esc(nudge.habit.name)}.` : 'No more nudges today.';
  return `<section class="panel span-5" aria-labelledby="today-h">
    <div class="panel-head"><h2 id="today-h">${dayLong(now.y, now.m, d)} ${d} ${monthName(now.m)}</h2><p>${done} of ${habits.length} done</p></div>
    <ul class="today-list">${rows}</ul>
    <p class="today-foot">${foot} ${remLine}</p>
  </section>`;
}

// ---------- Percentages: days so far, goal, or both side by side ----------
// ui.pct is what the screen shows now; the saved default is where it starts.
const pctView = () => ui.pct || store.prefs().percentView;
const shown = (v) => (v === 'both' ? ['days', 'goal'] : [v]);
const figure = (h, which) => (which === 'days'
  ? { value: h.daysPct, has: h.daysSoFar > 0, words: `${h.doneSoFar} of ${h.daysSoFar} day${h.daysSoFar === 1 ? '' : 's'}`, label: 'Days' }
  : { value: h.goalPct, has: h.goal > 0, words: `${h.done} of ${h.goal} goal days`, label: 'Goal' });
const pctText = (f) => (f.has ? percent(f.value) : '—');

function viewSwitch() {
  const cur = pctView();
  const def = store.prefs().percentView;
  return `<div class="pct-switch">
    <div class="seg" role="group" aria-label="Show percentages against" title="Days: ticks against the days so far. Goal: ticks against each habit's monthly goal.">
      ${VIEWS.map((v) => `<button type="button" data-pct-view="${v}" aria-pressed="${v === cur}">${VIEW_LABELS[v]}</button>`).join('')}
    </div>
    ${cur === def ? '' : '<button class="seg-link" type="button" data-pct-default>Make default</button>'}
  </div>`;
}

function summaryPanel(s, color) {
  const bestWeek = s.weeks.reduce((a, b) => (b.pct > a.pct ? b : a), s.weeks[0]);
  const ranked = rankHabits(s.habits, pctView());
  const top = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const lead = shown(pctView())[0];
  return `<section class="panel span-5" aria-labelledby="sum-h">
    <div class="panel-head"><h2 id="sum-h">${monthName(s.m)} in short</h2><p>${s.days} days</p></div>
    <ul class="dayline">
      <li style="--c:${color(top.id)}"><time>Top</time><i></i><span>${esc(top.name)}</span><em>${figure(top, lead).words}</em></li>
      <li style="--c:${color(weakest.id)}"><time>Low</time><i></i><span>${esc(weakest.name)}</span><em>${figure(weakest, lead).words}</em></li>
      <li style="--c:var(--ai)"><time>Week</time><i></i><span>Week ${bestWeek.index} was the best</span><em>${bestWeek.done}/${bestWeek.possible}</em></li>
      <li style="--c:var(--shu)"><time>Days</time><i></i><span>Perfect days</span><em>${s.perfectDays}</em></li>
    </ul>
  </section>`;
}

function cranePanel(s, year) {
  const state = store.get();
  const todayMonth = state.months[monthKey(now.y, now.m)];
  const ts = todayMonth ? monthStats(todayMonth, now.y, now.m, now) : null;
  const day = ts?.perDay[now.d - 1];
  const progress = day && day.goal ? day.done / day.goal : 0;
  const remaining = Math.max(0, 1000 - year.cranes);
  const perDay = Math.ceil(remaining / daysLeftInYear(now));
  const wish = state.wish
    ? `Wish: “${esc(state.wish)}”`
    : `<a href="#/habits/${monthKey(now.y, now.m)}#wish">Write the wish for crane 1,000</a>`;
  return `<section class="panel crane-panel span-4" aria-labelledby="crane-h">
    <div class="panel-head"><h2 id="crane-h">Today's crane</h2><p>${day ? `${day.done} of ${day.goal} folds` : ''}</p></div>
    <div class="crane-slot" data-progress="${progress.toFixed(4)}"></div>
    <p class="crane-count">${year.cranes}<small>of 1,000 cranes</small></p>
    <div class="wish-meter" aria-hidden="true"><span style="width:${Math.min(100, year.cranes / 10)}%"></span></div>
    <p class="wish-line">${remaining ? `${remaining} to go: about ${perDay} a day until 31 December. ` : 'A thousand cranes. '}${wish}</p>
  </section>`;
}

function figuresPanel(s) {
  const t = s.total;
  const days = { value: t.daysPct, text: `of days${s.isCurrent ? ' so far' : ''}: ${t.doneSoFar} of ${t.daysSoFar}` };
  const goal = { value: t.goalPct, text: `of goals: ${t.goalMet} of ${t.target} goal days` };
  const [first, second] = pctView() === 'goal' ? [goal, days] : [days, goal];
  return `<section class="panel span-3" aria-labelledby="fig-h">
    <div class="panel-head"><h2 id="fig-h">This month</h2></div>
    <div class="figures">
      <div class="figure-ring">${ring(first.value, { size: 96, stroke: 14 })}
        <div><p class="big">${percent(first.value)}</p><p class="label">${first.text}</p></div></div>
      <div><p class="big">${percent(second.value)}</p><p class="label">${second.text}</p></div>
      <div><p class="big">${s.perfectDays}</p><p class="label">perfect day${s.perfectDays === 1 ? '' : 's'}, every habit done</p></div>
      ${liveRun(s)}
    </div>
  </section>`;
}

function liveRun(s) {
  if (!s.isCurrent) return `<div><p class="big">${s.weeks.reduce((a, w) => Math.max(a, w.done), 0)}</p><p class="label">ticks in the best week</p></div>`;
  const r = s.habits.map((h) => ({ h, n: currentStreak(store.get(), h.id, now) })).sort((a, b) => b.n - a.n)[0];
  return `<div><p class="big">${r.n}<small> days</small></p><p class="label">longest run going: ${esc(r.h.name)}</p></div>`;
}

function gridPanel(key, s, color) {
  const { y, m } = s;
  const state = store.get();
  const todayCol = s.isCurrent ? now.d : 0;
  const days = Array.from({ length: s.days }, (_, i) => i + 1);
  const isWeekend = (d) => [0, 6].includes(weekday(y, m, d));
  // Summary columns change with the view, so every number says what it counts.
  const leftCell = (h) => (h.left < 0 ? `<td class="sum neg" title="${-h.left} over the goal">+${-h.left}</td>` : `<td class="sum">${h.left}</td>`);
  const pctCell = (h, which) => { const f = figure(h, which); return `<td class="sum" title="${f.words}">${pctText(f)}</td>`; };
  const cols = {
    days: [
      ['Done', 'Days ticked', (h) => `<td class="sum">${h.done}</td>`],
      ['Days', 'Days so far (today counts once it is ticked)', (h) => `<td class="sum">${h.daysSoFar}</td>`],
      ['% days', 'Ticks against the days so far', (h) => pctCell(h, 'days')],
    ],
    goal: [
      ['Done', 'Days ticked', (h) => `<td class="sum">${h.done}</td>`],
      ['Goal', 'Monthly goal in days', (h) => `<td class="sum">${h.goal}</td>`],
      ['Left', 'Days left to reach the goal', leftCell],
      ['% goal', 'Ticks against the goal', (h) => pctCell(h, 'goal')],
    ],
    both: [
      ['Done', 'Days ticked', (h) => `<td class="sum">${h.done}</td>`],
      ['% days', 'Ticks against the days so far', (h) => pctCell(h, 'days')],
      ['Goal', 'Monthly goal in days', (h) => `<td class="sum">${h.goal}</td>`],
      ['% goal', 'Ticks against the goal', (h) => pctCell(h, 'goal')],
    ],
  }[pctView()];
  const streakCols = [['Run', 'Current streak'], ['Best', 'Longest streak this month']];
  const nSum = cols.length + streakCols.length;
  const head1 = `<tr class="week-row"><th></th>${s.weeks.map((w) => `<th class="wk" colspan="${w.to - w.from + 1}">Week ${w.index}</th>`).join('')}<th colspan="${nSum}"></th></tr>`;
  const head2 = `<tr><th></th>${days.map((d) => `<th class="${isWeekend(d) ? 'weekend' : ''}" aria-hidden="true">${NARROW.format(new Date(y, m - 1, d))}</th>`).join('')}
    ${[...cols, ...streakCols].map(([head, title]) => `<th scope="col" title="${title}">${head}</th>`).join('')}</tr>`;
  const head3 = `<tr><th></th>${days.map((d) => `<th scope="col" class="${d === todayCol ? 'is-today' : ''}${isWeekend(d) ? ' weekend' : ''}">${d}</th>`).join('')}<th colspan="${nSum}"></th></tr>`;

  const rows = s.habits.map((h) => {
    const streak = s.isCurrent ? currentStreak(state, h.id, now) : null;
    const cells = h.cells.map((c, i) => {
      const d = i + 1;
      const label = `${h.name}, ${d} ${monthShort(m)}`;
      if (c === null) return `<td><span class="cell na" title="Not tracked yet on this day"></span></td>`;
      const future = s.isCurrent ? d > now.d : s.lastDay === 0;
      return `<td class="${d === todayCol ? 'is-today' : ''}"><button class="cell${future ? ' future' : ''}" type="button" aria-pressed="${c}" aria-label="${esc(label)}" data-toggle="${h.id}:${d}" data-focus="cell:${h.id}:${d}" data-r="${h.id}" data-d="${d}"></button></td>`;
    }).join('');
    return `<tr style="--c:${color(h.id)}">
      <th class="h-name" scope="row"><div class="h-name-inner"><i></i><b title="${esc(h.name)}">${esc(h.name)}</b><small>${h.time ? `${h.time} · ` : ''}goal ${h.goal}</small></div></th>
      ${cells}${cols.map(([, , cell]) => cell(h)).join('')}
      <td class="sum${streak === null ? ' muted' : ''}">${streak === null ? '—' : streak}</td><td class="sum">${h.longest}</td></tr>`;
  }).join('');

  const doneRow = `<tr><th scope="row">Done</th>${s.perDay.map((d) => `<td>${d.past || d.done ? d.done : ''}</td>`).join('')}<td colspan="${nSum}"></td></tr>`;
  const barRow = `<tr><th scope="row">Score</th>${s.perDay.map((d) => `<td><div class="day-bar${d.goal && d.done === d.goal ? ' perfect' : ''}" title="${d.done} of ${d.goal}"><span style="height:${Math.round(d.pct * 100)}%"></span></div></td>`).join('')}<td colspan="${nSum}"></td></tr>`;

  return `<section class="panel grid-panel span-12" aria-labelledby="grid-h">
    <div class="panel-head"><h2 id="grid-h">The month</h2><p>Tap a square to tick it. Arrow keys move around.</p></div>
    <div class="grid-scroll">
      <table class="habit-grid" data-grid>
        <colgroup><col class="c-name">${days.map(() => '<col class="c-day">').join('')}${'<col class="c-sum">'.repeat(nSum)}</colgroup>
        <thead>${head1}${head2}${head3}</thead>
        <tbody>${rows}</tbody>
        <tfoot>${doneRow}${barRow}</tfoot>
      </table>
    </div>
    <div class="grid-legend"><span><i style="background:var(--ai)"></i>Day's score</span><span><i style="background:var(--shu)"></i>Perfect day</span><span><i style="outline:1px solid var(--washi-3);outline-offset:-1px"></i>Still to come</span><span>% days counts today once it's ticked</span>${pctView() === 'days' ? '' : '<span>Left shows +n once a goal is passed</span>'}</div>
  </section>`;
}

function dailyPanel(s) {
  const values = s.perDay.map((d) => (d.past ? d.pct : null));
  const past = s.perDay.filter((d) => d.past);
  const avg = pct(past.reduce((a, d) => a + d.pct, 0), past.length);
  const ticks = [1, 5, 10, 15, 20, 25, s.days];
  return `<section class="panel span-8" aria-labelledby="daily-h">
    <div class="panel-head"><h2 id="daily-h">Daily score</h2><p>${past.length ? `Average ${percent(avg)} over ${past.length} day${past.length === 1 ? '' : 's'}` : 'No days yet'}</p></div>
    <div class="hills-wrap">${hills(values, { width: 820, height: 190, color: 'var(--matcha)', today: s.isCurrent ? now.d : null })}</div>
    <div class="axis" aria-hidden="true">${ticks.map((t) => `<span>${t}</span>`).join('')}</div>
  </section>`;
}

function weeklyPanel(s) {
  return `<section class="panel span-4" aria-labelledby="weekly-h">
    <div class="panel-head"><h2 id="weekly-h">Weeks</h2><p>From the 1st</p></div>
    <div class="weeks">${s.weeks.map((w) => `<div class="week"><span>Week ${w.index}<small>${w.from}–${w.to} ${monthShort(s.m)}</small></span>
      <div class="week-track"><div class="week-fill" style="width:${w.pct * 100}%"></div></div><b>${w.done}/${w.possible}<small>${percent(w.pct)}</small></b></div>`).join('')}</div>
  </section>`;
}

function rankedPanel(s, color, span) {
  const v = pctView();
  const which = shown(v);
  const note = { days: 'Ticks against the days so far', goal: 'Ticks against each goal', both: 'Days so far and goal, side by side' }[v];
  const bar = (h, w) => {
    const f = figure(h, w);
    return `<div class="rank-row${which.length > 1 ? ' two' : ''}" title="${f.words}">${which.length > 1 ? `<span>${f.label}</span>` : ''}
      <div class="rank-bar"><i style="width:${Math.min(100, f.value * 100)}%"></i></div><b>${pctText(f)}</b></div>`;
  };
  return `<section class="panel ${span}" aria-labelledby="rank-h">
    <div class="panel-head"><h2 id="rank-h">Top habits</h2><p>${note}</p></div>
    <ol class="ranked">${rankHabits(s.habits, v).slice(0, 10).map((h) => `<li style="--c:${color(h.id)}"><span class="rank-name">${esc(h.name)}</span>${which.map((w) => bar(h, w)).join('')}</li>`).join('')}</ol>
  </section>`;
}

function dayPanel(key, s, color) {
  const d = s.isCurrent ? now.d : null;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const list = s.habits.filter((h) => h.time).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const next = d ? list.find((h) => !h.cells[d - 1] && minutesOf(h.time) >= nowMin) : null;
  return `<section class="panel span-6" aria-labelledby="day-h">
    <div class="panel-head"><h2 id="day-h">Your day, in order</h2><p>${next ? `Next: ${next.time}` : d ? 'Nothing else timed today' : 'The usual times'}</p></div>
    <ol class="dayline">${list.map((h) => `<li class="${d && h.cells[d - 1] ? 'done' : ''}${h === next ? ' next' : ''}" style="--c:${color(h.id)}"><time>${h.time}</time><i></i><span>${esc(h.name)}</span>${h === next ? '<em>next</em>' : ''}</li>`).join('')}</ol>
  </section>`;
}

// ---------- Year ----------
function yearView(y) {
  const state = store.get();
  const ys = yearStats(state, y, now);
  const v = pctView();
  const lead = shown(v)[0];
  const sum = summarise(ys.months, lead);
  const perfect = ys.months.reduce((a, x) => a + (x.perfectDays || 0), 0);
  const of = { days: 'of days', goal: 'of goals' };
  const rateText = (x) => (v === 'both'
    ? `${x.daysRate === null ? '—' : percent(x.daysRate)} · ${x.goalRate === null ? '—' : percent(x.goalRate)}`
    : rateOf(x, v) === null ? '—' : percent(rateOf(x, v)));
  const finding = sum.best
    ? `<strong>${ys.cranes} cranes</strong> folded in ${y}. ${monthName(sum.best.m)} was the best month at ${percent(sum.bestRate)} ${of[lead]}; the average is ${percent(sum.average)}.`
    : `Nothing folded in ${y}.`;
  const cards = ys.months.map((x) => {
    const key = monthKey(y, x.m);
    const month = state.months[key];
    if (!month || !month.habits.length) {
      return `<a class="month-card empty" href="#/month/${key}"><h3>${monthName(x.m)}<span>—</span></h3><p>Not started</p></a>`;
    }
    const s = monthStats(month, y, x.m, now);
    const heat = s.habits.map((h) => h.cells.map((c) => `<i class="${c ? 'on' : ''}" style="--c:${store.color(h.id)}"></i>`).join('')).join('');
    return `<a class="month-card" href="#/month/${key}"><h3>${monthName(x.m)}<span title="${v === 'both' ? 'Days · goal' : of[lead]}">${rateText(x)}</span></h3>
      <div class="heat" style="grid-template-columns:repeat(${s.days},minmax(0,1fr))" aria-hidden="true">${heat}</div>
      <p>${s.total.done} of ${s.total.possible} ticks · ${s.perfectDays} perfect day${s.perfectDays === 1 ? '' : 's'}</p></a>`;
  }).join('');
  const heights = ys.months.map((x) => ({ ...x, rate: rateOf(x, lead) }));
  const label = (x) => {
    const r = rateOf(x, lead);
    const main = r === null ? '—' : `${Math.round(r * 100)}<span class="pct">%</span>`;
    const extra = v === 'both' && x.goalRate !== null ? `<small>goal ${Math.round(x.goalRate * 100)}%</small>` : '';
    return `<li class="${r === null ? 'muted' : ''}"><span class="long">${monthShort(x.m)}</span><span class="short">${monthShort(x.m)[0]}</span><b>${main}</b>${extra}</li>`;
  };
  const rangeNote = { days: 'Ticks against the days in each month (so far, for this one)', goal: 'Ticks against each month\'s goals', both: 'Mountains show days; the goal figure sits under each month' }[v];
  return `<div class="title-row"><h1>${y}</h1><p class="finding">${finding}</p>
      <div class="month-nav">${viewSwitch()}<a class="icon-btn" href="#/year/${y - 1}" aria-label="${y - 1}">${icon.prev}</a><a class="icon-btn" href="#/year/${y + 1}" aria-label="${y + 1}">${icon.next}</a></div></div>
    <div class="board">
      <section class="panel span-12" aria-labelledby="range-h">
        <div class="panel-head"><h2 id="range-h">Success rate by month</h2><p>${rangeNote}</p></div>
        <div class="year-range"><div class="year-sun" aria-hidden="true"></div><svg viewBox="0 0 1200 380" preserveAspectRatio="none" role="img" aria-label="Monthly success rates as mountains">${mountains(heights, { width: 1200, height: 380, current: y === now.y ? now.m : null })}</svg></div>
        <ol class="range-labels">${ys.months.map(label).join('')}</ol>
      </section>
      <section class="panel span-3"><p class="big">${ys.cranes}</p><p class="label">cranes folded</p></section>
      <section class="panel span-3"><p class="big">${percent(sum.average)}</p><p class="label">average month, ${of[lead]}</p></section>
      <section class="panel span-3"><p class="big">${sum.best ? monthShort(sum.best.m) : '—'}</p><p class="label">best month${sum.best ? `, ${percent(sum.bestRate)} ${of[lead]}` : ''}</p></section>
      <section class="panel span-3"><p class="big">${perfect}</p><p class="label">perfect days</p></section>
      <div class="span-12"><h2 class="visually-hidden">Months</h2><div class="months">${cards}</div></div>
    </div>`;
}

// ---------- Habits editor ----------
function habitsView(key) {
  const { y, m } = parseKey(key);
  const state = store.get();
  const month = state.months[key];
  const prev = shiftMonth(y, m, -1), next = shiftMonth(y, m, 1);
  const days = daysIn(y, m);
  const rows = month.habits.map((h, i) => {
    const c = store.color(h.id);
    return `<div class="edit-row" style="--c:${c}">
      <button class="swatch-btn" type="button" data-swatch="${h.id}" aria-label="Colour for ${esc(h.name)}" aria-expanded="${ui.swatchFor === h.id}"></button>
      <label class="wide">Habit<input data-edit="${h.id}" data-field="name" value="${esc(h.name)}" required></label>
      <label class="third">Time<input data-edit="${h.id}" data-field="time" type="time" value="${esc(h.time || '')}"></label>
      <label class="third">Goal (days)<input data-edit="${h.id}" data-field="goal" type="number" min="0" max="${days}" value="${h.goal}"></label>
      <label class="third">From day<input data-edit="${h.id}" data-field="start" type="number" min="1" max="${days}" value="${h.start || 1}"></label>
      <div class="row-actions">
        <button class="icon-btn" type="button" data-move="${h.id}:-1" aria-label="Move ${esc(h.name)} up" ${i === 0 ? 'disabled' : ''}>${icon.up}</button>
        <button class="icon-btn" type="button" data-move="${h.id}:1" aria-label="Move ${esc(h.name)} down" ${i === month.habits.length - 1 ? 'disabled' : ''}>${icon.down}</button>
        <button class="icon-btn danger" type="button" data-remove="${h.id}">Remove</button>
      </div>
      ${ui.swatchFor === h.id ? `<div class="swatches" role="group" aria-label="Paper colours">${PAPERS.map((p) => `<button type="button" style="--c:${p}" data-color="${h.id}:${p}" aria-pressed="${p.toLowerCase() === c.toLowerCase()}" aria-label="${p}"></button>`).join('')}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="title-row"><h1>Habits for ${monthName(m)}</h1>
      <p class="finding">Changes apply to ${monthName(m)} ${y}. A new month starts with the habits of the month before, so set it up once.</p>
      <div class="month-nav"><a class="icon-btn" href="#/habits/${monthKey(prev.y, prev.m)}" aria-label="${monthName(prev.m)}">${icon.prev}</a><a class="icon-btn" href="#/month/${key}">Back to the month</a><a class="icon-btn" href="#/habits/${monthKey(next.y, next.m)}" aria-label="${monthName(next.m)}">${icon.next}</a></div></div>
    <div class="board">
      <section class="span-8" aria-labelledby="list-h">
        <h2 id="list-h" class="visually-hidden">This month's habits</h2>
        <div class="editor">${rows || '<p class="note">No habits yet. Add the first one below.</p>'}</div>
        <form class="panel panel--washi add-form" data-add style="margin-top:24px">
          <label>New habit<input name="name" required placeholder="Stretch for ten minutes"></label>
          <label>Time<input name="time" type="time"></label>
          <label>Goal (days)<input name="goal" type="number" min="0" max="${days}" value="20"></label>
          <label>From day<input name="start" type="number" min="1" max="${days}" value="${key === monthKey(now.y, now.m) ? now.d : 1}"></label>
          <button class="btn" type="submit">Add habit</button>
        </form>
      </section>
      <div class="span-4 side-stack">
        ${percentagesPanel()}
        ${remindersPanel(month)}
        <section class="panel" id="wish" aria-labelledby="wish-h">
          <div class="panel-head"><h2 id="wish-h">The wish</h2></div>
          <form class="wish-form" data-wish>
            <label class="note" for="wish-text">What will crane 1,000 be for? Only you see this.</label>
            <textarea id="wish-text" name="wish" maxlength="200">${esc(state.wish || '')}</textarea>
            <button class="btn btn--ink" type="submit">Keep the wish</button>
          </form>
        </section>
        <section class="panel" aria-labelledby="backup-h">
          <div class="panel-head"><h2 id="backup-h">Backup</h2></div>
          <p class="note">Everything lives in this browser. Save a copy now and then, or move it to another device.</p>
          <div class="backup-actions" style="margin-top:14px">
            <button class="btn btn--quiet" type="button" data-export>Save a backup</button>
            <label class="btn btn--quiet" for="import-file">Load a backup</label>
            <input id="import-file" type="file" accept="application/json,.json" class="visually-hidden" data-import>
            <button class="btn danger" type="button" data-reset>Reset to the sheet</button>
          </div>
        </section>
      </div>
    </div>`;
}

const clock = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

function percentagesPanel() {
  const def = store.prefs().percentView;
  const options = [
    ['days', 'Days', 'Ticks against the days so far. 13 gym days in a 30-day month is 43%.'],
    ['goal', 'Goal', 'Ticks against each habit\'s goal. 13 of a 20-day goal is 65%.'],
    ['both', 'Both', 'The two side by side, days first.'],
  ];
  return `<section class="panel" id="percentages" aria-labelledby="pct-h">
    <div class="panel-head"><h2 id="pct-h">Percentages</h2></div>
    <fieldset class="choice"><legend class="note">Which view the tracker opens with. You can switch on the Month and Year pages at any time.</legend>
      ${options.map(([v, l, d]) => `<label><input type="radio" name="default-view" value="${v}" ${def === v ? 'checked' : ''}><i></i><span><b>${l}</b>${d}</span></label>`).join('')}
    </fieldset>
  </section>`;
}

function remindersPanel(month) {
  const rem = store.reminders();
  const perm = permissionState();
  const timed = month.habits.filter((h) => h.time).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const untimed = month.habits.length - timed.length;
  const status = !rem.enabled ? 'Off. Turn them on to get a nudge at each habit\'s time.'
    : perm === 'granted' ? 'On. Nudges arrive as notifications, and as a note on this page when it\'s open in front.'
      : perm === 'denied' ? 'On, but notifications are blocked for this site in the browser\'s settings. Nudges show as a note on this page instead.'
        : perm === 'unsupported' ? 'On. This browser can\'t show notifications, so nudges show as a note on this page.'
          : 'On. Allow notifications when the browser asks, or nudges only show on this page.';
  const leads = [[0, 'At the habit\'s time'], [5, '5 minutes before'], [10, '10 minutes before'], [15, '15 minutes before'], [30, '30 minutes before']];
  return `<section class="panel" id="reminders" aria-labelledby="rem-h">
    <div class="panel-head"><h2 id="rem-h">Reminders</h2><p>${rem.enabled ? 'On' : 'Off'}</p></div>
    <p class="note">${status}</p>
    <div class="backup-actions" style="margin-top:14px">
      ${rem.enabled
        ? `<button class="btn btn--quiet" type="button" data-rem="off">Turn off</button>${perm === 'default' ? '<button class="btn" type="button" data-rem="on">Allow notifications</button>' : ''}`
        : '<button class="btn" type="button" data-rem="on">Turn on reminders</button>'}
      <button class="btn btn--quiet" type="button" data-rem="test" ${timed.length ? '' : 'disabled'}>Send a test</button>
    </div>
    <label class="rem-lead">When<select data-rem-lead>${leads.map(([v, l]) => `<option value="${v}" ${rem.lead === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <fieldset class="rem-list"><legend>Nudge me for</legend>
      ${timed.map((h) => `<label style="--c:${store.color(h.id)}"><input type="checkbox" data-rem-habit="${h.id}" ${rem.off[h.id] ? '' : 'checked'}><i></i><time>${h.time}</time><span>${esc(h.name)}</span></label>`).join('') || '<p class="note">No habit has a time yet.</p>'}
    </fieldset>
    <p class="note">${untimed ? `${untimed} habit${untimed === 1 ? ' has' : 's have'} no time, so ${untimed === 1 ? 'it gets' : 'they get'} no nudge. ` : ''}Browsers only send nudges while an Eightfold tab is open; it can sit in the background. A missed nudge still arrives for two hours after its time.</p>
  </section>`;
}

// ---------- Interaction ----------
let toastTimer;
function toast(text) {
  const el = $('[data-toast]');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function toggle(btn) {
  const [id, dayStr] = btn.dataset.toggle.split(':');
  const day = Number(dayStr);
  const key = route().key;
  const on = store.toggle(key, id, day);
  const rect = btn.getBoundingClientRect();
  if (on) {
    const { y, m } = parseKey(key);
    const s = monthStats(store.get().months[key], y, m, now);
    const d = s.perDay[day - 1];
    if (d.goal && d.done === d.goal) {
      confetti();
      sfxPop(rect.right, rect.top, 'パーフェクト!', { size: 30 });
      toast(`Perfect day: all ${d.goal} habits on ${day} ${monthName(m)}.`);
    } else {
      sfxPop(rect.left + rect.width / 2, rect.top, 'パタ', { size: btn.classList.contains('cell') ? 18 : 24 });
    }
  }
  requestAnimationFrame(() => {
    const again = $(`[data-toggle="${CSS.escape(btn.dataset.toggle)}"]${btn.classList.contains('cell') ? '.cell' : '.tag'}`);
    const box = again?.classList.contains('tag') ? $('.tag-box', again) : again;
    if (box && !reduced) gsap.fromTo(box, { rotateY: on ? -180 : 0, scale: on ? 0.7 : 1 }, { rotateY: 0, scale: 1, duration: 0.45, ease: 'back.out(2)' });
  });
}

view.addEventListener('click', (e) => {
  const t = e.target.closest('[data-toggle]');
  if (t) return toggle(t);
  const sw = e.target.closest('[data-swatch]');
  if (sw) { ui.swatchFor = ui.swatchFor === sw.dataset.swatch ? null : sw.dataset.swatch; return render(); }
  const col = e.target.closest('[data-color]');
  if (col) { const [id, c] = col.dataset.color.split(':'); ui.swatchFor = null; return store.setColor(id, c); }
  const mv = e.target.closest('[data-move]');
  if (mv) { const [id, dir] = mv.dataset.move.split(':'); return store.moveHabit(route().key, id, Number(dir)); }
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    const key = route().key;
    const h = store.month(key).habits.find((x) => x.id === rm.dataset.remove);
    if (h && window.confirm(`Remove “${h.name}” from ${monthName(parseKey(key).m)}? Its ticks for this month go with it.`)) {
      store.removeHabit(key, h.id);
      toast(`Removed ${h.name}.`);
    }
    return;
  }
  if (e.target.closest('[data-export]')) {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `eightfold-backup-${monthKey(now.y, now.m)}-${String(now.d).padStart(2, '0')}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return toast('Backup saved.');
  }
  const pv = e.target.closest('[data-pct-view]');
  if (pv) { ui.pct = pv.dataset.pctView; return render(); }
  if (e.target.closest('[data-pct-default]')) {
    store.setPref('percentView', pctView());
    ui.pct = null;
    return toast(`${VIEW_LABELS[pctView()]} is now your default view.`);
  }
  const rem = e.target.closest('[data-rem]');
  if (rem) {
    const act = rem.dataset.rem;
    if (act === 'on') {
      enableReminders().then((perm) => toast(perm === 'granted' ? 'Reminders on. Your habits will nudge you.' : 'Reminders on. They\'ll show on this page.'));
    } else if (act === 'off') {
      disableReminders();
      toast('Reminders off.');
    } else if (act === 'test' && !sendTestReminder()) {
      toast('Give a habit a time first.');
    }
    return;
  }
  if (e.target.closest('[data-reset]')) {
    if (window.confirm('Replace everything with the data from the Google Sheet? Ticks you made here will be lost unless you saved a backup.')) {
      store.resetToSheet();
      toast('Back to the sheet, as of 22 October.');
    }
  }
});

view.addEventListener('change', (e) => {
  const input = e.target.closest('[data-edit]');
  if (input) {
    if (input.dataset.field === 'name' && !input.value.trim()) { input.value = input.defaultValue; return; }
    store.updateHabit(route().key, input.dataset.edit, { [input.dataset.field]: input.value.trim() });
    return;
  }
  if (e.target.matches('[name="default-view"]')) {
    ui.pct = null;
    store.setPref('percentView', e.target.value);
    return toast(`${VIEW_LABELS[e.target.value]} is now your default view.`);
  }
  if (e.target.matches('[data-rem-lead]')) return store.setReminders({ lead: Number(e.target.value) });
  if (e.target.matches('[data-rem-habit]')) return store.setHabitReminder(e.target.dataset.remHabit, e.target.checked);
  const file = e.target.closest('[data-import]');
  if (file?.files?.[0]) {
    file.files[0].text().then((text) => {
      try { store.importJSON(text); toast('Backup loaded.'); } catch (err) { toast(err.message || 'That file could not be read.'); }
    });
  }
});

view.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.matches('[data-add]')) {
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim()) return;
    store.addHabit(route().key, { name: data.name.trim(), time: data.time, goal: data.goal, start: data.start });
    toast(`Added ${data.name.trim()}.`);
    requestAnimationFrame(() => $('[data-add] input[name="name"]')?.focus());
  }
  if (form.matches('[data-wish]')) {
    store.setWish(new FormData(form).get('wish').trim());
    toast('Wish kept. 1,000 cranes to make it count.');
  }
});

// Arrow keys move around the grid like a spreadsheet.
view.addEventListener('keydown', (e) => {
  const cell = e.target.closest('.cell[data-r]');
  if (!cell || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const rows = [...new Set($$('.cell[data-r]', view).map((c) => c.dataset.r))];
  let r = rows.indexOf(cell.dataset.r);
  let d = Number(cell.dataset.d);
  if (e.key === 'ArrowLeft') d--; if (e.key === 'ArrowRight') d++;
  if (e.key === 'ArrowUp') r--; if (e.key === 'ArrowDown') r++;
  const target = $(`.cell[data-r="${rows[r]}"][data-d="${d}"]`, view);
  target?.focus();
});

store.subscribe(scheduleRender);
// "#/habits/2026-10#reminders" opens the view and scrolls to that panel.
function scrollToAnchor() {
  const anchor = location.hash.split('#')[2];
  const el = anchor && document.getElementById(anchor);
  if (el) el.scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', () => { ui.swatchFor = null; render(); view.focus({ preventScroll: true }); scrollToAnchor(); });
// Another tab (or a reminder fired there) changed the data: take its copy.
window.addEventListener('storage', (e) => { if (e.key === STORE_KEY) store.reloadFromStorage(); });
// A new day, or the next nudge time, while the tab is open.
let nudgeSig = '';
setInterval(() => {
  const n = nextReminder(store.get(), new Date());
  const sig = n ? `${n.habit.id}@${n.at}` : '';
  if (today().d !== now.d || sig !== nudgeSig) scheduleRender();
  nudgeSig = sig;
}, 60000);

render();
scrollToAnchor();
if (location.hash.endsWith('#wish')) $('#wish-text')?.focus();
startReminders({ toast });
if (!reduced) gsap.from('.panel, .title-row', { opacity: 0, y: 18, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'opacity,transform' });
