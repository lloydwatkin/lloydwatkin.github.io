// Regenerates the default under-desk shelf connector STLs shown on
// /models/under-desk-shelf-connectors/: one set on a plate, plus each part.
// Usage: node scripts/build-under-desk-shelf.mjs [--shelf=5 --hangerLength=120 --threadD=20 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { build, summary, toStl } from '../src/lib/models/under-desk-shelf.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
for (const [parts, name] of [
  ['set', 'under-desk-shelf-connectors.stl'],
  ['support', 'under-desk-shelf-support.stl'],
  ['hanger', 'under-desk-shelf-hanger.stl'],
  ['bracket', 'under-desk-shelf-bracket.stl'],
]) {
  const model = build(wasm, { ...args, parts });
  const out = new URL(`../public/models/${name}`, import.meta.url);
  writeFileSync(out, Buffer.from(toStl(model)));
  console.log(`Wrote ${out.pathname}: ${summary({ ...args, parts }, model.boundingBox())}`);
}
