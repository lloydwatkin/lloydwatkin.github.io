// Parametric doll's hanging rail: a pole, two brackets that screw to the walls
// of a cupboard, and coat hangers sized to match. Plain ESM so it runs both in
// the browser (the model page's generator form) and in Node
// (scripts/build-hanging-rail.mjs, which writes the default STLs into
// public/models/).
//
// - The pole lies on a small flat so it prints without supports.
// - Each bracket is a plate with a U-shaped cup open at the top, so the pole
//   drops in and lifts out, and two countersunk screw holes.
// - The hangers are the classic shape: straight shoulders, a centre apex and a
//   neck that rises into a hook. The hook is shifted sideways until the point
//   it rests on sits over the hanger's centre of mass, so it hangs level. The
//   neck runs straight up under the hook so there's a channel for the pole to
//   pass under the hook tip on its way in.
// - Several hangers are nested head to tail on one plate to save bed space.
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

import { toStl as writeStl } from './stl.js';

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'parts', label: 'Parts', default: 'hangers', options: ['hangers', 'rail'], labels: { hangers: 'Hangers', rail: 'Pole and brackets' }, help: 'Two print plates: the hangers, or the pole with its two brackets.' },
  { key: 'count', label: 'Number of hangers', default: 8, min: 1, max: 12, step: 1, unit: '', help: 'Nested head to tail on one plate.' },
  { key: 'hangerWidth', label: 'Hanger width', default: 100, min: 50, max: 160, step: 1, help: 'Shoulder to shoulder. Hold a piece of clothing against it before printing a batch.' },
  { key: 'poleD', label: 'Pole diameter', default: 10, min: 6, max: 16, step: 0.5, help: 'The hooks are sized to fit it, with 2 mm to spare all round.' },
  { key: 'spaceWidth', label: 'Space width', default: 165, min: 60, max: 240, step: 0.5, help: 'Inside width of the cupboard, wall to wall. The pole is cut to fit between the brackets.' },
  { key: 'poleDrop', label: 'Pole below the top', default: 36, min: 20, max: 80, step: 1, help: 'From the top of the space to the pole centre. Hangers need about 3.5 × the pole diameter to lift off.' },
  { key: 'wire', label: 'Hanger wire width', default: 3.6, min: 2.4, max: 6, step: 0.1 },
  { key: 'thickness', label: 'Hanger thickness', default: 3, min: 2, max: 6, step: 0.2 },
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
  // The bracket's cup must sit below the screw holes.
  out.poleDrop = Math.max(out.poleDrop, out.poleD / 2 + 14);
  return out;
}

// Fixed bracket and pole details.
const PLATE_T = 3;      // bracket plate thickness
const PLATE_W = 26;     // bracket width (front to back)
const BOSS_LEN = 8;     // how far the cup stands off the plate
const END_GAP = 0.5;    // clearance at each end of the pole
const FLAT = 0.8;       // flat on the pole's underside
const SCREW_R = 1.4;    // ~2.5 mm wood screws
const CSK_R = 2.6;
const GAP = 2.5;        // gap between hangers on the plate

const poleLength = (p) => p.spaceWidth - 2 * PLATE_T - 2 * END_GAP;

// ---------------------------------------------------------------- 2D helpers

function helpers(wasm) {
  const { CrossSection } = wasm;
  const circle = (x, y, r) => CrossSection.circle(r, 40).translate([x, y]);
  /** A thick polyline with round ends and joins. */
  const stroke = (points, width) => {
    const r = width / 2;
    const parts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i], points[i + 1]];
      parts.push(CrossSection.hull([circle(a[0], a[1], r), circle(b[0], b[1], r)]));
    }
    return CrossSection.union(parts);
  };
  return { circle, stroke };
}

/**
 * X position of a shape's centre of mass. Sums the area in thin vertical
 * strips; manifold-3d's toPolygons() would be simpler but leaks memory.
 * Call inside `scoped` so the strips are freed.
 */
function centreX(wasm, cs, strips = 160) {
  const { min, max } = cs.bounds();
  const w = (max[0] - min[0]) / strips;
  const h = max[1] - min[1] + 2;
  let area = 0, moment = 0;
  for (let i = 0; i < strips; i++) {
    const x = min[0] + i * w;
    const a = cs.intersect(wasm.CrossSection.square([w, h]).translate([x, min[1] - 1])).area();
    area += a;
    moment += a * (x + w / 2);
  }
  return moment / area;
}

// -------------------------------------------------------------------- hanger

