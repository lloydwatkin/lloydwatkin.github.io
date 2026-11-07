// Parametric faux slate plaque: a blank that looks like a piece of hand-cut
// Welsh slate, for finisher medals, house signs and plaques. Add your own
// raised text or artwork in the slicer. Plain ESM so it runs both in the
// browser (the model page's generator form) and in Node
// (scripts/build-slate-plaque.mjs, which writes the default STL into
// public/models/).
//
// The slate is a heightfield: layered noise for the riven, split-layer face,
// shallow flaked-off scars and a few chisel marks, then a run of conchoidal
// (flint-knapped) flake scars along the edge, where each scar bites a rounded
// scoop out of the outline and dishes down into the face. The bottom edge
// stays straight so the plaque stands up, and the back is flat for the bed.
//
// Everything random comes from one seed, so the same numbers always make the
// same slate and a link reproduces it exactly.
//
// `wasm` is an initialised manifold-3d module: `const wasm = await Module(); wasm.setup()`.

import { toStl as writeStl } from './stl.js';

/** Every adjustable parameter, with defaults and limits for the form. Units are mm. */
export const parameters = [
  { key: 'width', label: 'Width', default: 150, min: 50, max: 250, step: 1 },
  { key: 'height', label: 'Height', default: 195, min: 60, max: 300, step: 1, help: 'Bottom to top. The bottom edge is kept straight so it stands up.' },
  { key: 'thickness', label: 'Thickness', default: 5, min: 3, max: 12, step: 0.1, help: 'At the highest point of the face.' },
  { key: 'texture', label: 'Texture depth', default: 0.9, min: 0, max: 2.5, step: 0.1, help: 'How rough the riven face is. 0 for a flat face.' },
  { key: 'chips', label: 'Edge chipping', default: 100, min: 0, max: 200, step: 5, unit: '%', help: 'Size of the knapped flake scars round the edge. 0 for a plain edge.' },
  { key: 'seed', label: 'Slate', default: 18, min: 1, max: 9999, step: 1, unit: '', help: 'Change this for a differently cut piece of slate.' },
  { key: 'hanger', label: 'Ribbon slot', default: 'yes', options: ['yes', 'no'], labels: { yes: 'Yes', no: 'No' }, help: 'A slot through the top for a medal ribbon.' },
  { key: 'stand', label: 'Stand slot', default: 'yes', options: ['yes', 'no'], labels: { yes: 'Yes', no: 'No' }, help: 'A groove in the back for the push-in stand.' },
  { key: 'parts', label: 'Parts', default: 'plaque', options: ['plaque', 'stand', 'both'], labels: { plaque: 'Plaque', stand: 'Stand', both: 'Plaque and stand' } },
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
  out.seed = Math.round(out.seed);
  out.texture = Math.min(out.texture, out.thickness * 0.4);
  return out;
}

/** Derived sizes shared by the plaque and the stand. */
export function describe(raw) {
  const p = normalise(raw);
  const finT = 4; // stand fin thickness
  const clearance = 0.15; // each side of the fin in the groove
  const grooveDepth = Math.min(2.6, p.thickness * 0.52);
  const grooveY0 = 4;
  const grooveY1 = grooveY0 + Math.min(70, Math.max(20, p.height * 0.32));
  return { ...p, finT, clearance, grooveDepth, grooveY0, grooveY1 };
}

// ---------- seeded randomness ----------
function makeRng(seed) {
  let a = (seed * 2654435761) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const uniform = (lo = 0, hi = 1) => lo + (hi - lo) * next();
  let spare = null;
  const normal = () => {
    if (spare != null) { const s = spare; spare = null; return s; }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  return { uniform, normal };
}

// ---------- Gaussian blur (1D wrapped, 2D separable with mirrored edges) ----------
function kernel(sigma) {
  const r = Math.max(1, Math.ceil(sigma * 4));
  const k = new Float64Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) s += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return { k, r };
}

