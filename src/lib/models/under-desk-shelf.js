// Parametric under-desk shelf connectors: three printed parts that hang a thin
// ply shelf below a desk. Plain ESM so it runs both in the browser (the model
// page's generator form) and in Node (scripts/build-under-desk-shelf.mjs, which
// writes the default STLs into public/models/).
//
//   C  bracket   screws to the underside of the desk. A T-slot, open on one
//                side, with a ledge either side of a narrow neck slot.
//   B  hanger    slides into the bracket by its wide head; a threaded socket in
//                its bottom end.
//   A  support   goes up through a hole in the shelf and screws into B, so the
//                shelf is clamped between A's flange and the end of B.
//
// Every part is built in its print orientation, on z = 0, so nothing needs
// supports: A flange down, B head down (its thread prints vertically), C with
// the shelf-facing face down and the slot open on top (the desk closes it).
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

import { toStl as writeStl } from './stl.js';

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'parts', label: 'Parts', default: 'set', options: ['set', 'support', 'hanger', 'bracket'], labels: { set: 'One set on a plate', support: 'Support (A)', hanger: 'Hanger (B)', bracket: 'Bracket (C)' }, help: 'Print a whole set together, or one part at a time.' },
  { key: 'shelf', label: 'Shelf thickness', default: 5, min: 3, max: 25, step: 0.5, help: 'Measure your board: ply is often a little thinner than its label.' },
  { key: 'hangerLength', label: 'Hanger length', default: 120, min: 60, max: 250, step: 1, help: 'Overall length of the hanger. The shelf top sits about 3 mm further than this below the desk.' },
  { key: 'threadD', label: 'Thread diameter', default: 20, min: 12, max: 30, step: 1, help: 'Drill the shelf holes 1–2 mm bigger than this.' },
  { key: 'pitch', label: 'Thread pitch', default: 3.5, min: 2, max: 5, step: 0.5 },
  { key: 'engage', label: 'Thread into hanger', default: 50, min: 15, max: 100, step: 1, help: 'How far the support screws up into the hanger.' },
  { key: 'clearance', label: 'Thread clearance', default: 0.35, min: 0.1, max: 0.8, step: 0.05, help: 'Extra room all round in the hanger’s socket. Raise it if the thread binds.' },
  { key: 'screwD', label: 'Screw holes', default: 4.6, min: 3, max: 6, step: 0.1, help: 'Clearance for the screws into the desk; 4.6 suits #8 (4 mm) screws.' },
];

export const defaults = Object.fromEntries(parameters.map((p) => [p.key, p.default]));

const SEG = 72;          // facets per turn
const HEAD_T = 8;        // hanger head thickness
const NECK_L = 7;        // straight neck under the head
const LIP_T = 7;         // bracket floor under the head
const POCKET = 1;        // gravity-lock pocket in the ledges
const CAV_H = HEAD_T + 2;
const FL_T = 6;          // support flange thickness

/** Clamp and coerce raw (e.g. form or URL) values into a valid parameter set. */
export function normalise(raw = {}) {
  const out = {};
  for (const p of parameters) {
    const v = raw[p.key];
    if (p.options) {
      out[p.key] = p.options.includes(v) ? v : p.default;
    } else {
      const n = Number(v);
      out[p.key] = Number.isFinite(n) && v !== '' && v != null ? Math.min(p.max, Math.max(p.min, n)) : p.default;
    }
  }
  // Leave at least 8 mm of solid rod above the socket.
  const d = sizes(out);
  out.engage = Math.min(out.engage, out.hangerLength - d.rodStart - 2 - 8);
  return out;
}

/** Derived sizes, all from the thread diameter. */
function sizes(p) {
  const R = p.threadD / 2;
  const H = p.pitch / 2;               // thread depth
  const rodR = R + 5;                  // hanger rod
  const neckR = R;                     // neck through the bracket floor
  const headR = rodR + 7;              // hanger head
  const chamfer = rodR - neckR;        // 45° step from neck to rod
  const rodStart = HEAD_T + NECK_L + chamfer;
  const flR = R + 14;                  // support flange
  const cavR = headR + 0.6;            // bracket slot for the head
  const slotR = neckR + 0.6;           // bracket slot for the neck
  const cW = 2 * (cavR + 19.4);
  const cL = 2 * headR + 20;
  const cH = LIP_T + CAV_H;
  const cy0 = cL / 2 - cavR - 5;       // head centre along the slide axis; open side at -y
  return { R, H, rodR, neckR, headR, chamfer, rodStart, flR, cavR, slotR, cW, cL, cH, cy0 };
}