/** Hook and neck dimensions, scaled from the pole size. */
function hookGeometry(p) {
  const inner = p.poleD / 2 + 2;     // hook inner radius
  const R = inner + p.wire / 2;      // hook centre-line radius
  const k = R / 8.8;                 // the original was drawn for a 10 mm pole
  const apex = 0.27 * p.hangerWidth; // shoulder slope as on a full-size hanger
  return { inner, R, k, apex, cy: apex + 22 * k };
}

function hangerAt(wasm, p, hookX) {
  const { CrossSection } = wasm;
  const { stroke } = helpers(wasm);
  const { R, k, apex, cy } = hookGeometry(p);
  const a = p.hangerWidth / 2 - p.wire / 2;
  const frame = stroke([[-a, 0], [0, apex], [a, 0], [-a, 0]], p.wire);
  const neck = stroke([[0, apex], [hookX + 0.8 * R, apex + 6 * k], [hookX + R, apex + 10 * k], [hookX + R, cy]], p.wire);
  const arc = [];
  for (let i = 0; i < 80; i++) {
    const t = ((205 * i) / 79) * (Math.PI / 180); // curls round 205°, so the tip points down
    arc.push([hookX + R * Math.cos(t), cy + R * Math.sin(t)]);
  }
  return CrossSection.union([frame, neck, stroke(arc, p.wire)])
    .offset(0.6, 'Round', 2, 24).offset(-0.6, 'Round', 2, 24); // small fillets at the joins
}

/** The hanger outline, with the hook moved over the centre of mass. */
function hanger2d(wasm, p) {
  let hookX = 0;
  for (let i = 0; i < 5; i++) hookX = centreX(wasm, hangerAt(wasm, p, hookX));
  return { shape: hangerAt(wasm, p, hookX), hookX };
}

/**
 * Can the pole get from beside the hanger, under the hook tip and onto the
 * hook? Works out where the pole's centre can go and checks the hook's resting
 * point is joined to the outside.
 */
export function poleFits(wasm, raw) {
  return scoped(wasm, () => poleFitsCheck(wasm, normalise(raw)));
}

function poleFitsCheck(wasm, p) {
  const { CrossSection } = wasm;
  const { shape, hookX } = hanger2d(wasm, p);
  const { cy } = hookGeometry(p);
  const b = shape.bounds();
  const area = CrossSection.square([b.max[0] - b.min[0] + 60, b.max[1] - b.min[1] + 60]).translate([b.min[0] - 30, b.min[1] - 30]);
  const free = area.subtract(shape.offset(p.poleD / 2 + 0.3, 'Round', 2, 40));
  const rest = CrossSection.square([0.2, 0.2], true).translate([hookX, cy]);
  for (const part of free.decompose()) {
    if (part.intersect(rest).area() > 0) return part.bounds().min[0] <= b.min[0] - 29;
  }
  return false;
}

/** Lay out `count` hangers, upright and upside down in turn, nested head to tail. */
function hangerPlate(wasm, p) {
  const { CrossSection } = wasm;
  const up = hanger2d(wasm, p).shape;
  const down = up.rotate(180);

  // Shapes are kept GAP apart by growing each by half the gap and checking the
  // grown copies don't touch. Growing once and moving the copy is much faster
  // than growing at every step.
  const grow = (s) => s.offset(GAP / 2, 'Round', 2, 16);
  const touches = (ga, gb, dx, dy) => {
    const moved = gb.translate([dx, dy]);
    const overlap = ga.intersect(moved);
    const hit = overlap.area() > 1e-6;
    moved.delete(); overlap.delete();
    return hit;
  };
  // Step coarsely until clear, then back off and refine in 0.5 mm steps.
  const firstClear = (hit, start) => {
    let v = start;
    while (hit(v)) v += 4;
    v = Math.max(start, v - 4);
    while (hit(v)) v += 0.5;
    return v;
  };

  const gUp = grow(up), gDown = grow(down);
  // 1. Best place for an upside-down hanger tucked into an upright one.
  let pair = null;
  for (let dx = 0; dx < p.hangerWidth * 0.6; dx += 2) {
    const dy = firstClear((y) => touches(gUp, gDown, dx, y), 0);
    if (!pair || dy < pair.dy) pair = { dx, dy };
  }
  const cell = CrossSection.union([up, down.translate([pair.dx, pair.dy])]);
  const gCell = grow(cell);
  // 2. How far apart pairs stack in a column.
  const step = firstClear((y) => touches(gCell, gCell, 0, y), 0);

  // 3. Columns of pairs; try 1-3 columns and keep the squarest plate.
  const cells = Math.ceil(p.count / 2);
  const columnOf = (rows) => {
    const parts = [];
    for (let r = 0; r < rows; r++) parts.push(cell.translate([0, r * step]));
    return CrossSection.union(parts);
  };
  let best = null;
  for (let cols = 1; cols <= Math.min(3, cells); cols++) {
    const rows = Math.ceil(cells / cols);
    const column = columnOf(rows);
    let offset = { dx: 0, dy: 0 };
    if (cols > 1) {
      const gCol = grow(column);
      const h = column.bounds().max[1] - column.bounds().min[1];
      const size = (dx, dy) => Math.max((cols - 1) * dx + (column.bounds().max[0] - column.bounds().min[0]), h + (cols - 1) * Math.abs(dy));
      const search = (from, to, by) => {
        let b = null;
        for (let dy = from; dy <= to; dy += by) {
          const dx = firstClear((x) => touches(gCol, gCol, x, dy), p.hangerWidth * 0.5);
          if (!b || size(dx, dy) < size(b.dx, b.dy)) b = { dx, dy };
        }
        return b;
      };
      const coarse = search(-h, h, 10);
      offset = search(coarse.dy - 10, coarse.dy + 10, 2);
    }
    // Place hangers column by column, dropping the spare upside-down one if the count is odd.
    const placed = [];
    let left = p.count;
    for (let c = 0; c < cols && left > 0; c++) {
      for (let r = 0; r < rows && left > 0; r++) {
        const [x, y] = [c * offset.dx, c * offset.dy + r * step];
        placed.push(up.translate([x, y])); left--;
        if (left > 0) { placed.push(down.translate([x + pair.dx, y + pair.dy])); left--; }
      }
    }
    const plate = CrossSection.union(placed);
    const b = plate.bounds();
    const dim = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]);
    if (!best || dim < best.dim) best = { dim, plate };
  }
  return best.plate;
}

