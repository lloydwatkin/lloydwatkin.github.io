// Parametric toy horse show jump: two stands, peg-in jump cups and poles.
// Plain ESM so it runs both in the browser (the model page's generator form)
// and in Node (scripts/build-horse-jumps.mjs, which writes the default STLs
// into public/models/).
//
// - Each stand is a square post on a rounded base with two triangular fins.
//   The fins run front to back so the sides of the post are clear for the cups.
//   The post has a row of horizontal peg holes. They're teardrop-shaped (a
//   45° point on top) so the stand prints upright without supports.
// - A jump cup is a block with a shallow cradle on top and a peg on the back.
//   The peg pushes through any hole in the stand. The cradle is shallow on
//   purpose so a knocked pole rolls off, like a real one.
// - The pole is as long as the printer bed allows, laid straight across or
//   corner to corner. It has a small flat underneath so it sits on the bed.
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

import { toStl as writeStl } from './stl.js';

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'parts', label: 'Parts', default: 'stands', options: ['stands', 'cups', 'pole'], labels: { stands: 'Two stands', cups: 'Jump cups', pole: 'One pole' }, help: 'Three print plates. Print the pole plate once per pole, in white.' },
  { key: 'bed', label: 'Printer bed size', default: 260, min: 150, max: 400, step: 1, help: 'Width of a square bed. Creality K2: 260, K2 Pro: 300, K2 Plus: 350. The pole is made as long as fits.' },
  { key: 'layout', label: 'Pole on the bed', default: 'diagonal', options: ['diagonal', 'straight'], labels: { diagonal: 'Corner to corner (longest)', straight: 'Straight across' } },
  { key: 'poleD', label: 'Pole diameter', default: 10, min: 6, max: 16, step: 0.5, help: 'The cups and stand holes are sized from it.' },
  { key: 'height', label: 'Stand height', default: 200, min: 100, max: 300, step: 1, help: 'To the top of the ball.' },
  { key: 'spacing', label: 'Hole spacing', default: 20, min: 10, max: 40, step: 1, help: 'Height steps for the cups. The lowest hole is 30 mm up.' },
  { key: 'cups', label: 'Number of cups', default: 4, min: 1, max: 12, step: 1, unit: '', help: 'Two per pole.' },
];

export const defaults = Object.fromEntries(parameters.map((p) => [p.key, p.default]));

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
  out.cups = Math.round(out.cups);
  return out;
}

// Fixed stand details.
const POST_W = 16;            // square post
const BASE_X = 50;            // base, along the pole
const BASE_Y = 90;            // base, in the direction the pony jumps
const BASE_T = 6;
const FIN_H = 45;
const FIN_T = 3;
const BALL_D = 20;            // ball on top of the post
const FIRST_HOLE = 30;        // lowest hole centre above the ground
const HOLE_D = 5.4;           // peg holes
const PEG_D = 5;              // a 0.2 mm gap all round
const FLAT = 0.8;             // flat on the pole's underside
const MARGIN = 5;             // kept clear at each edge of the bed

/** Sizes that follow from the parameters. */
export function describe(raw) {
  const p = normalise(raw);
  const usable = p.bed - 2 * MARGIN;
  const poleLength = Math.floor(p.layout === 'diagonal' ? usable * Math.SQRT2 - p.poleD - 2 : usable);
  const postTop = p.height - BALL_D * 0.8;
  const holes = [];
  for (let h = FIRST_HOLE; h <= postTop - 25; h += p.spacing) holes.push(h);
  return { ...p, poleLength, postTop, holes };
}

// --------------------------------------------------------------------- pole

function pole(wasm, d) {
  const { Manifold } = wasm;
  const r = d.poleD / 2, L = d.poleLength;
  const rod = Manifold.union([
    Manifold.cylinder(L - d.poleD, r, r, 64).translate([0, 0, r]),
    Manifold.sphere(r, 64).translate([0, 0, r]),
    Manifold.sphere(r, 64).translate([0, 0, L - r]),
  ]).rotate([0, 90, 0]);           // now along X, centred on z = 0
  const { min } = rod.boundingBox();
  const keep = Manifold.cube([L + 2, d.poleD + 2, d.poleD]).translate([min[0] - 1, -r - 1, -r + FLAT]);
  let out = rod.intersect(keep);
  if (d.layout === 'diagonal') out = out.rotate([0, 0, 45]);
  return out;
}

