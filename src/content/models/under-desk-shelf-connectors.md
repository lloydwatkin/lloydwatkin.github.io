---
title: Under-desk shelf connectors
description: Three-part printed connectors that hang a thin ply shelf 12 cm below a desk. A bracket screws to the desk, a hanger slides into it, and a threaded support goes up through the shelf and screws into the hanger. Set your shelf thickness and drop below and download your own version.
date: 2026-11-22
file: /models/under-desk-shelf-connectors.stl
format: stl
preview: /models/under-desk-shelf-connectors.jpg
color: '#7f77dd'
license: CC BY 4.0
category: diy
generator: under-desk-shelf
printSettings:
  Material: PETG or PLA
  Layer height: 0.2 mm
  Walls: '4'
  Infill: 30%
  Supports: None
  Orientation: As downloaded
---

I wanted a shelf under my desk for computer bits. It's a 1.2 m × 0.3 m sheet of 5 mm ply hung on ten of these connectors. Each one is three parts:

- **C, the bracket**, screws to the underside of the desk. It has a T-shaped slot that's open on one side.
- **B, the hanger**, is 120 mm long. Its wide head slides sideways into the bracket's slot, and there's a threaded socket in its bottom end.
- **A, the support**, goes up through a hole in the shelf from below and screws into the hanger. The shelf is clamped between A's flange and the end of B.

The viewer shows one set on a single print plate, with each part already the right way up. Switch **Parts** in the form to print one part at a time, or download the defaults: [support](/models/under-desk-shelf-support.stl), [hanger](/models/under-desk-shelf-hanger.stl) and [bracket](/models/under-desk-shelf-bracket.stl).

Change **Shelf thickness** for a different board and **Hanger length** to hang the shelf higher or lower. The other sizes follow the thread diameter: the hanger rod is 10 mm wider than the thread, the head 14 mm wider again, and the bracket grows to fit.

<figure>
  <img src="/models/under-desk-shelf-section.jpg" alt="A cross-section of one connector: the green bracket under the desk, the purple hanger's head sitting on the bracket's ledges, and the orange support screwed up through the shelf into the bottom of the hanger." width="727" height="578" loading="lazy" />
  <figcaption>One connector, cut in half.</figcaption>
</figure>

## The printed parts

Here's a default set, printed. The support and hanger are in black, and the bracket in grey is shown slot-side up, the way it prints.

<figure>
  <img src="/models/under-desk-shelf-printed.jpg" alt="A printed set of the three connector parts on a grey carpet: the black threaded support with its notched flange, the grey bracket with its U-shaped slot and four screw holes, and the black hanger with its wide head and long rod." width="1200" height="1593" loading="lazy" />
</figure>

## How it holds

The bracket's floor has a 21 mm slot for the hanger's neck, which leaves a ledge on each side. The hanger's 44 mm head can't fit through the slot, so it rests on the ledges. The top of the bracket is open, and the desk closes it off once the bracket is screwed on. That way it prints flat without supports.

At the closed end of the slot, the ledges have a 1 mm pocket. The shelf's weight pulls the head down into it, so a hanger can't slide back out unless you lift it. Even so, don't point all the slots the same way, or the whole shelf could slide off together. Point half towards the front and half towards the back.

## The thread

The default thread is 20 mm across with a 3.5 mm pitch, chunky enough to print cleanly. The support's thread is the shelf thickness plus **Thread into hanger** (50 mm by default). The socket in the hanger is 0.35 mm larger all round, which suits a 0.4 mm nozzle. If the thread binds, raise **Thread clearance** to 0.4–0.5 mm; print one support and one hanger to check the fit before a full batch. There's a cross in the bottom of the support's flange, so you can tighten it with a PH2 or PH3 screwdriver from under the shelf. Snug is enough, and over-tightening could strip the plastic thread.

## Fitting it

- Drill the shelf holes 1–2 mm bigger than the thread: 21–22 mm for the default. A spade or Forstner bit works.
- Fix each bracket with four #8 (4 mm) countersunk wood screws.
- The top of the shelf ends up about 3 mm further below the desk than the hanger length: 123 mm by default.

The shelf is meant for about 10 kg, which is only 1 kg per connector. Thin ply 300 mm deep is more likely to sag between connectors than any connector is to break, so glue a batten along the back edge if it bends.

## Printing

Every part prints as downloaded, without supports: the support flange-down, the hanger head-down so its thread prints vertically, and the bracket slot-side up. Four walls make the thread and the hanger's neck strong.

## How it's made

I designed it with Claude. Like the [board joints](/models/board-joints/), the model is generated in JavaScript with [manifold-3d](https://github.com/elalish/manifold), a geometry library compiled to WebAssembly. The thread is built directly as a helical mesh, and the hanger's socket is the same thread made slightly bigger and cut out. The same code made the default files (with `node scripts/build-under-desk-shelf.mjs`) and runs in your browser when you change a value, so the STL you download is made on your own machine. The link from **Copy link** keeps your settings, so you can share a particular size.
