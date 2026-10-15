// Parametric drill guide. Plain ESM so it runs both in the browser (the model
// page's generator form) and in Node (scripts/build-drill-guide.mjs, which
// writes the default STL into public/models/).
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'holeDiameter', label: 'Hole diameter', default: 16, min: 1, max: 60, step: 0.5, help: 'Drill bit size.' },
  { key: 'clearance', label: 'Hole clearance', default: 0, min: 0, max: 2, step: 0.05, help: 'Added to the hole. Printed holes come out a little small; try 0.2–0.4 if the bit binds.' },
  { key: 'height', label: 'Height', default: 15, min: 3, max: 100, step: 1, help: 'Overall height. Taller keeps the bit straighter.' },
  { key: 'wall', label: 'Wall thickness', default: 6, min: 1.5, max: 30, step: 0.5, help: 'Material around the hole.' },
  { key: 'shape', label: 'Body shape', default: 'square', options: ['square', 'round'], help: 'Square is quicker to slice and print; round matches the original sketch.' },
  { key: 'feet', label: 'Number of feet', default: 4, min: 3, max: 8, step: 1, help: 'Feet are spaced evenly. With 4, the notches form a cross-hair.' },
  { key: 'footLength', label: 'Foot length', default: 18, min: 0, max: 80, step: 1, help: 'How far each foot sticks out past the body.' },
  { key: 'footWidth', label: 'Foot width', default: 12, min: 4, max: 40, step: 1 },
  { key: 'footThickness', label: 'Foot thickness', default: 3, min: 1, max: 15, step: 0.5 },
  { key: 'notch', label: 'Alignment notch depth', default: 3, min: 0, max: 10, step: 0.5, help: 'V-notch at each foot tip, in line with the hole centre. 0 for none.' },
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
  out.feet = Math.round(out.feet);
  out.footThickness = Math.min(out.footThickness, out.height);
  out.notch = Math.min(out.notch, out.footWidth / 1.25); // the V opens 0.6×depth each side, so keep it inside the foot
  return out;
}

/** Build the guide. Returns a manifold-3d Manifold, Z up, sitting on z = 0. */
export function buildDrillGuide(wasm, raw) {
  const p = normalise(raw);
  const { Manifold, CrossSection } = wasm;
  const holeD = p.holeDiameter + p.clearance;
  const body = holeD + 2 * p.wall;
  const half = body / 2;

  const block = p.shape === 'round'
    ? Manifold.cylinder(p.height, half, half, 128)
    : Manifold.cube([body, body, p.height], true).translate([0, 0, p.height / 2]);

  // One foot along +X starting at the centre, with a V notch at its tip.
  const len = half + p.footLength;
  const w = p.footWidth / 2;
  const n = p.notch;
  const outline = n > 0
    ? [[0, -w], [len, -w], [len, -n * 0.6], [len - n, 0], [len, n * 0.6], [len, w], [0, w]]
    : [[0, -w], [len, -w], [len, w], [0, w]];
  const foot = Manifold.extrude(new CrossSection([outline]), p.footThickness);
  const feet = Array.from({ length: p.feet }, (_, i) => foot.rotate([0, 0, (360 / p.feet) * i]));

  const hole = Manifold.cylinder(p.height + 2, holeD / 2, holeD / 2, 128).translate([0, 0, -1]);
  return Manifold.union([block, ...feet]).subtract(hole);
}

/** Summary numbers for display. */
export function describe(raw) {
  const p = normalise(raw);
  const holeD = p.holeDiameter + p.clearance;
  const body = holeD + 2 * p.wall;
  return { holeD, body, footprint: body + 2 * p.footLength, height: p.height };
}

export function fileName(raw) {
  const p = normalise(raw);
  return `drill-guide-${+(p.holeDiameter + p.clearance).toFixed(2)}mm-${p.height}h.stl`;
}

/** Binary STL from a Manifold. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'drill guide - evilprofessor.co.uk') {
  const { vertProperties: v, triVerts: t, numProp: np } = manifold.getMesh();
  const tris = t.length / 3;
  const buf = new ArrayBuffer(84 + tris * 50);
  const view = new DataView(buf);
  for (let i = 0; i < Math.min(header.length, 80); i++) view.setUint8(i, header.charCodeAt(i) & 0x7f);
  view.setUint32(80, tris, true);
  let o = 84;
  const p = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < tris; i++) {
    for (let k = 0; k < 3; k++) {
      const j = t[i * 3 + k] * np;
      p[k][0] = v[j]; p[k][1] = v[j + 1]; p[k][2] = v[j + 2];
    }
    const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2];
    const bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1;
    for (const x of [nx / l, ny / l, nz / l, ...p[0], ...p[1], ...p[2]]) { view.setFloat32(o, x, true); o += 4; }
    o += 2;
  }
  return buf;
}
