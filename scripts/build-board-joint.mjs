// Regenerates the default board joints STL shown on /models/board-joints/.
// Usage: node scripts/build-board-joint.mjs [--ply=5.5 --clearance=0.1 --parts=both ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { build, summary, toStl } from '../src/lib/models/board-joint.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
const joints = build(wasm, args);
const out = new URL('../public/models/board-joints.stl', import.meta.url);
writeFileSync(out, Buffer.from(toStl(joints)));
console.log(`Wrote ${out.pathname}: ${summary(args, joints.boundingBox())}`);