// -------------------------------------------------------------------- stand

/** A horizontal hole along X with a 45° point on top, so it prints upright. */
function teardrop(wasm, length) {
  const { Manifold } = wasm;
  const r = HOLE_D / 2;
  const round = Manifold.cylinder(length, r, r, 32, true).rotate([0, 90, 0]);
  const tip = Manifold.cube([length, 0.01, 0.01], true).translate([0, 0, r * Math.SQRT2]);
  return Manifold.hull([round, tip]);
}

function stand(wasm, d) {
  const { Manifold, CrossSection } = wasm;
  const base2d = CrossSection.square([BASE_X, BASE_Y], true).offset(-6, 'Round', 2, 24).offset(6, 'Round', 2, 24);
  const parts = [Manifold.extrude(base2d, BASE_T)];

  // Post with chamfered corners.
  let post = Manifold.cube([POST_W, POST_W, d.postTop]).translate([-POST_W / 2, -POST_W / 2, 0]);
  const corners = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      corners.push(Manifold.cube([3, 3, d.postTop + 2], true).rotate([0, 0, 45]).translate([sx * POST_W / 2, sy * POST_W / 2, d.postTop / 2]));
    }
  }
  parts.push(post.subtract(Manifold.union(corners)));

  // Fins front and back, in the direction the pony jumps. None on the sides,
  // where the cups go.
  const fin = (reach) => Manifold.hull([
    Manifold.cube([reach, FIN_T, 0.01]).translate([POST_W / 2 - 0.5, -FIN_T / 2, 0]),
    Manifold.cube([0.01, FIN_T, FIN_H]).translate([POST_W / 2 - 0.5, -FIN_T / 2, 0]),
  ]);
  const reach = BASE_Y / 2 - 4 - POST_W / 2;
  parts.push(fin(reach).rotate([0, 0, 90]), fin(reach).rotate([0, 0, 270]));

  // Neck and ball on top.
  parts.push(Manifold.cylinder(6, POST_W / 2 - 1, BALL_D / 2 - 3, 48).translate([0, 0, d.postTop - 1]));
  parts.push(Manifold.sphere(BALL_D / 2, 48).translate([0, 0, d.height - BALL_D / 2]));

  const holes = d.holes.map((h) => teardrop(wasm, POST_W + 4).translate([0, 0, h]));
  return Manifold.union(parts).subtract(Manifold.union(holes));
}

// ---------------------------------------------------------------------- cup

function cupSizes(d) {
  return { w: Math.max(POST_W, d.poleD + 6), depth: d.poleD + 4, h: d.poleD + 3, seatR: d.poleD / 2 + 0.6, pegL: POST_W - 1 };
}

/**
 * One cup the way it's used: the back face at x = 0 against the stand, the peg
 * along -X through the stand, the cradle along X facing up. The peg's axis is
 * z = 0, and the pole's centre sits poleD / 2 + 1 above it.
 */
function cupInUse(wasm, d) {
  const { Manifold } = wasm;
  const c = cupSizes(d);
  const top = d.poleD / 2;
  let block = Manifold.cube([c.depth, c.w, c.h]).translate([0, -c.w / 2, top - c.h]);
  const seat = Manifold.cylinder(c.depth + 2, c.seatR, c.seatR, 64).rotate([0, 90, 0]).translate([-1, 0, top + 1]);
  const chamfer = Manifold.cube([6, c.w + 2, 6], true).rotate([0, 45, 0]).translate([c.depth, 0, top - c.h]);
  block = block.subtract(Manifold.union([seat, chamfer]));
  const peg = Manifold.union([
    Manifold.cylinder(c.pegL - 0.8, PEG_D / 2, PEG_D / 2, 32),
    Manifold.cylinder(0.8, PEG_D / 2, PEG_D / 2 - 0.6, 32).translate([0, 0, c.pegL - 0.8]),
  ]).rotate([0, -90, 0]);
  return Manifold.union([block, peg]);
}