/** Overall sizes for the summary and the page. */
export function describe(raw) {
  const p = normalise(raw);
  const d = sizes(p);
  return {
    ...d,
    supportHeight: FL_T + p.shelf + p.engage,
    drop: p.hangerLength + (d.cH - LIP_T + POCKET - HEAD_T),
    hole: p.threadD + 1.5,
  };
}

const prism = (u, P, H) => {
  const fl = H * Math.tan(Math.PI / 6);
  const flat = (P - 2 * fl) / 2;
  u = ((u % P) + P) % P;
  if (u < flat) return 0;
  if (u < flat + fl) return (u - flat) / fl;
  if (u < 2 * flat + fl) return 1;
  return 1 - (u - 2 * flat - fl) / fl;
};

/** Closed helical thread solid (60° flanks, flat crests and roots), z from 0 to length. */
function thread(wasm, rMajor, length, P, H) {
  const rMinor = rMajor - H;
  const dz = P / 16;
  const zs = [];
  for (let z = 0; z < length - 1e-9; z += dz) zs.push(z);
  zs.push(length);
  const n = SEG, M = zs.length;
  const verts = new Float32Array((M * n + 2) * 3);
  let o = 0;
  for (const z of zs) {
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      const r = rMinor + H * prism(z - (P * t) / (2 * Math.PI), P, H);
      verts[o++] = r * Math.cos(t); verts[o++] = r * Math.sin(t); verts[o++] = z;
    }
  }
  const bot = M * n, top = bot + 1;
  verts.set([0, 0, 0, 0, 0, length], bot * 3);
  const idx = (j, i) => j * n + (i % n);
  const tris = new Uint32Array(((M - 1) * n * 2 + 2 * n) * 3);
  o = 0;
  for (let j = 0; j < M - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = idx(j, i), b = idx(j, i + 1), c = idx(j + 1, i + 1), d = idx(j + 1, i);
      tris.set([a, b, c, a, c, d], o); o += 6;
    }
  }
  for (let i = 0; i < n; i++) {
    tris.set([bot, idx(0, i + 1), idx(0, i), top, idx(M - 1, i), idx(M - 1, i + 1)], o); o += 6;
  }
  return new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: verts, triVerts: tris }));
}

const cyl = (wasm, h, r1, r2 = r1, seg = SEG * 2) => wasm.Manifold.cylinder(h, r1, r2, seg);

/** A: the threaded support, flange down. */
function support(wasm, p) {
  const { Manifold } = wasm;
  const d = sizes(p);
  const len = p.shelf + p.engage;
  let flange = Manifold.union([
    cyl(wasm, 1, d.flR - 1, d.flR),
    cyl(wasm, FL_T - 2, d.flR).translate([0, 0, 1]),
    cyl(wasm, 1, d.flR, d.flR - 1).translate([0, 0, FL_T - 1]),
  ]);
  // Grip scallops round the rim.
  const notches = [];
  for (let k = 0; k < 12; k++) {
    const a = (2 * Math.PI * k) / 12;
    notches.push(cyl(wasm, FL_T + 2, 3, 3, 32).translate([d.flR * Math.cos(a), d.flR * Math.sin(a), -1]));
  }
  flange = flange.subtract(Manifold.union(notches));
  // Thread with a lead-in chamfer on the tip, on a solid core.
  const keep = Manifold.union([
    cyl(wasm, FL_T + len - 2, d.R + 30),
    cyl(wasm, 2, d.R, d.R - d.H - 0.3).translate([0, 0, FL_T + len - 2]),
  ]);
  const th = thread(wasm, d.R, len, p.pitch, d.H).translate([0, 0, FL_T]).intersect(keep);
  const core = cyl(wasm, len - 0.5, d.R - d.H + 0.05).translate([0, 0, FL_T]);
  let a = Manifold.union([flange, th, core]);
  // Cross recess in the bottom for a PH2/PH3 or flat screwdriver.
  const depth = 7, w = 2.8, l = Math.min(14, 2 * (d.R - d.H) - 1);
  a = a.subtract(Manifold.union([
    Manifold.cube([l, w, depth + 1]).translate([-l / 2, -w / 2, -1]),
    Manifold.cube([w, l, depth + 1]).translate([-w / 2, -l / 2, -1]),
    cyl(wasm, depth + 1, 4, 0.5, 48).translate([0, 0, -1]),
    cyl(wasm, 1, 5, 3, 48).translate([0, 0, -0.01]),
  ]));
  return a;
}