// ---------------------------------------------------------------------- rail

function pole(wasm, p) {
  const { Manifold } = wasm;
  const L = poleLength(p), r = p.poleD / 2, ch = 0.6; // 0.6 mm chamfer at each end
  const cyl = Manifold.union([
    Manifold.cylinder(ch, r - ch, r, 72),
    Manifold.cylinder(L - 2 * ch, r, r, 72).translate([0, 0, ch]),
    Manifold.cylinder(ch, r, r - ch, 72).translate([0, 0, L - ch]),
  ]).rotate([0, 90, 0]);
  const b = cyl.boundingBox();
  const keep = Manifold.cube([L + 2, p.poleD + 2, p.poleD]).translate([b.min[0] - 1, -r - 1, -r + FLAT]);
  return cyl.intersect(keep);
}

function bracket(wasm, p) {
  const { Manifold, CrossSection } = wasm;
  const H = p.poleDrop + 12;      // plate height; its top edge goes against the top of the space
  const y = H - p.poleDrop;       // pole centre
  const boreR = p.poleD / 2 + 0.25;
  const bossR = p.poleD / 2 + 3;
  const plate2d = CrossSection.square([PLATE_W, H]).translate([-PLATE_W / 2, 0])
    .offset(-3, 'Round', 2, 24).offset(3, 'Round', 2, 24);
  let body = Manifold.union([
    Manifold.extrude(plate2d, PLATE_T),
    Manifold.cylinder(BOSS_LEN, bossR, bossR, 72).translate([0, y, PLATE_T]),
  ]);
  const cuts = [
    Manifold.cylinder(BOSS_LEN + 1, boreR, boreR, 72).translate([0, y, PLATE_T]),
    // slot open at the top so the pole drops in
    Manifold.cube([2 * boreR, bossR + 2, BOSS_LEN + 1]).translate([-boreR, y, PLATE_T]),
  ];
  // lead-in chamfers at the slot mouth
  for (const sx of [-1, 1]) {
    const tri = [[sx * boreR, y + bossR - 1.6], [sx * (boreR + 1.6), y + bossR + 0.5], [sx * boreR, y + bossR + 0.5]];
    const wedge = new CrossSection([sx > 0 ? tri : tri.reverse()], 'Positive'); // not tracked by `scoped`
    cuts.push(Manifold.extrude(wedge, BOSS_LEN + 1).translate([0, 0, PLATE_T]));
    wedge.delete();
  }
  // two countersunk screw holes near the top
  const cskH = CSK_R - SCREW_R;
  for (const sx of [-7.5, 7.5]) {
    cuts.push(Manifold.cylinder(PLATE_T + 2, SCREW_R, SCREW_R, 32).translate([sx, H - 7, -1]));
    cuts.push(Manifold.cylinder(cskH + 0.01, SCREW_R, CSK_R, 32).translate([sx, H - 7, PLATE_T - cskH]));
  }
  return body.subtract(Manifold.union(cuts));
}

