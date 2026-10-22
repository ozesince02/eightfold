// A low-poly orizuru (paper crane) that folds itself out of a flat square as habits get done.
// progress 0: a square of origami paper with the crane's creases printed on it.
// progress 1: a finished crane, flapping in stop-motion steps.
import * as THREE from 'three';

const HINGE_Y = 0.28;

// [part, wing side, a, b, c]. Parts fold in this order as progress rises.
// x: wings (left +x, right -x), y: up, z: neck forward (+z), tail back (-z).
const P = {
  F: [0, 0.05, 0.45], B: [0, 0.05, -0.45], TF: [0, HINGE_Y, 0.18], TB: [0, HINGE_Y, -0.18],
  D: [0, -0.22, 0], L: [0.17, 0.02, 0], R: [-0.17, 0.02, 0],
  N1: [0.07, 0.0, 0.32], N2: [-0.07, 0.0, 0.32], N3: [0, 0.16, 0.42], NT: [0, 0.98, 0.92],
  H1: [0.028, 0.93, 0.98], H2: [-0.028, 0.93, 0.98], HT: [0, 0.8, 1.2],
  T1: [0.07, 0.0, -0.32], T2: [-0.07, 0.0, -0.32], T3: [0, 0.16, -0.42], TT: [0, 0.92, -1.02],
  WLT: [1.4, 0.55, -0.1], WLM: [0.62, 0.3, -0.42], WRT: [-1.4, 0.55, -0.1], WRM: [-0.62, 0.3, -0.42],
};
const BODY = 0, TAIL = 1, NECK = 2, HEAD = 3, WING_R = 4, WING_L = 5;
export const PART_COUNT = 6;

const TRIS = [
  [BODY, 0, 'F', 'TF', 'L'], [BODY, 0, 'TF', 'TB', 'L'], [BODY, 0, 'TB', 'B', 'L'], [BODY, 0, 'F', 'L', 'D'], [BODY, 0, 'L', 'B', 'D'],
  [BODY, 0, 'F', 'TF', 'R'], [BODY, 0, 'TF', 'TB', 'R'], [BODY, 0, 'TB', 'B', 'R'], [BODY, 0, 'F', 'R', 'D'], [BODY, 0, 'R', 'B', 'D'],
  [TAIL, 0, 'T1', 'T3', 'TT'], [TAIL, 0, 'T3', 'T2', 'TT'],
  [NECK, 0, 'N1', 'N3', 'NT'], [NECK, 0, 'N3', 'N2', 'NT'],
  [HEAD, 0, 'NT', 'H1', 'HT'], [HEAD, 0, 'H2', 'NT', 'HT'],
  [WING_R, -1, 'TF', 'WRT', 'WRM'], [WING_R, -1, 'TF', 'WRM', 'TB'],
  [WING_L, 1, 'TF', 'WLT', 'WLM'], [WING_L, 1, 'TF', 'WLM', 'TB'],
];

// Make every face's front side point away from the crane's middle, so the coloured
// side of the paper is outside and the white side is inside, like a real orizuru.
const CENTER = new THREE.Vector3(0, 0.12, 0);
const ORIENTED = TRIS.map(([part, wing, a, b, c]) => {
  const va = new THREE.Vector3(...P[a]), vb = new THREE.Vector3(...P[b]), vc = new THREE.Vector3(...P[c]);
  const n = new THREE.Vector3().subVectors(vb, va).cross(new THREE.Vector3().subVectors(vc, va));
  const centroid = va.clone().add(vb).add(vc).divideScalar(3);
  const out = wing ? new THREE.Vector3(0, 1, 0) : centroid.sub(CENTER);
  return n.dot(out) < 0 ? [part, wing, va, vc, vb] : [part, wing, va, vb, vc];
});

