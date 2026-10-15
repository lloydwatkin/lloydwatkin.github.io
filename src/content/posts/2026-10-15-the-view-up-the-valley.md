---
title: The view up the valley
description: The hills on the front page used to be random. Now they're the view north-east up the Swansea Valley from Ystalyfera.
date: 2026-10-15
category: coding
tags: [astro, svg, design, swansea valley]
---

When I rebuilt this site, the front page got a set of layered hills that drift at different speeds as you scroll. They looked nice, but they were made up: a few sine waves with random phases, seeded so they came out the same every build. Generic hills could be anywhere.

I live in Ystalyfera, and the view I actually see is up the valley. So the front page now shows that instead.

## What's in the picture

The scene looks north-east up Cwm Tawe from the hillside above the village. There are six layers, which make up five parts of the view. Furthest first:

1. **The Black Mountain escarpment.** Fan Brycheiniog (802 m) on the left, with its steep eastern face dropping to the col at the head of the Tawe. Then the rounded top of Fan Gyhirych and, further right, Fan Nedd.
2. **Cribarth.** The Sleeping Giant above Abercraf, with his brow, nose and chin on the left and his knees on the right. The hills above Ystradgynlais come in from the left.
3. **The valley sides,** two layers closing into a V where the river runs.
4. **A hillside of terraces,** stepping down the slope, with chimney stacks and a few lit windows.
5. **The foreground fields,** which is where the title sits.

## How it's built

The old hills came from a small generator in `src/lib/ridges.ts`. Each layer was a handful of sine octaves, smoothed into SVG with a Catmull-Rom spline, plus a few offset "contour" lines underneath that flatten as they go down.

The new scene keeps all of that machinery and swaps the sine waves for hand-placed control points, one list per layer, on a 1600 × 900 canvas. The points come from where each landmark sits and how high it is, so the proportions are right, but the outlines are simplified rather than traced from survey data. The near layers get a little deterministic roughness so the slopes read as woodland instead of smooth lawn.

The terraces are the only part that isn't a ridgeline. They're rows of rectangles placed along the hillside, each row a bit lower than the last, with small chimney blocks on the roofline. They share the layer's fill colour, so they move with that hill when you scroll.

Everything else stayed the same. The colours still come from CSS custom properties, mixing from a pale haze in the distance to near-black up close, and the parallax script hasn't changed: far layers lag behind the scroll and near ones keep pace. The component takes a `scene` prop now, so the home page uses `scene="swansea-valley"` and the banners on inner pages keep their generated hills.

I put this together with Claude, which drafted the skyline from the landmarks and wired it into the component. I'd like to make it more exact by tracing the skylines from a photo taken from the hillside, so that may be the next version.
