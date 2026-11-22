---
title: Under-desk shelf connectors
description: Three-part printed connectors that hang a thin ply shelf 12 cm below a desk. A bracket screws to the desk, a hanger slides into it, and a threaded support goes up through the shelf and screws into the hanger.
date: 2026-11-22
file: /models/under-desk-shelf-connectors.stl
format: stl
preview: /models/under-desk-shelf-connectors.jpg
color: '#7f77dd'
license: CC BY 4.0
category: diy
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

The viewer shows one set on a single print plate, with each part already the right way up. The parts are also available separately:

- [Support (STL)](/models/under-desk-shelf-support.stl)
- [Hanger (STL)](/models/under-desk-shelf-hanger.stl)
- [Bracket (STL)](/models/under-desk-shelf-bracket.stl)

<figure>
  <img src="/models/under-desk-shelf-section.jpg" alt="A cross-section of one connector: the green bracket under the desk, the purple hanger's head sitting on the bracket's ledges, and the orange support screwed up through the shelf into the bottom of the hanger." width="727" height="578" loading="lazy" />
  <figcaption>One connector, cut in half.</figcaption>
</figure>

## How it holds

The bracket's floor has a 21 mm slot for the hanger's neck, which leaves a ledge on each side. The hanger's 44 mm head can't fit through the slot, so it rests on the ledges. The top of the bracket is open, and the desk closes it off once the bracket is screwed on. That way it prints flat without supports.

At the closed end of the slot, the ledges have a 1 mm pocket. The shelf's weight pulls the head down into it, so a hanger can't slide back out unless you lift it. Even so, don't point all the slots the same way, or the whole shelf could slide off together. Point half towards the front and half towards the back.

## The thread

The thread is 20 mm across with a 3.5 mm pitch, chunky enough to print cleanly. The support has 55 mm of thread: 5 mm passes through the shelf and about 50 mm goes into the hanger. The socket in the hanger is 0.35 mm larger all round, which suits a 0.4 mm nozzle. There's a cross in the bottom of the support's flange, so you can tighten it with a PH2 or PH3 screwdriver from under the shelf. Snug is enough, and over-tightening could strip the plastic thread.

## Fitting it

- Drill 21–22 mm holes in the shelf. A spade or Forstner bit works.
- Fix each bracket with four #8 (4 mm) countersunk wood screws.
- The top of the shelf ends up about 123 mm below the desk.

The shelf is meant for about 10 kg, which is only 1 kg per connector. Thin ply 300 mm deep is more likely to sag between connectors than any connector is to break, so glue a batten along the back edge if it bends.

## Printing

Every part prints as downloaded, without supports: the support flange-down, the hanger head-down so its thread prints vertically, and the bracket slot-side up. Four walls make the thread and the hanger's neck strong.

I designed it with Claude, which wrote the model in Python with [manifold3d](https://github.com/elalish/manifold), the same geometry library the other [models](/models/) on this site use.
