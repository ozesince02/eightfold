// The crane note (D-031): the app's info popup. A paper crane flies in from the little crane that
// was tapped, unfolds in the air into a square sheet, turns over to its white side, and the square
// opens downwards into a letter. Closing reverses it: the letter folds back into the square, the
// square turns over and folds into a crane, and the crane flies off the page.
// The 3D part reuses the fold engine of today's crane (three/crane.js), so the folds are real.
// With reduced motion or without WebGL the letter simply appears. Every way of closing works at
// any point, and ends in finish(), which doesn't wait for the dialog's own close event.
import '../styles/crane-note.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Crane } from '../three/crane.js';
import { NOTES, NOTE_SIGN } from '../data/notes.js';
import { esc } from '../lib/sanitize.js';

const COLOR = '#C8302C';            // shu, like every crane on the site
const FOV = 35;                     // degrees
const DIST = 10;                    // camera distance from the plane the paper lands on
const SHEET = 1.5;                  // the crane's square, in its own units (three/crane.js)
const WINGSPAN = 2.8;               // tip to tip, in the same units
const FLIGHT_PX = 170;              // how wide the crane looks while it flies
const OPENING_LIMIT = 4500;         // ms; past this, a stalled animation jumps to the letter
const CLOSING_LIMIT = 3500;         // ms; past this, a stalled animation just closes

let el = null;
let stage = null;                   // the 3D scene, made once and kept for the next note
let state = 'closed';               // closed | opening | open | closing
let tl = null;
let opener = null;
let limit = 0;
let openedAt = 0;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function build() {
  el = document.createElement('dialog');
  el.className = 'cnote';
  el.setAttribute('aria-labelledby', 'cnote-h');
  el.innerHTML = `
    <canvas class="cnote-sky" aria-hidden="true"></canvas>
    <article class="cnote-letter">
      <button class="cnote-x" type="button" data-cnote-close aria-label="Fold the note back">✕</button>
      <div class="cnote-text" data-cnote-text></div>
    </article>`;
  document.body.append(el);
  el.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  // The browser can close it by itself; its close event may come late, so it only counts while
  // the dialog really is closed.
  el.addEventListener('close', () => { if (!el.open) finish(); });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-cnote-close]')) close();
    // A tap outside closes it, but not the second half of the double-click that opened it.
    else if (e.target === el && performance.now() - openedAt > 500) close();
  });
}

function fill(note) {
  el.querySelector('[data-cnote-text]').innerHTML = `
    <p class="cnote-kicker">A note from the folding table</p>
    <h2 id="cnote-h">${esc(note.title)}</h2>
    ${note.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    <p class="cnote-sign">${esc(NOTE_SIGN)}</p>
    <div class="cnote-actions"><button class="btn btn--ink" type="button" data-cnote-close>Fold it back</button></div>`;
}

// ---------- The 3D stage ----------

function makeStage() {
  const canvas = el.querySelector('.cnote-sky');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, DIST);
  scene.add(new THREE.HemisphereLight('#fff6e8', '#b9a98f', 1.7));
  const sun = new THREE.DirectionalLight('#fff3df', 2.1);
  sun.position.set(-3, 4, 6);
  scene.add(sun);

  // pivot: where it is, how big, and its tilt toward the camera (pitch, about the screen's x).
  // holder: which way the neck points (yaw). The crane's own quarter turn lines the square up
  // with the screen once it lies flat.
  const crane = new Crane({ color: COLOR, sheetY: 0 });
  crane.lines.material.opacity = 0.35;
  // The white side becomes the letter, so it should look like the letter's paper, not warm beige.
  for (const m of [crane.back, crane.sheet.children[1].material]) {
    m.color.set('#FFFFFF');
    m.emissive.set('#FAF9F6');
    m.emissiveIntensity = 0.35;
  }
  crane.group.rotation.y = Math.PI / 4;
  const holder = new THREE.Group();
  holder.add(crane.group);
  const pivot = new THREE.Group();
  pivot.add(holder);
  scene.add(pivot);

  return { renderer, scene, camera, crane, holder, pivot, raf: 0, step: -1 };
}

// World units per CSS pixel on the plane the paper lands on.
const unit = () => (2 * DIST * Math.tan((FOV * Math.PI) / 360)) / window.innerHeight;
const toWorld = (px, py) => {
  const u = unit();
  return [(px - window.innerWidth / 2) * u, -(py - window.innerHeight / 2) * u];
};

function sizeStage() {
  const { renderer, camera } = stage;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Everything the animation moves. path is a curve from a to b through c; t runs along it.
const pose = { t: 0, s: 1, pitch: 0, yaw: 0, p: 1 };
let path = { a: [0, 0], c: [0, 0], b: [0, 0] };

function apply() {
  const { pivot, holder, crane } = stage;
  const t = pose.t, m = 1 - t;
  pivot.position.set(
    m * m * path.a[0] + 2 * m * t * path.c[0] + t * t * path.b[0],
    m * m * path.a[1] + 2 * m * t * path.c[1] + t * t * path.b[1],
    0,
  );
  pivot.scale.setScalar(pose.s);
  pivot.rotation.x = pose.pitch;
  holder.rotation.y = pose.yaw;
  crane.progress = pose.p;
}

function loop() {
  stage.raf = requestAnimationFrame(loop);
  // Wings beat in stop-motion steps, 12 a second, like the crane everywhere else.
  const step = Math.floor(performance.now() / 83);
  if (step !== stage.step) {
    stage.step = step;
    stage.crane.flap = pose.p >= 0.999 ? 0.15 + Math.sin(step * 1.15) * 0.55 : 0;
  }
  apply();
  stage.crane.update();
  stage.renderer.render(stage.scene, stage.camera);
}
function startLoop() { stage.pivot.visible = true; el.classList.add('is-flying'); if (!stage.raf) loop(); }
function stopLoop() {
  cancelAnimationFrame(stage.raf);
  stage.raf = 0;
  stage.pivot.visible = false;
  stage.renderer.render(stage.scene, stage.camera);
  // Hidden as well as cleared, so a frame left over from a paused page can't cover the letter.
  el.classList.remove('is-flying');
}

// Where the letter's top square sits on screen: the paper lands exactly there.
function square() {
  const r = el.querySelector('.cnote-letter').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.width / 2, side: r.width };
}
const scaleFor = (px, size) => (px * unit()) / size;

