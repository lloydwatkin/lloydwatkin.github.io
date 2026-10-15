// Parametric board joints: a T-joint and an L-corner that hold sheet material
// (ply, MDF) at 90°. Plain ESM so it runs both in the browser (the model page's
// generator form) and in Node (scripts/build-board-joint.mjs, which writes the
// default STL into public/models/).
//
// Each connector is a set of slots open at their ends, so the boards run on
// past it, sitting on a thin floor that holds the walls together. Through the
// walls are three kinds of hole:
//   - joint nail holes, lined up with the end of the butting board, so a nail
//     goes through one board and into the end of the other;
//   - screw/pin holes, which fix the connector to each board;
//   - glue holes, on the opposite wall, for squeezing glue into the slot.
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

import { toStl as writeStl } from './stl.js';

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'parts', label: 'Parts', default: 'both', options: ['both', 't', 'l'], labels: { both: 'T and L', t: 'T only', l: 'L only' }, help: 'Print both side by side, or just one.' },
  { key: 'ply', label: 'Board thickness', default: 5.5, min: 1, max: 30, step: 0.1, help: 'Measure your board: ply is often a little thinner than its label.' },
  { key: 'clearance', label: 'Slot clearance', default: 0.1, min: 0, max: 2, step: 0.05, help: 'Added to the board thickness. Printed slots come out a little narrow; 0.1 is a tight push fit, try 0.3–0.4 if it won’t go in.' },
  { key: 'wall', label: 'Wall thickness', default: 3, min: 1.2, max: 10, step: 0.2 },
  { key: 'height', label: 'Grip depth', default: 25, min: 12, max: 100, step: 1, help: 'How far the boards go into the connector.' },
  { key: 'floor', label: 'Floor thickness', default: 2.4, min: 0.6, max: 10, step: 0.2, help: 'Holds the walls together, so each connector prints as one piece.' },
  { key: 'crossLength', label: 'T crossbar length', default: 40, min: 10, max: 200, step: 1, help: 'Along the board that runs straight through the T.' },
  { key: 'armLength', label: 'Arm length', default: 25, min: 5, max: 200, step: 1, help: 'How far the T’s stem and each arm of the L reach past the joint.' },
  { key: 'nailD', label: 'Joint nail holes', default: 2, min: 0, max: 6, step: 0.1, help: 'Lined up with the end of the butting board, so a nail joins the two boards. 0 for none.' },
  { key: 'pinD', label: 'Screw/pin holes', default: 2.5, min: 0, max: 6, step: 0.1, help: 'Fix the connector to each board. 0 for none.' },
  { key: 'glueD', label: 'Glue holes', default: 3.5, min: 0, max: 8, step: 0.1, help: 'For squeezing glue into the slot. 0 for none.' },
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
  const slot = out.ply + out.clearance;
  // The crossbar must at least clear the stem's walls, and arms must reach past their own wall.
  out.crossLength = Math.max(out.crossLength, slot + 2 * out.wall + 4);
  out.armLength = Math.max(out.armLength, out.wall + 2);
  // Two rows of holes sit at 28% and 72% of the grip depth; keep them from merging.
  const maxD = out.height * 0.4;
  for (const k of ['nailD', 'pinD', 'glueD']) out[k] = Math.min(out[k], maxD);
  return out;
}

/** Hole centres along a wall between a and b: none if it won't fit, two on long walls, otherwise one in the middle. */
function columns(a, b, d) {
  const len = b - a;
  if (d <= 0 || len < d + 2) return [];
  return len >= 24 ? [a + len / 4, a + (3 * len) / 4] : [a + len / 2];
}

