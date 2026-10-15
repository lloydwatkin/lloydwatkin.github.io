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

// ---------------------------------------------------------------------------
// Swansea Valley skyline: the view north-east up Cwm Tawe from above Ystalyfera.
// Control points are placed from the landmarks' positions and heights on a
// 1600-wide canvas (y grows downwards), then smoothed like the generated ridges.
// Furthest to nearest:
//   0  Black Mountain escarpment: Fan Brycheiniog, the col at the head of the
//      Tawe, Fan Gyhirych, Fan Nedd
//   1  Hills above Ystradgynlais, then Cribarth (the Sleeping Giant) above Abercraf
//   2–3 Valley sides closing into the V of the Tawe
//   4  Hillside with stepped terraces
//   5  Foreground fields
// ---------------------------------------------------------------------------

export interface ValleyLayer extends RidgeLayer {
  /** Extra filled shapes on this layer (terraced houses) */
  extras: string[];
  /** Lit windows as [x, y] in viewBox units */
  windows: Pt[];
  /** Named hills on this layer, anchored at the summit in viewBox units */
  labels: HillLabel[];
}

export interface HillLabel {
  x: number;
  y: number;
  name: string;
  /** Second line, e.g. height */
  note: string;
}

const VALLEY_W = 1600;
const VALLEY_H = 900;

const VALLEY: { pts: Pt[]; texture: number; terraces?: boolean; labels?: HillLabel[] }[] = [
  {
    pts: [[0,398],[150,388],[300,370],[420,346],[520,322],[600,304],[650,297],[700,302],[732,328],[768,352],[840,367],[900,361],[960,338],[1030,318],[1080,313],[1130,321],[1200,341],[1280,352],[1330,343],[1372,347],[1450,368],[1600,382]],
    texture: 0,
    labels: [
      { x: 650, y: 297, name: 'Fan Brycheiniog', note: '802 m' },
      { x: 1080, y: 313, name: 'Fan Gyhirych', note: '725 m' },
      { x: 1335, y: 343, name: 'Fan Nedd', note: '663 m' },
    ],
  },
  {
    pts: [[0,442],[120,433],[260,441],[400,459],[520,479],[620,500],[700,513],[780,520],[880,506],[950,484],[995,460],[1018,446],[1036,452],[1052,443],[1072,449],[1098,462],[1170,471],[1250,468],[1310,456],[1350,445],[1386,451],[1430,469],[1520,480],[1600,478]],
    texture: 0,
    labels: [{ x: 1040, y: 444, name: 'Cribarth', note: 'the Sleeping Giant · 428 m' }],
  },
  { pts: [[0,502],[140,506],[280,522],[420,549],[560,586],[680,618],[780,636],[860,641],[940,631],[1040,607],[1160,581],[1280,561],[1420,549],[1600,541]], texture: 3 },
  { pts: [[0,562],[120,567],[260,591],[400,631],[520,671],[620,700],[700,716],[780,722],[860,716],[960,694],[1080,664],[1200,641],[1330,625],[1460,616],[1600,611]], texture: 4 },
  { pts: [[0,684],[200,702],[420,740],[600,777],[760,798],[900,800],[1040,782],[1200,750],[1340,728],[1480,714],[1600,708]], texture: 2, terraces: true },
  { pts: [[0,806],[200,816],[450,842],[700,862],[950,866],[1200,851],[1400,838],[1600,832]], texture: 5 },
];

function lerpY(pts: Pt[], x: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1));
  }
  return pts[pts.length - 1][1];
}

/** Resample a layer and roughen it slightly so near slopes read as woodland. */
function roughen(ctrl: Pt[], texture: number, seed: number): Pt[] {
  if (!texture) return ctrl;
  const rand = mulberry32(seed);
  const out: Pt[] = [];
  for (let x = 0; x <= VALLEY_W; x += 20) {
    const bump = (rand() - 0.5) * texture * 2 + Math.sin(x / 37 + seed) * texture * 0.6;
    out.push([x, lerpY(ctrl, x) - Math.abs(bump)]);
  }
  return out;
}

/** Rows of terraced houses stepping down the slope, with chimneys and a few lit windows. */
function terraces(ctrl: Pt[]): { d: string; windows: Pt[] } {
  const rand = mulberry32(42);
  // Left-hand side of the valley, stepping down towards the river.
  const rows: [number, number][] = [[150, 6], [310, 7], [480, 6]];
  const w = 22;
  let d = '';
  const windows: Pt[] = [];
  for (const [x0, n] of rows) {
    const len = n * w;
    const ground = Math.min(lerpY(ctrl, x0), lerpY(ctrl, x0 + len)) + 6;
    const top = ground - 22;
    d += `M${x0},${ground + 60}L${x0},${top}L${x0 + len},${top}L${x0 + len},${ground + 60}Z`;
    for (let k = 0; k <= n; k++) {
      const cx = x0 + k * w - 2;
      if (k > 0 && k < n) d += `M${cx},${top}L${cx},${top - 7}L${cx + 5},${top - 7}L${cx + 5},${top}Z`;
      if (k < n && rand() < 0.4) windows.push([x0 + k * w + 7, top + 9]);
    }
  }
  return { d, windows };
}

/** The Swansea Valley scene on a 1600×900 viewBox. */
export function makeValleyRidges(contours = 3): ValleyLayer[] {
  const n = VALLEY.length;
  return VALLEY.map((layer, i) => {
    const t = i / (n - 1);
    const pts = roughen(layer.pts, layer.texture, 7 + i * 31);
    const baseY = layer.pts.reduce((s, p) => s + p[1], 0) / layer.pts.length;
    const lines: string[] = [];
    for (let c = 1; c <= contours; c++) {
      const k = c * (10 + 6 * t);
      const flatten = 1 - c * 0.14;
      lines.push(smooth(pts.map(([x, y]): Pt => [x, baseY + (y - baseY) * flatten + k])));
    }
    const house = layer.terraces ? terraces(layer.pts) : null;
    return {
      fill: `${smooth(pts)}L${VALLEY_W},${VALLEY_H}L0,${VALLEY_H}Z`,
      contours: lines,
      depth: 1 - t,
      extras: house ? [house.d] : [],
      windows: house ? house.windows : [],
      labels: layer.labels ?? [],
    };
  });
}