function mirror(i, n) {
  if (n === 1) return 0;
  const period = 2 * n;
  i = ((i % period) + period) % period;
  return i < n ? i : period - 1 - i;
}

function blurWrap(src, sigma) {
  if (sigma <= 0) return src;
  const n = src.length;
  const { k, r } = kernel(sigma);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = -r; j <= r; j++) s += src[(((i + j) % n) + n) % n] * k[j + r];
    out[i] = s;
  }
  return out;
}

function blur2d(src, nx, ny, sy, sx) {
  let a = src;
  if (sx > 0) {
    const { k, r } = kernel(sx);
    const out = new Float64Array(nx * ny);
    for (let y = 0; y < ny; y++) {
      const row = y * nx;
      for (let x = 0; x < nx; x++) {
        let s = 0;
        for (let j = -r; j <= r; j++) s += a[row + mirror(x + j, nx)] * k[j + r];
        out[row + x] = s;
      }
    }
    a = out;
  }
  if (sy > 0) {
    const { k, r } = kernel(sy);
    const out = new Float64Array(nx * ny);
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        let s = 0;
        for (let j = -r; j <= r; j++) s += a[mirror(y + j, ny) * nx + x] * k[j + r];
        out[y * nx + x] = s;
      }
    }
    a = out;
  }
  return a;
}

function normalised(a) {
  let lo = Infinity, hi = -Infinity;
  for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const out = new Float64Array(a.length);
  const d = hi - lo || 1;
  for (let i = 0; i < a.length; i++) out[i] = (a[i] - lo) / d;
  return out;
}

// ---------- outline ----------

/** Dense rounded rectangle, resampled to even spacing. Returns points and tangents. */
function roundedRectSamples(W, H, r, spacing) {
  const poly = [];
  const corners = [[W - r, r, -90], [W - r, H - r, 0], [r, H - r, 90], [r, r, 180]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 24; i++) {
      const a = ((a0 + (90 * i) / 24) * Math.PI) / 180;
      poly.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  const segs = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    return { p, q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  });
  const length = segs.reduce((s, x) => s + x.len, 0);
  const at = (t) => {
    t = ((t % length) + length) % length;
    for (const s of segs) {
      if (t <= s.len) {
        const f = s.len ? t / s.len : 0;
        return [s.p[0] + (s.q[0] - s.p[0]) * f, s.p[1] + (s.q[1] - s.p[1]) * f, (s.q[0] - s.p[0]) / (s.len || 1), (s.q[1] - s.p[1]) / (s.len || 1)];
      }
      t -= s.len;
    }
    return [...poly[0], 1, 0];
  };
  const n = Math.round(length / spacing);
  return { length, at, n };
}

