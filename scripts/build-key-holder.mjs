// Regenerates the default window key holder STL shown on /models/window-key-holder/.
// Usage: node scripts/build-key-holder.mjs [--slotWidth=20 --slotDepth=5 --height=30 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { buildKeyHolder, summary, toStl } from '../src/lib/models/key-holder.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
const plate = buildKeyHolder(wasm, args);
const out = new URL('../public/models/window-key-holder.stl', import.meta.url);
writeFileSync(out, Buffer.from(toStl(plate)));
console.log(`Wrote ${out.pathname}: ${summary(args)}`);
