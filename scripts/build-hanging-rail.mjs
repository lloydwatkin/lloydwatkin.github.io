// Regenerates the default hanging rail STLs shown on /models/hanging-rail/:
// public/models/hanging-rail-hangers.stl and public/models/hanging-rail-pole.stl.
// Usage: node scripts/build-hanging-rail.mjs [--count=8 --hangerWidth=100 --poleD=10 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { build, summary, toStl, poleFits } from '../src/lib/models/hanging-rail.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
for (const [parts, name] of [['hangers', 'hanging-rail-hangers.stl'], ['rail', 'hanging-rail-pole.stl']]) {
  const model = build(wasm, { ...args, parts });
  const out = new URL(`../public/models/${name}`, import.meta.url);
  writeFileSync(out, Buffer.from(toStl(model)));
  console.log(`Wrote ${out.pathname}: ${summary({ ...args, parts }, model.boundingBox())}`);
}
if (!poleFits(wasm, args)) console.warn('Warning: the pole cannot get past the hook tip with these settings.');
