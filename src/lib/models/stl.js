// Binary STL writer shared by the parametric models.

/** Binary STL from a manifold-3d Manifold. Returns an ArrayBuffer. */
export function toStl(manifold, header = 'evilprofessor.co.uk') {
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
