// Deterministic ridgeline generator. Produces smooth SVG paths that look like
// layered hills, plus offset "contour" lines that follow each ridge.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];

function ridgePoints(width: number, baseY: number, amp: number, seed: number, steps = 48): Pt[] {
  const rand = mulberry32(seed);
  // A few sine octaves with random phases gives believable, rolling hills.
  const octaves = [
    { f: 1.1 + rand() * 0.6, a: 1, p: rand() * Math.PI * 2 },
    { f: 2.7 + rand() * 1.2, a: 0.45, p: rand() * Math.PI * 2 },
    { f: 6.3 + rand() * 2.0, a: 0.16, p: rand() * Math.PI * 2 },
    { f: 13 + rand() * 4, a: 0.05, p: rand() * Math.PI * 2 },
  ];
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const t = i / steps;
    let y = 0;
    for (const o of octaves) y += Math.sin(t * o.f * Math.PI + o.p) * o.a;
    pts.push([x, baseY - y * amp]);
  }
  return pts;
}

/** Catmull-Rom spline through the points, as SVG cubic beziers. */
function smooth(pts: Pt[]): string {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export interface RidgeLayer {
  fill: string;
  contours: string[];
  depth: number;
}

export function makeRidges(opts: {
  width: number;
  height: number;
  layers: number;
  seed: number;
  /** Fraction of height where the furthest ridge sits */
  top?: number;
  /** Fraction of height where the nearest ridge sits */
  bottom?: number;
  contours?: number;
}): RidgeLayer[] {
  const { width, height, layers, seed, top = 0.42, bottom = 0.86, contours = 3 } = opts;
  const out: RidgeLayer[] = [];
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 1 : i / (layers - 1);
    const baseY = height * (top + (bottom - top) * t);
    const amp = Math.min(height, 900) * (0.07 + 0.06 * t);
    const pts = ridgePoints(width, baseY, amp, seed * 97 + i * 13);
    const ridge = smooth(pts);
    const fill = `${ridge}L${width},${height}L0,${height}Z`;
    const lines: string[] = [];
    for (let c = 1; c <= contours; c++) {
      // Contours sit below the ridge and flatten out as they go down.
      const k = c * (10 + 6 * t);
      const flatten = 1 - c * 0.14;
      const shifted = pts.map(([x, y]): Pt => [x, baseY + (y - baseY) * flatten + k]);
      lines.push(smooth(shifted));
    }
    out.push({ fill, contours: lines, depth: 1 - t });
  }
  return out;
}