/** The chipped outline as a CrossSection, plus the scar list for the face. */
function makeOutline(wasm, p, rng) {
  const { CrossSection } = wasm;
  const W = p.width, H = p.height;
  const cx = W / 2, cy = H / 2;
  const spacing = 0.285;
  const rr = roundedRectSamples(W, H, 3, spacing);
  const N = rr.n;

  const noise = (sigmaMm, amp) => {
    const raw = Float64Array.from({ length: N }, () => rng.normal());
    const v = blurWrap(raw, sigmaMm / spacing);
    let m = 0;
    for (const x of v) m = Math.max(m, Math.abs(x));
    return v.map((x) => (x / (m || 1)) * amp);
  };
  // A gently wavy, dressed edge, only ever cut inwards so the size stays put.
  const n1 = noise(11.4, 1.2), n2 = noise(3.4, 0.5);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const [x, y] = rr.at((i / N) * rr.length);
    const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1;
    const d = Math.min(n1[i] + n2[i] - 0.4, 0);
    pts.push([x + (dx / l) * d, y + (dy / l) * d]);
  }
  let outline = CrossSection.ofPolygons([pts], 'EvenOdd');

  // Conchoidal flake scars: overlapping rounded scoops along the edge.
  const scars = [];
  const chip = p.chips / 100;
  if (chip > 0) {
    const bites = [];
    let t = rng.uniform(0, 3);
    while (t < rr.length) {
      const R = Math.exp(rng.uniform(Math.log(1.6), Math.log(8.0))) * chip;
      const [x, y, tx, ty] = rr.at(t);
      let ox = ty, oy = -tx;
      if (ox * (x - cx) + oy * (y - cy) < 0) { ox = -ox; oy = -oy; }
      const nearSlot = p.hanger === 'yes' && y > H - 4 && Math.abs(x - W / 2) < 22;
      const keep = rng.uniform() < 0.9;
      const k = rng.uniform(0.3, 0.85);
      const sx = rng.uniform(1.0, 1.8), sy = rng.uniform(0.75, 1.0);
      const depth = rng.uniform(0.9, 2.0);
      if (y > 1.5 && !nearSlot && keep && R > 0.3) {
        const c = [x + ox * R * k, y + oy * R * k];
        const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
        bites.push(CrossSection.circle(R, 32).scale([sx, sy]).rotate(ang).translate(c));
        scars.push({ c, R, D: depth * Math.min(1, chip) });
      }
      t += Math.max(R, 0.8) * rng.uniform(0.5, 1.5);
    }
    if (bites.length) {
      const cut = CrossSection.union(bites);
      outline = outline.subtract(cut);
    }
    // Soften the arêtes a touch and get rid of pinch points.
    outline = outline.offset(0.25, 'Round', 2, 16).offset(-0.25, 'Round', 2, 16)
      .offset(-0.15, 'Round', 2, 16).offset(0.15, 'Round', 2, 16);
  }
  // A straight bottom edge to stand on, and nothing outside the stated size.
  outline = outline.add(CrossSection.square([W - 8, 6]).translate([4, 0]))
    .intersect(CrossSection.square([W, H]));
  const pieces = outline.decompose();
  // Drop near-duplicate points left by the offsets: they make slivers that an
  // STL (single precision) can't represent cleanly.
  outline = pieces.reduce((a, b) => (b.area() > a.area() ? b : a)).simplify(0.02);
  return { outline, scars };
}

// ---------- rasterising the outline ----------
function insideMask(polys, xs, ys) {
  const nx = xs.length, ny = ys.length;
  const x0 = xs[0], dx = xs[1] - xs[0], y0 = ys[0], dy = ys[1] - ys[0];
  const crossings = Array.from({ length: ny }, () => []);
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      if (ay === by) continue;
      const lo = Math.min(ay, by), hi = Math.max(ay, by);
      const j0 = Math.max(0, Math.ceil((lo - y0) / dy)), j1 = Math.min(ny - 1, Math.floor((hi - y0) / dy));
      for (let j = j0; j <= j1; j++) {
        const y = y0 + j * dy;
        if (y < lo || y >= hi) continue;
        crossings[j].push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
  }
  const mask = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const c = crossings[j].sort((a, b) => a - b);
    for (let k = 0; k + 1 < c.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((c[k] - x0) / dx)), i1 = Math.min(nx - 1, Math.floor((c[k + 1] - x0) / dx));
      for (let i = i0; i <= i1; i++) mask[j * nx + i] = 1;
    }
  }
  return mask;
}

/** Approximate Euclidean distance (in cells) from each inside cell to the outside. */
function chamferDistance(mask, nx, ny) {
  const INF = 1e9, D1 = 1, D2 = Math.SQRT2;
  const d = new Float64Array(nx * ny);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? INF : 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = y * nx + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + D1); else v = Math.min(v, D1);
    if (y > 0) {
      v = Math.min(v, d[i - nx] + D1);
      if (x > 0) v = Math.min(v, d[i - nx - 1] + D2);
      if (x < nx - 1) v = Math.min(v, d[i - nx + 1] + D2);
    } else v = Math.min(v, D1);
    d[i] = v;
  }
  for (let y = ny - 1; y >= 0; y--) for (let x = nx - 1; x >= 0; x--) {
    const i = y * nx + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x < nx - 1) v = Math.min(v, d[i + 1] + D1); else v = Math.min(v, D1);
    if (y < ny - 1) {
      v = Math.min(v, d[i + nx] + D1);
      if (x < nx - 1) v = Math.min(v, d[i + nx + 1] + D2);
      if (x > 0) v = Math.min(v, d[i + nx - 1] + D2);
    } else v = Math.min(v, D1);
    d[i] = v;
  }
  return d;
}

