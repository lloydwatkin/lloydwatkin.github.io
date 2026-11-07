---
title: Faux slate plaque and medal blank
description: A blank that looks like a piece of hand-cut Welsh slate, with knapped edges and a riven face, for finisher medals, house signs and plaques. Add your own text in the slicer. Set the size and cut a new slate below.
date: 2026-11-07
file: /models/slate-plaque.stl
format: stl
preview: /models/slate-plaque.jpg
color: '#5b6573'
license: CC BY 4.0
category: diy
generator: slate-plaque
printSettings:
  Material: Matte black or dark grey PLA
  Layer height: 0.12 to 0.16 mm
  Walls: '3'
  Infill: 15%
  Supports: None
  Orientation: Flat, back on the bed, as downloaded
---

I made this for a finisher medal for a run round the old slate quarries, so it had to look like slate. It's a blank: a piece of "hand-cut" slate with a riven, split-layer face, the odd flaked scar and chisel mark, and edges knocked off in rounded scoops the way a flint is knapped. There's a ribbon slot through the top and a groove in the back for a push-in stand, so it can hang round a neck or stand on a shelf.

The default is 150 × 195 mm and 5 mm thick. Every **Slate** number cuts a different piece, so if you don't like the edge on one, try the next. The same number always gives the same slate, and **Copy link** keeps it.

## Adding your text

The blank has no text so you can put whatever you like on it: a race name, a route, a date, a house number. Add it in the slicer. Bambu Studio, OrcaSlicer and Creality Print all have a text tool: right-click the plaque, choose **Add part → Text**, and place it on the face. A bold, chunky font such as Montserrat ExtraBold reads best. Make the letters stand about 1.2 mm proud of the highest point of the slate, which is the **Thickness** you set, and keep the strokes at least 1.5 mm wide.

For a GPS route, export the GPX outline as an SVG and add it as a part the same way, as a raised line 1.5 to 2 mm wide.

## Two colours

White text on black slate is the classic look.

- **With a multi-material unit (AMS, CFS, MMU):** add the text as a part of the plaque, as above, and set that part to your white filament. The slicer prints both in one go.
- **On a single extruder:** print the text as part of the plaque in the same file, and add a filament change at the layer that matches the **Thickness** (5 mm by default). Everything below is slate, everything above is text.

## The stand

Set **Parts** to **Stand** to download it. It's a flat right-angled fin that prints lying down. Its tab pushes into the groove in the back and holds the plaque upright. The groove is 0.15 mm wider than the fin on each side, which gives a snug push fit on most printers. If it's loose, a dab of glue fixes it; if it's tight, sand the tab. **Plaque and stand** puts both on one plate.

## Printing

It prints flat, back down, with no supports. The texture is fine, so thin layers (0.12 to 0.16 mm) show it best. Matte black or dark grey PLA looks most like slate. A plaque bigger than about 200 mm across won't fit on a 220 mm bed with the stand beside it, so print them separately.

## How it's made

Like the [window key holder](/models/window-key-holder/), it's generated in JavaScript with [manifold-3d](https://github.com/elalish/manifold), compiled to WebAssembly. The face is a heightfield built from layers of smoothed noise, with terraces where the "layers" have split away. The edge is a wavy outline with a run of overlapping elliptical bites taken out of it, and each bite also dishes a shallow scoop into the face. The bottom edge is left straight so it stands up. The same code made the default file (with `node scripts/build-slate-plaque.mjs`) and runs in your browser when you change a value, so the STL you download is made on your own machine. A large slate takes a few seconds to build.