// ---------- Opening ----------

export function openCraneNote(id, from) {
  const note = Object.hasOwn(NOTES, id) ? NOTES[id] : null;
  if (!note) return;
  if (!el) build();
  if (state !== 'closed') return;
  opener = from || document.activeElement;
  fill(note);
  el.scrollTop = 0;
  el.classList.remove('is-open', 'is-folding', 'is-still', 'is-flying');
  el.showModal();
  openedAt = performance.now();
  if (still() || !(stage ||= makeStage())) {
    el.classList.add('is-still', 'is-open');
    state = 'open';
    return;
  }
  state = 'opening';
  sizeStage();

  const sq = square();
  const mark = (from?.querySelector('.crane-mark') || from)?.getBoundingClientRect?.();
  const start = mark && mark.width ? [mark.left + mark.width / 2, mark.top + mark.height / 2] : [-80, window.innerHeight * 0.3];
  const goingRight = sq.x >= start[0];
  path = {
    a: toWorld(...start),
    c: toWorld((start[0] + sq.x) / 2, Math.min(start[1], sq.y) - window.innerHeight * 0.22),
    b: toWorld(sq.x, sq.y),
  };
  Object.assign(pose, {
    t: 0, p: 1, pitch: 0.35,
    s: scaleFor(Math.max(36, mark?.width || 40), WINGSPAN),
    yaw: goingRight ? Math.PI / 4 : (-3 * Math.PI) / 4,
  });
  startLoop();

  tl = gsap.timeline({ onComplete: showLetter })
    // Fly in along a little arc, growing as it comes closer.
    .to(pose, { t: 1, s: scaleFor(FLIGHT_PX, WINGSPAN), duration: 0.85, ease: 'power1.inOut' })
    // Unfold in the air into the square, coloured side to you, as big as the letter.
    .to(pose, { p: 0, pitch: Math.PI / 2, yaw: 0, s: scaleFor(sq.side, SHEET), duration: 0.8, ease: 'power2.inOut' })
    // Turn the sheet over to its white side.
    .to(pose, { pitch: (3 * Math.PI) / 2, duration: 0.4, ease: 'power2.inOut' });
  clearTimeout(limit);
  limit = setTimeout(() => { if (state === 'opening') { tl?.kill(); showLetter(); } }, OPENING_LIMIT);
}

// The paper on screen becomes the letter: the square is swapped for the real page, which then
// opens downwards past the fold.
function showLetter() {
  clearTimeout(limit);
  tl = null;
  state = 'open';
  el.classList.add('is-open');
  setTimeout(() => { if (state === 'open') stopLoop(); }, 140);
}

// ---------- Closing ----------

function close() {
  if (state === 'closed' || state === 'closing') return;
  if (el.classList.contains('is-still')) { finish(); return; }
  const wasOpen = state === 'open';
  tl?.kill();
  tl = null;
  state = 'closing';
  clearTimeout(limit);
  limit = setTimeout(finish, CLOSING_LIMIT + (wasOpen ? 300 : 0));
  if (!wasOpen) { foldAway(); return; }
  // Fold the letter back up into its top square first.
  el.scrollTo({ top: 0 });
  el.classList.add('is-folding');
  setTimeout(() => { if (state === 'closing') foldAway(true); }, 280);
}

function foldAway(fromLetter = false) {
  sizeStage();
  const sq = square();
  if (fromLetter) {
    Object.assign(pose, { t: 0, p: 0, pitch: (3 * Math.PI) / 2, yaw: 0, s: scaleFor(sq.side, SHEET) });
  }
  // From wherever the paper is now, off the page to the top right.
  const here = [stage.pivot.position.x, stage.pivot.position.y];
  if (fromLetter) here.splice(0, 2, ...toWorld(sq.x, sq.y));
  const exit = toWorld(window.innerWidth + 160, -160);
  path = { a: here, c: [(here[0] + exit[0]) / 2, Math.max(here[1], exit[1]) + 0.6], b: exit };
  pose.t = 0;
  startLoop();
  el.classList.remove('is-open', 'is-folding');

  tl = gsap.timeline({ onComplete: finish })
    .to(pose, { pitch: Math.PI / 2, duration: 0.35, ease: 'power2.inOut' })
    .to(pose, { p: 1, pitch: 0.35, yaw: Math.PI / 4, s: scaleFor(FLIGHT_PX, WINGSPAN), duration: 0.75, ease: 'power2.inOut' })
    .to(pose, { t: 1, s: scaleFor(FLIGHT_PX * 0.6, WINGSPAN), duration: 0.75, ease: 'power2.in' });
}

// Every way of closing ends here, once.
function finish() {
  if (state === 'closed') return;
  state = 'closed';
  clearTimeout(limit);
  tl?.kill();
  tl = null;
  if (stage?.raf) stopLoop();
  el.classList.remove('is-open', 'is-folding', 'is-still');
  if (el.open) el.close();
  if (opener?.isConnected && (!document.activeElement || document.activeElement === document.body)) opener.focus();
  opener = null;
}