/** B: the hanger, head down. */
function hanger(wasm, p) {
  const { Manifold } = wasm;
  const d = sizes(p);
  const L = p.hangerLength;
  const body = Manifold.union([
    cyl(wasm, 1, d.headR - 1, d.headR),
    cyl(wasm, HEAD_T - 1, d.headR).translate([0, 0, 1]),
    cyl(wasm, NECK_L, d.neckR).translate([0, 0, HEAD_T]),
    cyl(wasm, d.chamfer, d.neckR, d.rodR).translate([0, 0, HEAD_T + NECK_L]),
    cyl(wasm, L - d.rodStart - 1, d.rodR).translate([0, 0, d.rodStart]),
    cyl(wasm, 1, d.rodR, d.rodR - 1).translate([0, 0, L - 1]),
  ]);
  const depth = p.engage + 2;
  const rs = d.R + p.clearance;
  const socket = Manifold.union([
    thread(wasm, rs, depth + 1, p.pitch, d.H).translate([0, 0, L - depth]),
    cyl(wasm, depth + 1, rs - d.H + 0.1).translate([0, 0, L - depth]),
    cyl(wasm, 2, rs - d.H, rs + 1).translate([0, 0, L - 1.99]),
    cyl(wasm, 0.5, rs + 1).translate([0, 0, L - 0.01]),
  ]);
  return body.subtract(socket);
}

/** C: the desk bracket, shelf-facing face down, slot open on top. */
function bracket(wasm, p) {
  const { Manifold } = wasm;
  const d = sizes(p);
  const slot = (r, z0, h) => Manifold.union([
    cyl(wasm, h, r).translate([0, d.cy0, z0]),
    Manifold.cube([2 * r, d.cL, h]).translate([-r, d.cy0 - d.cL, z0]),
  ]);
  const cuts = [
    slot(d.cavR, LIP_T, CAV_H + 1),
    slot(d.slotR, -1, LIP_T + 2),
    cyl(wasm, POCKET + 0.01, d.headR + 0.4).translate([0, d.cy0, LIP_T - POCKET]),
  ];
  // Countersunk screw holes, heads on the bottom face.
  const hx = d.cavR + 10.4, hy = d.cL / 2 - 14, sr = p.screwD / 2;
  for (const x of [-hx, hx]) {
    for (const y of [-hy, hy]) {
      cuts.push(cyl(wasm, d.cH + 2, sr, sr, 48).translate([x, y, -1]));
      cuts.push(cyl(wasm, sr * 2 + 0.6, sr * 2 + 0.6, 0, 48).translate([x, y, -0.6]));
    }
  }
  // Chamfer the outer vertical edges.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      cuts.push(Manifold.cube([6, 6, d.cH + 2], true).rotate([0, 0, 45]).translate([sx * d.cW / 2, sy * d.cL / 2, d.cH / 2]));
    }
  }
  return Manifold.cube([d.cW, d.cL, d.cH]).translate([-d.cW / 2, -d.cL / 2, 0]).subtract(Manifold.union(cuts));
}

/** Build the chosen part, or one set on a plate. Returns a manifold-3d Manifold, Z up, on z = 0. */
export function build(wasm, raw) {
  const p = normalise(raw);
  if (p.parts === 'support') return support(wasm, p);
  if (p.parts === 'hanger') return hanger(wasm, p);
  if (p.parts === 'bracket') return bracket(wasm, p);
  const d = sizes(p);
  const gap = 6;
  const y = d.cL / 2 + gap + Math.max(d.flR, d.headR);
  return wasm.Manifold.union([
    bracket(wasm, p),
    support(wasm, p).translate([-(d.flR + gap / 2), y, 0]),
    hanger(wasm, p).translate([d.headR + gap / 2, y, 0]),
  ]);
}

/** One-line summary for the generator form. */
export function summary(raw, box) {
  const p = normalise(raw);
  const d = describe(p);
  const r = (x) => +x.toFixed(1);
  const size = box ? ` · ${r(box.max[0] - box.min[0])} × ${r(box.max[1] - box.min[1])} × ${r(box.max[2] - box.min[2])} mm` : '';
  return `Shelf ${r(d.drop)} mm below the desk · ${r(d.hole)} mm shelf holes · ${r(p.engage)} mm of thread in the hanger${size}`;
}

export function fileName(raw) {
  const p = normalise(raw);
  const name = { set: 'set', support: 'support', hanger: 'hanger', bracket: 'bracket' }[p.parts];
  return `under-desk-shelf-${name}-${p.hangerLength}mm.stl`;
}

/** Binary STL. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'under-desk shelf connectors - evilprofessor.co.uk') {
  return writeStl(manifold, header);
}
