// The little 3D stage the crane lives on: transparent over the paper page, soft
// sun from the upper left, a contact shadow, and motion on twos (12 fps) for the
// stop-motion feel of a paper collage.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Crane } from './crane.js';

const FLOCK_COLORS = ['#24496B', '#E9B33F', '#8EA46B', '#FBF8F2', '#A9CBD6'];

export function createCraneStage(canvas, {
  color = '#E0452B',
  progress = 0,
  flock = 0,
  view = 'hero',
  onCraneClick,
} = {}) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    canvas.closest('[data-stage]')?.classList.add('no-webgl');
    return { setProgress() {}, setColor() {}, hop() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(view === 'widget' ? 32 : 30, 1, 0.1, 60);
  const camPos = view === 'widget' ? new THREE.Vector3(2.3, 2.9, 3.6) : new THREE.Vector3(2.2, 2.8, 3.9);
  const target = new THREE.Vector3(0, 0.32, 0);
  camera.position.copy(camPos);
  camera.lookAt(target);

  scene.add(new THREE.HemisphereLight('#fff6e8', '#b9a98f', 1.5));
  const sun = new THREE.DirectionalLight('#fff3df', 2.4);
  sun.position.set(-2.5, 5, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3; sun.shadow.camera.right = 3; sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -3;
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#cfe3ea', 0.7);
  rim.position.set(3, 1.5, -3);
  scene.add(rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.31;
  ground.receiveShadow = true;
  scene.add(ground);

  const crane = new Crane({ color });
  crane.progress = progress;
  crane.update();
  scene.add(crane.group);

  const birds = Array.from({ length: flock }, (_, i) => {
    const c = new Crane({ color: FLOCK_COLORS[i % FLOCK_COLORS.length], scale: 0.26 + (i % 3) * 0.05, withSheet: false });
    c.progress = 1;
    c.lines.material.opacity = 0.35;
    c.orbit = { radius: 1.7 + i * 0.5, speed: 0.05 + (i % 3) * 0.02, phase: i * 2.1, height: 1.7 + (i % 2) * 0.5 };
    c.group.children.forEach((m) => { m.castShadow = false; });
    scene.add(c.group);
    return c;
  });

  // Pointer: the crane turns a little toward the cursor.
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const host = canvas.parentElement;
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    look.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    look.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  host.addEventListener('pointermove', onMove);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const onClick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(crane.mesh, false).length) {
      api.hop();
      onCraneClick?.(e);
    }
  };
  canvas.addEventListener('click', onClick);

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the whole wingspan in frame on narrow stages.
    const fit = Math.max(1, 1.15 / camera.aspect);
    camera.position.copy(camPos).sub(target).multiplyScalar(fit).add(target);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let visible = true;
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(host);

  const clock = new THREE.Clock();
  const baseYaw = 0.95;
  let hopY = { v: 0 };
  let raf = 0;
  let lastStep = -1;

  function render() { renderer.render(scene, camera); }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    look.x += (look.tx - look.x) * 0.06;
    look.y += (look.ty - look.y) * 0.06;
    // Stop-motion: the idle pose changes 12 times a second; turning toward the cursor stays smooth.
    const step = Math.floor(t * 12);
    if (step !== lastStep) {
      lastStep = step;
      const ts = step / 12;
      const done = crane.progress >= 1;
      crane.flap = done ? 0.18 + Math.sin(ts * 2.6) * 0.32 : 0.05;
      crane.bob = done ? Math.sin(ts * 1.3) * 0.06 + hopY.v : hopY.v;
      crane.update();
      for (const b of birds) {
        const a = b.orbit.phase + ts * b.orbit.speed * Math.PI * 2;
        b.group.position.set(Math.cos(a) * b.orbit.radius, b.orbit.height + Math.sin(ts * 1.7 + b.orbit.phase) * 0.12, Math.sin(a) * b.orbit.radius * 0.5 - 3.2);
        b.group.rotation.y = -a + Math.PI;
        b.flap = 0.15 + Math.sin(ts * 5 + b.orbit.phase) * 0.45;
        b.update();
      }
    }
    crane.group.rotation.y = baseYaw + look.x * 0.4 + (reduced ? 0 : Math.sin(t * 0.3) * 0.3);
    crane.group.rotation.x = look.y * 0.08;
    render();
  }

  const api = {
    setProgress(p, animate = true) {
      const to = Math.max(0, Math.min(1, p));
      gsap.killTweensOf(crane);
      if (!animate || reduced) {
        crane.progress = to;
        crane.update();
        render();
        return;
      }
      gsap.to(crane, { progress: to, duration: 0.9 + Math.abs(to - crane.progress) * 0.8, ease: 'power2.inOut', onUpdate: () => crane.update() });
    },
    setColor(c) { crane.setColor(c); render(); },
    hop() {
      if (reduced) return;
      gsap.timeline()
        .to(hopY, { v: 0.35, duration: 0.25, ease: 'power2.out' })
        .to(hopY, { v: 0, duration: 0.6, ease: 'bounce.out' });
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      crane.dispose(); birds.forEach((b) => b.dispose());
      renderer.dispose();
    },
  };

  resize();
  if (reduced) render(); else frame();
  return api;
}