// ---------- the plaque ----------
function buildPlaque(wasm, p) {
  const { Manifold, Mesh, CrossSection } = wasm;
  const W = p.width, H = p.height, T = p.thickness;
  const rng = makeRng(p.seed);
  const { outline, scars } = makeOutline(wasm, p, rng);

  // Grid, offset by an odd fraction so it never lines up with the outline.
  const RES = Math.max(0.4, Math.sqrt((W * H) / 160000));
  const nx = Math.round((W + 1) / RES) + 1, ny = Math.round((H + 1) / RES) + 1;
  const xs = Float64Array.from({ length: nx }, (_, i) => -0.513 + (i * (W + 1)) / (nx - 1));
  const ys = Float64Array.from({ length: ny }, (_, j) => -0.517 + (j * (H + 1)) / (ny - 1));
  const res = xs[1] - xs[0];
  const n = nx * ny;
  const field = (sy, sx) => normalised(blur2d(Float64Array.from({ length: n }, () => rng.normal()), nx, ny, sy / res, sx / res));

  // Riven face: horizontal split layers, long undulations, grit and cross-grain.
  const strata = field(0.8, 5.6), swell = field(2.4, 12), grit = field(0.48, 0.48), cross = field(4.8, 2.0);
  let h = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = 0.45 * strata[i] + 0.3 * swell[i] + 0.1 * grit[i] + 0.15 * cross[i];
    h[i] = (Math.round(v * 7) / 7) * 0.7 + 0.3 * v; // terraces where layers have split away
  }
  const areaScale = (W * H) / 13000;
  const cellRange = (lo, hi, axis) => {
    const a = axis === 'x' ? xs : ys;
    const i0 = Math.max(0, Math.floor((lo - a[0]) / res)), i1 = Math.min(a.length - 1, Math.ceil((hi - a[0]) / res));
    return [i0, i1];
  };
  // Flaked-off scars: shallow, irregular, elongated depressions.
  for (let s = Math.round(50 * areaScale); s > 0; s--) {
    const x0 = rng.uniform(0, W), y0 = rng.uniform(0, H);
    const ax = rng.uniform(1.5, 7), ay = rng.uniform(0.8, 3.5), th = rng.uniform(-0.4, 0.4), dep = rng.uniform(0.08, 0.22);
    const c = Math.cos(th), sn = Math.sin(th), R = Math.max(ax, ay);
    const [i0, i1] = cellRange(x0 - R, x0 + R, 'x'), [j0, j1] = cellRange(y0 - R, y0 + R, 'y');
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = xs[i] - x0, dy = ys[j] - y0;
      const u = (dx * c + dy * sn) / ax, v = (-dx * sn + dy * c) / ay;
      if (u * u + v * v < 1) h[j * nx + i] -= dep;
    }
  }
  // Chisel marks: a few thin straight scratches.
  for (let s = Math.round(14 * areaScale); s > 0; s--) {
    const x0 = rng.uniform(5, W - 5), y0 = rng.uniform(5, H - 5);
    const th = rng.uniform(-0.5, 0.5) + (rng.uniform() < 0.25 ? Math.PI / 2 : 0);
    const L = rng.uniform(6, 22);
    const c = Math.cos(th), sn = Math.sin(th);
    const [i0, i1] = cellRange(x0 - L / 2, x0 + L / 2, 'x'), [j0, j1] = cellRange(y0 - L / 2, y0 + L / 2, 'y');
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = xs[i] - x0, dy = ys[j] - y0;
      if (Math.abs(-dx * sn + dy * c) < 0.35 && Math.abs(dx * c + dy * sn) < L / 2) h[j * nx + i] -= 0.12;
    }
  }
  h = normalised(blur2d(h, nx, ny, 0.2 / res, 0.2 / res));

  // The edge flake scars dish down into the face, with soft ridges between them.
  let dep = new Float64Array(n);
  for (const { c, R, D } of scars) {
    const Rs = R * rng.uniform(1.6, 2.6);
    const [i0, i1] = cellRange(c[0] - Rs, c[0] + Rs, 'x'), [j0, j1] = cellRange(c[1] - Rs, c[1] + Rs, 'y');
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const r = Math.hypot(xs[i] - c[0], ys[j] - c[1]);
      if (r < Rs) {
        const v = D * Math.pow(1 - r / Rs, 1.3), k = j * nx + i;
        if (v > dep[k]) dep[k] = v;
      }
    }
  }
  // A soft roll-off right at the edge, so plain stretches aren't knife-sharp.
  const mask = insideMask(outline.toPolygons(), xs, ys);
  const edge = chamferDistance(mask, nx, ny);
  for (let i = 0; i < n; i++) {
    const t = Math.max(0, 1 - (edge[i] * res) / 2.0);
    dep[i] = Math.max(dep[i], 0.5 * t * t);
  }
  dep = blur2d(dep, nx, ny, 0.2 / res, 0.2 / res);

  const tex = p.texture;
  const base = T - tex;
  const groove = describe(p).grooveDepth;
  const floor = Math.max(T * 0.48, p.stand === 'yes' ? groove + 0.8 : 0);
  const Z = new Float32Array(n);
  for (let i = 0; i < n; i++) Z[i] = Math.max(floor, base + h[i] * tex * 0.97 - dep[i]);

  // Closed heightfield solid: the textured top, four walls, and a fan for the flat bottom.
  const ring = [];
  for (let i = 0; i < nx; i++) ring.push(i);
  for (let j = 1; j < ny; j++) ring.push(j * nx + nx - 1);
  for (let i = nx - 2; i >= 0; i--) ring.push((ny - 1) * nx + i);
  for (let j = ny - 2; j >= 1; j--) ring.push(j * nx);
  const nv = n + ring.length + 1;
  const vp = new Float32Array(nv * 3);
  for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
    vp[k * 3] = xs[i]; vp[k * 3 + 1] = ys[j]; vp[k * 3 + 2] = Z[k];
  }
  ring.forEach((g, r) => {
    const k = n + r;
    vp[k * 3] = vp[g * 3]; vp[k * 3 + 1] = vp[g * 3 + 1]; vp[k * 3 + 2] = -1;
  });
  const centre = nv - 1;
  vp[centre * 3] = (xs[0] + xs[nx - 1]) / 2; vp[centre * 3 + 1] = (ys[0] + ys[ny - 1]) / 2; vp[centre * 3 + 2] = -1;
  const tris = new Uint32Array(((nx - 1) * (ny - 1) * 2 + ring.length * 3) * 3);
  let o = 0;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
    tris[o++] = a; tris[o++] = b; tris[o++] = c;
    tris[o++] = a; tris[o++] = c; tris[o++] = d;
  }
  for (let r = 0; r < ring.length; r++) {
    const p0 = ring[r], q0 = ring[(r + 1) % ring.length];
    const p1 = n + r, q1 = n + ((r + 1) % ring.length);
    tris[o++] = p0; tris[o++] = p1; tris[o++] = q0;
    tris[o++] = q0; tris[o++] = p1; tris[o++] = q1;
    tris[o++] = centre; tris[o++] = q1; tris[o++] = p1;
  }
  const slab = Manifold.ofMesh(new Mesh({ numProp: 3, vertProperties: vp, triVerts: tris }));

  const body = outline.extrude(T + 2);
  let plaque = slab.intersect(body);
  slab.delete(); body.delete();

  if (p.hanger === 'yes') {
    const len = Math.min(20, W * 0.2), rad = 2.4;
    const slot = CrossSection.hull([CrossSection.circle(rad, 32).translate([W / 2 - len / 2, H - 6]), CrossSection.circle(rad, 32).translate([W / 2 + len / 2, H - 6])]);
    plaque = plaque.subtract(slot.extrude(T + 4).translate([0, 0, -1]));
  }
  if (p.stand === 'yes') {
    const d = describe(p);
    const w = d.finT + 2 * d.clearance;
    plaque = plaque.subtract(Manifold.cube([w, d.grooveY1 - d.grooveY0, d.grooveDepth + 1]).translate([W / 2 - w / 2, d.grooveY0, -1]));
  }
  return plaque.simplify(0.01);
}