/** Print orientation: back face on the bed, peg pointing up. */
function cup(wasm, d) {
  const m = cupInUse(wasm, d).rotate([0, 90, 0]).rotate([180, 0, 0]);
  return toOrigin(m);
}

// --------------------------------------------------------------------- build

const toOrigin = (m) => {
  const { min } = m.boundingBox();
  return m.translate([-min[0], -min[1], -min[2]]);
};

const centred = (m) => {
  const { min, max } = m.boundingBox();
  return m.translate([-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]]);
};

/** Build one print plate. Returns a manifold-3d Manifold, Z up, sitting on z = 0. */
export function build(wasm, raw) {
  const d = describe(raw);
  const { Manifold } = wasm;
  if (d.parts === 'pole') return centred(pole(wasm, d));
  if (d.parts === 'cups') {
    const one = cup(wasm, d);
    const { max } = one.boundingBox();
    const cols = Math.ceil(Math.sqrt(d.cups));
    const placed = [];
    for (let i = 0; i < d.cups; i++) {
      placed.push(one.translate([(i % cols) * (max[0] + 6), Math.floor(i / cols) * (max[1] + 6), 0]));
    }
    return centred(Manifold.union(placed));
  }
  const s = stand(wasm, d);
  return Manifold.union([s.translate([-(BASE_X / 2 + 4), 0, 0]), s.translate([BASE_X / 2 + 4, 0, 0])]);
}

/** The whole jump put together with one pole, for pictures. */
export function assembly(wasm, raw, holeIndex = 2) {
  const d = describe(raw);
  const { Manifold } = wasm;
  const h = d.holes[Math.min(holeIndex, d.holes.length - 1)];
  const span = d.poleLength - 8;                    // centre to centre of the posts
  const s = stand(wasm, d);
  const c = cupInUse(wasm, d).translate([POST_W / 2, 0, h]);
  const rod = centred(pole(wasm, { ...d, layout: 'straight' }));
  const seatBottom = d.poleD / 2 + 1 - (d.poleD / 2 + 0.6);
  return {
    stands: Manifold.union([s.translate([-span / 2, 0, 0]), s.translate([span / 2, 0, 0])]),
    cups: Manifold.union([c.translate([-span / 2, 0, 0]), c.rotate([0, 0, 180]).translate([span / 2, 0, 0])]),
    pole: rod.translate([0, 0, h + seatBottom - FLAT]),
  };
}

/** One-line summary for the generator form; `box` is the model's bounding box. */
export function summary(raw, box) {
  const d = describe(raw);
  const r = (n) => +n.toFixed(1);
  const size = box ? ` · ${r(box.max[0] - box.min[0])} × ${r(box.max[1] - box.min[1])} × ${r(box.max[2] - box.min[2])} mm` : '';
  const heights = `${d.holes.length} heights, ${d.holes[0]}–${d.holes[d.holes.length - 1]} mm`;
  if (d.parts === 'pole') return `${d.poleLength} mm pole${d.layout === 'diagonal' ? ', corner to corner' : ''}${size}`;
  if (d.parts === 'cups') return `${d.cups} cups for a ${r(d.poleD)} mm pole${size}`;
  return `Two ${r(d.height)} mm stands · ${heights}${size}`;
}

export function fileName(raw) {
  const d = describe(raw);
  if (d.parts === 'pole') return `horse-jump-pole-${d.poleLength}mm.stl`;
  if (d.parts === 'cups') return `horse-jump-cups-${d.cups}x.stl`;
  return `horse-jump-stands-${d.height}mm.stl`;
}

/** Binary STL. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'toy horse jumps - evilprofessor.co.uk') {
  return writeStl(manifold, header);
}
