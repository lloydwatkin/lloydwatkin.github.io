// Regenerates the default toy horse jump STLs shown on /models/horse-jumps/:
// public/models/horse-jumps-stands.stl, horse-jumps-cups.stl and horse-jumps-pole.stl.
// Usage: node scripts/build-horse-jumps.mjs [--bed=260 --poleD=10 --height=200 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { build, summary, toStl } from '../src/lib/models/horse-jumps.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
for (const parts of ['stands', 'cups', 'pole']) {
  const model = build(wasm, { ...args, parts });
  const out = new URL(`../public/models/horse-jumps-${parts}.stl`, import.meta.url);
  writeFileSync(out, Buffer.from(toStl(model)));
  console.log(`Wrote ${out.pathname}: ${summary({ ...args, parts }, model.boundingBox())} · genus ${model.genus()} · ${model.status()}`);
}
