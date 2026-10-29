// Parametric window key holder: a small open-topped pocket that sticks to a
// UPVC window frame and holds the window key, with a finger scoop cut into the
// front so the key is easy to grab. Plain ESM so it runs both in the browser
// (the model page's generator form) and in Node (scripts/build-key-holder.mjs,
// which writes the default STL into public/models/).
//
// It prints standing up, open end on top: the floor is on the bed, the walls
// go straight up and the scoop is a cut in a vertical wall, so nothing
// overhangs and no supports are needed.
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

import { toStl as writeStl } from './stl.js';

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'slotWidth', label: 'Slot width', default: 20, min: 5, max: 80, step: 0.5, help: 'Across the widest part of the key head, plus a little room.' },
  { key: 'slotDepth', label: 'Slot depth', default: 5, min: 1, max: 30, step: 0.5, help: 'Front to back. Room for the key’s thickness, or two or three keys stacked.' },
  { key: 'height', label: 'Height', default: 30, min: 10, max: 120, step: 1, help: 'Overall height. The key head should stick out above the scoop.' },
  { key: 'sideWall', label: 'Side walls', default: 2.5, min: 1, max: 8, step: 0.1 },
  { key: 'frontWall', label: 'Front wall', default: 1.4, min: 0.8, max: 6, step: 0.1 },
  { key: 'backWall', label: 'Back wall', default: 1.6, min: 0.8, max: 6, step: 0.1, help: 'The flat face that goes against the frame.' },
  { key: 'floor', label: 'Floor', default: 1.6, min: 0.6, max: 10, step: 0.2 },
  { key: 'scoop', label: 'Scoop width', default: 72, min: 0, max: 95, step: 1, unit: '%', help: 'Finger scoop across the front, as a share of the outer width. 0 for none.' },
  { key: 'scoopDepth', label: 'Scoop depth', default: 9, min: 0, max: 60, step: 0.5, help: 'How far the scoop dips down from the top.' },
  { key: 'count', label: 'How many', default: 1, min: 1, max: 12, step: 1, unit: '', help: 'Lays out a plate of them, spaced 5 mm apart.' },
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
  out.count = Math.round(out.count);
  // Keep the scoop above the floor, so the front wall never splits in two.
  out.scoopDepth = Math.min(out.scoopDepth, out.height - out.floor - 3);
  return out;
}

/** Outer size of one holder. */
export function describe(raw) {
  const p = normalise(raw);
  const width = p.slotWidth + 2 * p.sideWall;
  const depth = p.backWall + p.slotDepth + p.frontWall;
  return { width, depth, height: p.height, slotWidth: p.slotWidth, slotDepth: p.slotDepth, count: p.count };
}

/** One holder: X across, Y front (y = 0) to back, Z up, floor on z = 0. */
function holder(wasm, p) {
  const { Manifold, CrossSection } = wasm;
  const { width: W, depth: D } = describe(p);
  const H = p.height;
  const r = Math.min(0.8, D / 4, W / 4);

  // Rounded footprint, extruded up.
  const pts = [];
  const corners = [[W - r, r, -90], [W - r, D - r, 0], [r, D - r, 90], [r, r, 180]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 8; i++) {
      const a = ((a0 + (90 * i) / 8) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  let m = Manifold.extrude(new CrossSection([pts]), H);

  // The key slot, open at the top.
  m = m.subtract(Manifold.cube([p.slotWidth, p.slotDepth, H]).translate([(W - p.slotWidth) / 2, p.frontWall, p.floor]));

  // Finger scoop through the front wall: a circular arc spanning `scoop`% of
  // the width, dipping `scoopDepth` below the top.
  if (p.scoop > 0 && p.scoopDepth > 0) {
    const half = (W * p.scoop) / 200;
    const dip = p.scoopDepth;
    const R = (half * half + dip * dip) / (2 * dip);
    const cut = Manifold.cylinder(p.frontWall + 0.02, R, R, 128)
      .rotate([-90, 0, 0])
      .translate([W / 2, -0.01, H - dip + R]);
    m = m.subtract(cut);
  }
  return m;
}

/** Build a plate of `count` holders. Returns a manifold-3d Manifold, Z up, on z = 0. */
export function buildKeyHolder(wasm, raw) {
  const p = normalise(raw);
  const { Manifold } = wasm;
  const one = holder(wasm, p);
  if (p.count === 1) return one;
  const { width: W, depth: D } = describe(p);
  const gap = 5;
  const cols = Math.min(p.count, 6);
  const parts = Array.from({ length: p.count }, (_, i) =>
    one.translate([(i % cols) * (W + gap), Math.floor(i / cols) * (D + gap), 0]),
  );
  const plate = Manifold.union(parts);
  one.delete();
  return plate;
}

/** One-line summary for the generator form. */
export function summary(raw) {
  const d = describe(raw);
  const n = (x) => +x.toFixed(2);
  const each = `${n(d.width)} × ${n(d.height)} × ${n(d.depth)} mm outside, ${n(d.slotWidth)} × ${n(d.slotDepth)} mm slot`;
  return d.count > 1 ? `${d.count} holders, each ${each}` : each;
}

/** Common entry point used by the generator form. */
export const build = buildKeyHolder;

export function fileName(raw) {
  const p = normalise(raw);
  const d = describe(p);
  return `key-holder-${+d.slotWidth.toFixed(2)}x${+d.slotDepth.toFixed(2)}-${d.height}h${p.count > 1 ? `-x${p.count}` : ''}.stl`;
}

/** Binary STL. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'window key holder - evilprofessor.co.uk') {
  return writeStl(manifold, header);
}