// --------------------------------------------------------------------- build

// manifold-3d objects live in WebAssembly memory and must be freed with
// delete(). The hanger layout makes thousands of temporary shapes, so rather
// than free each by hand, `scoped` records every shape made while `fn` runs
// (the same methods manifold-3d's own garbage collector wraps) and frees all
// of them except what `fn` returns. Without this each rebuild leaks ~7 MB.
const MADE_BY = {
  Manifold: {
    statics: ['cube', 'cylinder', 'sphere', 'extrude', 'revolve', 'union', 'difference', 'intersection', 'hull', 'compose'],
    methods: ['add', 'subtract', 'intersect', 'decompose', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'hull', 'slice', 'project'],
  },
  CrossSection: {
    statics: ['square', 'circle', 'union', 'difference', 'intersection', 'compose', 'ofPolygons', 'hull'],
    methods: ['add', 'subtract', 'intersect', 'rectClip', 'decompose', 'transform', 'translate', 'rotate', 'scale', 'mirror', 'simplify', 'offset', 'hull'],
  },
};

// Instance methods live on the prototype of the objects manifold-3d returns,
// not on the exported classes, so find it from a throwaway instance.
const instanceProtos = new WeakMap();
function protoOf(wasm, cls) {
  let protos = instanceProtos.get(wasm);
  if (!protos) {
    const m = wasm.Manifold.cube([1, 1, 1]);
    const c = wasm.CrossSection.square([1, 1]);
    protos = { Manifold: Object.getPrototypeOf(m), CrossSection: Object.getPrototypeOf(c) };
    m.delete(); c.delete();
    instanceProtos.set(wasm, protos);
  }
  return protos[cls];
}

function scoped(wasm, fn) {
  const made = [];
  const restore = [];
  const wrap = (target, names) => {
    for (const name of names) {
      const original = target[name];
      if (typeof original !== 'function') continue;
      target[name] = function (...args) {
        const out = original.apply(this, args);
        made.push(out);
        return out;
      };
      restore.push(() => { target[name] = original; });
    }
  };
  for (const [cls, { statics, methods }] of Object.entries(MADE_BY)) {
    wrap(wasm[cls], statics);
    wrap(protoOf(wasm, cls), methods);
  }
  let result;
  try {
    result = fn();
  } finally {
    for (const undo of restore) undo();
    for (const obj of made) {
      for (const o of Array.isArray(obj) ? obj : [obj]) if (o !== result && !o.isDeleted?.()) o.delete();
    }
  }
  return result;
}

const toOrigin = (m) => {
  const { min } = m.boundingBox();
  return m.translate([-min[0], -min[1], -min[2]]);
};

/** Build one print plate. Returns a manifold-3d Manifold, Z up, sitting on z = 0. */
export function build(wasm, raw) {
  return scoped(wasm, () => buildPlate(wasm, normalise(raw)));
}

function buildPlate(wasm, p) {
  const { Manifold } = wasm;
  if (p.parts === 'rail') {
    const rod = toOrigin(pole(wasm, p));
    const br = bracket(wasm, p);
    const y = rod.boundingBox().max[1] + 6;
    return Manifold.union([
      rod,
      br.translate([PLATE_W / 2, y, 0]),
      br.translate([PLATE_W * 1.5 + 8, y, 0]),
    ]);
  }
  return toOrigin(Manifold.extrude(hangerPlate(wasm, p), p.thickness));
}

/** One-line summary for the generator form; `box` is the model's bounding box. */
export function summary(raw, box) {
  const p = normalise(raw);
  const r = (n) => +n.toFixed(1);
  const size = box ? ` · ${r(box.max[0] - box.min[0])} × ${r(box.max[1] - box.min[1])} mm on the bed` : '';
  if (p.parts === 'rail') return `${r(poleLength(p))} mm pole · brackets ${PLATE_W} × ${r(p.poleDrop + 12)} mm${size}`;
  const n = p.count === 1 ? '1 hanger' : `${p.count} hangers`;
  return `${n}, ${r(p.hangerWidth)} mm wide, for a ${r(p.poleD)} mm pole${size}`;
}

export function fileName(raw) {
  const p = normalise(raw);
  if (p.parts === 'rail') return `hanging-rail-${+poleLength(p).toFixed(1)}mm-pole.stl`;
  return `hangers-${p.count}x-${+p.hangerWidth.toFixed(1)}mm.stl`;
}

/** Binary STL. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'hanging rail - evilprofessor.co.uk') {
  return writeStl(manifold, header);
}
