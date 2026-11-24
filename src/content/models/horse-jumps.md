---
title: Toy horse show jump
description: A show jump for toy ponies. Two 20 cm stands with seven height positions, peg-in jump cups and white poles as long as your printer bed allows. Set your bed size, pole thickness and stand height and download your own version.
date: 2026-11-24
file: /models/horse-jumps-stands.stl
format: stl
preview: /models/horse-jumps.jpg
color: '#7aa9d6'
license: CC BY 4.0
category: diy
generator: horse-jumps
printSettings:
  Material: PLA
  Layer height: 0.2 mm
  Walls: '3'
  Infill: 15–20%
  Supports: None
  Orientation: As downloaded
---

The toy ponies needed something to jump. This is a classic show jump: two stands, jump cups that peg into them, and white poles.

There are three print plates. **Two stands** is the default shown above. Switch **Parts** in the form for the others, or download the defaults: [four jump cups](/models/horse-jumps-cups.stl) and [one 341 mm pole](/models/horse-jumps-pole.stl). Print the pole in white, once for each pole you want. Two cups hold one pole.

<figure>
  <img src="/models/horse-jumps.jpg" alt="A render of the jump: two blue stands with a ball on top of each post, red jump cups pegged into the posts and a white pole resting across them." width="1600" height="1204" loading="lazy" />
  <figcaption>The jump put together, with the pole at the third height.</figcaption>
</figure>

## The poles

The pole is as long as fits on the bed. Set **Printer bed size** for your printer: 260 mm for the Creality K2, 300 for the K2 Pro and 350 for the K2 Plus. **Corner to corner** lays the pole diagonally across the bed. That makes it about 40% longer, 341 mm on a K2. **Straight across** gives a 250 mm pole on the same bed, which is handy for a narrower jump. The pole has a 0.8 mm flat underneath so it lies on the bed without rolling.

## The stands

Each stand is 200 mm tall to the top of the ball, on a 50 × 90 mm base. Fins run from the base up the front and back of the post so it doesn't tip when a pony knocks it, and the sides are left clear for the cups. There are holes through the post every 20 mm, from 30 mm to 150 mm, so the pole can go at seven heights. The holes have a pointed top (a teardrop shape), so the stands print upright without supports. Change **Hole spacing** for more or fewer heights.

## The cups

A cup is a small block with a cradle on top and a 5 mm peg on the back. Push the peg through a hole from the inside of the stand, and the pole rests in the cradle. The cradle is shallow, like the cups on a real jump, so a knocked pole falls rather than taking the stands with it. The holes are 5.4 mm, a 0.2 mm gap all round the peg. Print one cup and try it in a stand before printing a batch. The cups print on their backs with the peg pointing up.

## How it's made

I designed it with Claude. Like the [under-desk shelf connectors](/models/under-desk-shelf-connectors/), the model is generated in JavaScript with [manifold-3d](https://github.com/elalish/manifold). The same code made the default files (with `node scripts/build-horse-jumps.mjs`) and runs in your browser when you change a value, so the STL you download is made on your own machine. The link from **Copy link** keeps your settings.