// ---------- the push-in stand ----------
/** A flat right-angled fin. Its tab pushes into the groove; prints lying flat. */
function buildStand(wasm, p) {
  const { CrossSection } = wasm;
  const d = describe(p);
  const c = 0.2;
  const finH = d.grooveY1 + 6;
  const finL = Math.max(50, p.height * 0.38);
  const tab = CrossSection.square([d.grooveDepth - 0.2 + 0.01, d.grooveY1 - d.grooveY0 - 2 * c]).translate([-(d.grooveDepth - 0.2), d.grooveY0 + c]);
  const fin = CrossSection.ofPolygons([[[0, 0], [finL, 0], [finL, 3], [8, finH], [0, finH]]]);
  const hole = CrossSection.ofPolygons([[[7, 7], [finL - 12, 7], [7, finH - 14]]]).offset(-1, 'Round', 2, 24).offset(3, 'Round', 2, 24);
  const shape = tab.add(fin).subtract(hole)
    .offset(0.8, 'Round', 2, 24).offset(-0.8, 'Round', 2, 24)
    .intersect(CrossSection.square([finL + 20, finH + 20]).translate([-10, 0]))
    .simplify(0.02);
  return shape.extrude(d.finT);
}

/** Build the chosen part(s). Returns a manifold-3d Manifold, Z up, on z = 0. */
export function buildSlatePlaque(wasm, raw) {
  const p = normalise(raw);
  if (p.parts === 'stand') return placeOnBed(buildStand(wasm, p));
  const plaque = placeOnBed(buildPlaque(wasm, p));
  if (p.parts === 'plaque') return plaque;
  const stand = buildStand(wasm, p);
  const sb = stand.boundingBox();
  const both = wasm.Manifold.compose([plaque, stand.translate([p.width + 8 - sb.min[0], -sb.min[1], -sb.min[2]])]);
  plaque.delete(); stand.delete();
  return both;
}