let paperTexture;
function getPaperTexture() {
  if (paperTexture) return paperTexture;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f0e8';
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(120,100,80,0.10)';
  for (let i = 0; i < 90; i++) {
    g.lineWidth = Math.random() * 1.2;
    g.beginPath();
    const x = Math.random() * size, y = Math.random() * size, a = Math.random() * Math.PI * 2, l = 8 + Math.random() * 30;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  paperTexture = new THREE.CanvasTexture(c);
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
  return paperTexture;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeFold = (t) => 1 - Math.pow(1 - t, 3);

export class Crane {
  constructor({ color = '#E0452B', scale = 1, withSheet = true, sheetY = -0.3 } = {}) {
    this.group = new THREE.Group();
    this.group.scale.setScalar(scale);
    this.progress = 0;
    this.flap = 0;
    this.bob = 0;
    this.sheetY = sheetY;

    const count = ORIENTED.length * 3;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    ORIENTED.forEach(([, , a, b, c], t) => [a, b, c].forEach((v, k) => {
      uvs[(t * 3 + k) * 2] = v.x * 0.6 + 0.5;
      uvs[(t * 3 + k) * 2 + 1] = v.z * 0.6 + 0.5;
    }));
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const tex = getPaperTexture();
    this.front = new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.92, metalness: 0, flatShading: true, side: THREE.FrontSide });
    this.back = new THREE.MeshStandardMaterial({ color: '#FBF8F2', map: tex, roughness: 0.95, metalness: 0, flatShading: true, side: THREE.BackSide });
    for (const mat of [this.front, this.back]) {
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      if (mat === this.front) this.mesh = mesh;
    }

    // Creases in sumi ink, like the line drawings of the 1797 folding book.
    this.linePositions = new Float32Array(ORIENTED.length * 6 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#1E1B18', transparent: true, opacity: 0.5 }));
    this.lines.frustumCulled = false;
    this.group.add(this.lines);

    if (withSheet) {
      const sheetGeo = new THREE.PlaneGeometry(1.5, 1.5);
      sheetGeo.rotateX(-Math.PI / 2);
      sheetGeo.rotateY(Math.PI / 4);
      this.sheet = new THREE.Group();
      const top = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.95, side: THREE.FrontSide }));
      const under = new THREE.Mesh(sheetGeo, new THREE.MeshStandardMaterial({ color: '#FBF8F2', map: tex, roughness: 0.95, side: THREE.BackSide }));
      top.receiveShadow = true;
      this.sheet.add(top, under);
      this.sheet.position.y = sheetY - 0.004;
      this.sheetTop = top;
      this.group.add(this.sheet);
    }
    this.update();
  }

  setColor(color) {
    this.front.color.set(color);
    if (this.sheetTop) this.sheetTop.material.color.set(color);
  }

  // Where vertex v sits for the current progress, flap and bob.
  place(v, part, wing, out) {
    const local = easeFold(clamp01(this.progress * PART_COUNT - part));
    let x = v.x, y = v.y, z = v.z;
    if (wing && local >= 1) {
      const a = this.flap * wing;
      const dy = y - HINGE_Y;
      x = v.x * Math.cos(a) - dy * Math.sin(a) * wing * wing;
      y = HINGE_Y + v.x * Math.sin(a) + dy * Math.cos(a);
    }
    const lift = 0.55 + this.bob;
    // Flat: the crane pressed onto the sheet, which reads as its crease pattern.
    const fx = v.x * 0.5, fz = v.z * 0.5, fy = this.sheetY + 0.002 + part * 0.0006;
    const arc = Math.sin(local * Math.PI) * 0.35;
    out[0] = fx + (x - fx) * local;
    out[1] = fy + (y + lift - fy) * local + arc;
    out[2] = fz + (z - fz) * local;
  }

  update() {
    const tmp = [0, 0, 0];
    ORIENTED.forEach(([part, wing, a, b, c], t) => {
      const verts = [a, b, c];
      verts.forEach((v, k) => {
        this.place(v, part, wing, tmp);
        this.positions.set(tmp, (t * 3 + k) * 3);
      });
      for (let e = 0; e < 3; e++) {
        const i0 = (t * 3 + e) * 3, i1 = (t * 3 + ((e + 1) % 3)) * 3;
        this.linePositions.set(this.positions.subarray(i0, i0 + 3), (t * 6 + e * 2) * 3);
        this.linePositions.set(this.positions.subarray(i1, i1 + 3), (t * 6 + e * 2 + 1) * 3);
      }
    });
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.lines.geometry.attributes.position.needsUpdate = true;
    if (this.sheet) {
      const left = Math.max(0.0001, 1 - this.progress);
      this.sheet.scale.set(left, 1, left);
      this.sheet.visible = this.progress < 0.999;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.lines.geometry.dispose();
    this.front.dispose(); this.back.dispose();
    this.sheet?.children.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
  }
}
