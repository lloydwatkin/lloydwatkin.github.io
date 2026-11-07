// Regenerates the default faux slate plaque STLs shown on /models/slate-plaque/.
// Usage: node scripts/build-slate-plaque.mjs [--width=150 --height=195 --seed=18 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { buildSlatePlaque, summary, toStl } from '../src/lib/models/slate-plaque.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
for (const [parts, name] of [['plaque', 'slate-plaque.stl'], ['stand', 'slate-plaque-stand.stl']]) {
  const t0 = performance.now();
  const shape = buildSlatePlaque(wasm, { ...args, parts });
  const out = new URL(`../public/models/${name}`, import.meta.url);
  writeFileSync(out, Buffer.from(toStl(shape)));
  console.log(`Wrote ${out.pathname}: ${summary({ ...args, parts }, shape.boundingBox())}, ${shape.numTri()} triangles, ${shape.status()}, ${Math.round(performance.now() - t0)} ms`);
  shape.delete();
}