function placeOnBed(m) {
  const b = m.boundingBox();
  return m.translate([0, 0, -b.min[2]]);
}

/** One-line summary for the generator form. */
export function summary(raw, box) {
  const p = normalise(raw);
  const n = (x) => +x.toFixed(1);
  const plaque = `${n(p.width)} × ${n(p.height)} mm slate, ${n(p.thickness)} mm thick`;
  if (p.parts === 'stand') return `Stand for a ${n(p.width)} × ${n(p.height)} mm plaque, ${box ? `${n(box.max[0] - box.min[0])} × ${n(box.max[1] - box.min[1])} mm` : ''}`.trim();
  if (p.parts === 'both') return `${plaque}, plus its stand${box ? `. Plate ${n(box.max[0] - box.min[0])} × ${n(box.max[1] - box.min[1])} mm` : ''}`;
  return plaque;
}

/** Common entry point used by the generator form. */
export const build = buildSlatePlaque;

export function fileName(raw) {
  const p = normalise(raw);
  const part = p.parts === 'plaque' ? '' : p.parts === 'stand' ? '-stand' : '-with-stand';
  return `slate-plaque-${p.width}x${p.height}-s${p.seed}${part}.stl`;
}

/** Binary STL. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'faux slate plaque - evilprofessor.co.uk') {
  return writeStl(manifold, header);
}
