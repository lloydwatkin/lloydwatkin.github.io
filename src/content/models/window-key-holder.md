---
title: Window key holder
description: A small pocket that sticks to a UPVC window frame and keeps the window key right where you need it, with a finger scoop so it's easy to grab. Set the slot to fit your key and download your own version.
date: 2026-10-29
file: /models/window-key-holder.stl
format: stl
preview: /models/window-key-holder.jpg
color: '#e9edf3'
license: CC BY 4.0
category: diy
generator: key-holder
printSettings:
  Material: PETG or ASA (PLA in shaded windows)
  Layer height: 0.2 mm
  Walls: '3'
  Infill: 20%
  Supports: None
  Orientation: Standing up, open end on top, as downloaded
---

Every UPVC window in the house has a locking handle, and every one of those keys ends up in a drawer, on a windowsill or lost. This is a little open-topped pocket that sticks to the frame beside the handle, so the key lives with its window. Drop the key in head-up and the scoop in the front lets you pinch it straight out.

The default is the small size: 25 × 30 × 8 mm outside, with a 20 × 5 mm slot, which suits most small window keys. For bigger keys, or two or three on a ring, try the [medium size](/models/window-key-holder/?slotWidth=26&slotDepth=7&height=40&sideWall=2): 30 × 40 × 10 mm outside with a 26 × 7 mm slot.

## Sizing it for your key

Measure across the widest part of the key head and add a millimetre or so for the **slot width**. For **slot depth**, measure the thickness of the key (or the stack of keys) at its thickest point and add about 1 mm. Set the **height** so the head of the key sits a few millimetres above the bottom of the scoop: too short and it falls out when the window opens, too tall and you're fishing for it.

Set **How many** to print a plate of them at once, one for each window.

## Fitting it

The back is flat, so a strip of double-sided foam tape (3M VHB or similar) holds it firmly on UPVC. Clean the frame with a bit of isopropyl alcohol first and press it on hard for half a minute. Put it on the fixed frame next to the opening side, so it doesn't swing out with the window.

Window frames get hot in the sun. PLA can soften and sag on a south-facing window, so print those in PETG or ASA. White matches most frames and hides it nicely.

## Printing

It prints standing up with the open end on top, so the walls go straight up and the scoop is just a cut in the front wall. Nothing overhangs and it doesn't need supports.

## How it's made

Like the [drill guide](/models/drill-guide/), the model is generated in JavaScript with [manifold-3d](https://github.com/elalish/manifold), a geometry library compiled to WebAssembly. The same code made the default file (with `node scripts/build-key-holder.mjs`) and runs in your browser when you change a value, so the STL you download is made on your own machine. The link from **Copy link** keeps your settings, so you can share a particular size.
