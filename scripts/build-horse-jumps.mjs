// Regenerates the default toy horse jump files shown on /models/horse-jumps/:
// public/models/horse-jumps-{stands,cups,pole,tray}.stl and horse-jumps-tray.3mf.
// The 3MF has each pole as its own object, so a slicer can skip one that fails
// part way through without stopping the others.
// Usage: node scripts/build-horse-jumps.mjs [--bed=260 --poleD=10 --count=10 ...]
import { writeFileSync } from 'node:fs';
import Module from 'manifold-3d';
import { zipSync, strToU8 } from 'fflate';
import { build, summary, toStl, trayPoles, describe } from '../src/lib/models/horse-jumps.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);

const wasm = await Module();
wasm.setup();
for (const parts of ['stands', 'cups', 'pole', 'tray']) {
  const model = build(wasm, { ...args, parts });
  const out = new URL(`../public/models/horse-jumps-${parts}.stl`, import.meta.url);
  writeFileSync(out, Buffer.from(toStl(model)));
  console.log(`Wrote ${out.pathname}: ${summary({ ...args, parts }, model.boundingBox())} · genus ${model.genus()} · ${model.status()}`);
}

// 3MF of the tray, one object per pole, centred on the bed.
const d = describe({ ...args, parts: 'tray' });
const f = (n) => +n.toFixed(4);
const objects = trayPoles(wasm, args).map((m, i) => {
  const { vertProperties: v, triVerts: t, numProp: np } = m.getMesh();
  const verts = [];
  for (let j = 0; j < v.length; j += np) verts.push(`<vertex x="${f(v[j])}" y="${f(v[j + 1])}" z="${f(v[j + 2])}"/>`);
  const tris = [];
  for (let j = 0; j < t.length; j += 3) tris.push(`<triangle v1="${t[j]}" v2="${t[j + 1]}" v3="${t[j + 2]}"/>`);
  return `<object id="${i + 1}" name="Pole ${i + 1}" type="model"><mesh><vertices>${verts.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>`;
});
const items = objects.map((_, i) => `<item objectid="${i + 1}" transform="1 0 0 0 1 0 0 0 1 ${d.bed / 2} ${d.bed / 2} 0"/>`);
const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">Toy horse jump poles</metadata>
<metadata name="Designer">evilprofessor.co.uk</metadata>
<resources>${objects.join('\n')}</resources>
<build>${items.join('')}</build>
</model>`;
const zip = zipSync({
  '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
  '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
  '3D/3dmodel.model': strToU8(model),
}, { level: 9 });
const out3mf = new URL('../public/models/horse-jumps-tray.3mf', import.meta.url);
writeFileSync(out3mf, zip);
console.log(`Wrote ${out3mf.pathname}: ${objects.length} poles as separate objects`);