function geometry(wasm, p) {
  const { Manifold } = wasm;
  const S = p.ply + p.clearance; // slot width
  const W = p.wall;
  const F = p.floor;
  const H = p.height;
  const top = F + H;
  const rows = [F + 0.28 * H, F + 0.72 * H];
  const mid = F + H / 2;

  const box = ([x0, x1, y0, y1], z0, z1) => Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
  const grow = ([x0, x1, y0, y1], d) => [x0 - d, x1 + d, y0 - d, y1 + d];

  // Solid outline grown from the slots by the wall thickness, minus the slots
  // (extended past the walls so their ends are open) above the floor.
  const connector = (slots, open) => Manifold.union(slots.map((r) => box(grow(r, W), 0, top)))
    .subtract(Manifold.union(open.map((r) => box(r, F, top + 1))));

  // A hole straight through a wall whose mid-plane is at x (axis 'x') or y (axis 'y').
  const hole = (axis, x, y, z, d) => Manifold.cylinder(2 * W, d / 2, d / 2, 40, true)
    .rotate(axis === 'x' ? [0, 90, 0] : [90, 0, 0])
    .translate([x, y, z]);

  const drill = (body, holes) => (holes.length ? body.subtract(Manifold.union(holes)) : body);

  // --- T-joint: centred on the origin. The crossbar board runs along X and
  // passes straight through; the stem board butts into its face from -Y.
  const tee = () => {
    const C = p.crossLength / 2;
    const L = p.armLength;
    const e = W + 1;
    const body = connector(
      [[-C, C, -S / 2, S / 2], [-S / 2, S / 2, -S / 2 - L, -S / 2]],
      [[-C - e, C + e, -S / 2, S / 2], [-S / 2, S / 2, -S / 2 - L - e, -S / 2]],
    );
    const back = S / 2 + W / 2; // mid-plane of the wall behind the crossbar
    const holes = [];
    for (const z of rows) {
      if (p.nailD > 0) holes.push(hole('y', 0, back, z, p.nailD)); // through crossbar into end of stem board
      for (const x of columns(S / 2 + W, C, p.pinD)) holes.push(hole('y', x, back, z, p.pinD), hole('y', -x, back, z, p.pinD));
      for (const s of columns(W, L, p.pinD)) holes.push(hole('x', back, -S / 2 - s, z, p.pinD)); // stem, one side
    }
    if (p.glueD > 0) {
      const gx = columns(S / 2 + W, C, p.glueD).length ? (S / 2 + W + C) / 2 : null;
      if (gx != null) holes.push(hole('y', gx, -back, mid, p.glueD), hole('y', -gx, -back, mid, p.glueD));
      if (columns(W, L, p.glueD).length) holes.push(hole('x', -back, -S / 2 - (W + L) / 2, mid, p.glueD)); // stem, other side
    }
    return drill(body, holes);
  };

  // --- L-corner: slot corner at the origin. Either board can take the corner
  // square, so there are joint nail holes in both outer walls.
  const ell = () => {
    const L = p.armLength;
    const A = S + L; // end of the arm along X
    const B = S + L; // end of the arm along Y
    const e = W + 1;
    const body = connector(
      [[0, A, 0, S], [0, S, S, B]],
      [[0, A + e, 0, S], [0, S, S, B + e]],
    );
    const outer = -W / 2; // mid-plane of both outer walls
    const inner = S + W / 2; // mid-plane of both inner walls
    const holes = [];
    for (const z of rows) {
      if (p.nailD > 0) holes.push(hole('y', S / 2, outer, z, p.nailD), hole('x', outer, S / 2, z, p.nailD));
      for (const x of columns(S, A, p.pinD)) holes.push(hole('y', x, outer, z, p.pinD));
      for (const y of columns(S, B, p.pinD)) holes.push(hole('x', outer, y, z, p.pinD));
    }
    if (p.glueD > 0 && columns(S + W, A, p.glueD).length) {
      holes.push(hole('y', (S + W + A) / 2, inner, mid, p.glueD), hole('x', inner, (S + W + B) / 2, mid, p.glueD));
    }
    return drill(body, holes);
  };

  return { tee, ell };
}

/** Build the connector(s). Returns a manifold-3d Manifold, Z up, sitting on z = 0. */
export function build(wasm, raw) {
  const p = normalise(raw);
  const { tee, ell } = geometry(wasm, p);
  const place = (m, x) => {
    const { min } = m.boundingBox();
    return m.translate([x - min[0], -min[1], -min[2]]);
  };
  if (p.parts === 't') return place(tee(), 0);
  if (p.parts === 'l') return place(ell(), 0);
  const t = place(tee(), 0);
  const l = place(ell(), t.boundingBox().max[0] + 10);
  return wasm.Manifold.union([t, l]);
}

/** Summary numbers for display. */
export function describe(raw) {
  const p = normalise(raw);
  return { slot: p.ply + p.clearance, height: p.floor + p.height, parts: p.parts };
}

/** One-line summary for the generator form; `box` is the model's bounding box. */
export function summary(raw, box) {
  const d = describe(raw);
  const r = (n) => +n.toFixed(2);
  const size = box ? ` · ${r(box.max[0] - box.min[0])} × ${r(box.max[1] - box.min[1])} mm on the bed` : '';
  return `${r(d.slot)} mm slot · ${r(d.height)} mm high${size}`;
}

export function fileName(raw) {
  const p = normalise(raw);
  const which = { both: 'T-and-L', t: 'T', l: 'L' }[p.parts];
  return `board-joint-${which}-${+(p.ply + p.clearance).toFixed(2)}mm-slot.stl`;
}

/** Binary STL. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'board joints - evilprofessor.co.uk') {
  return writeStl(manifold, header);
}
