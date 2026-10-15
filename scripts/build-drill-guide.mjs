// Regenerates the default drill guide STL shown on /models/drill-guide/.
// Usage: node scripts/build-drill-guide.mjs [--holeDiameter=16 --height=15 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { buildDrillGuide, describe, toStl } from '../src/lib/models/drill-guide.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
const guide = buildDrillGuide(wasm, args);
const out = new URL('../public/models/drill-guide.stl', import.meta.url);
writeFileSync(out, Buffer.from(toStl(guide)));
const d = describe(args);
console.log(`Wrote ${out.pathname}: ${d.body}mm body, ${d.height}mm high, ${d.holeD}mm hole, ${d.footprint}mm footprint`);
