# evilprofessor.co.uk

Personal site for Lloyd Watkin, built with [Astro](https://astro.build) and published to GitHub Pages at <https://www.evilprofessor.co.uk>.

All content is plain Markdown/MDX (plus the old reveal.js talk decks). Layouts and styles are separate, so a redesign regenerates every page without touching content.

## Running it locally

```bash
npm install
npm run dev      # http://localhost:4321, drafts are visible
npm run build    # production build into dist/
npm run preview  # serve dist/
```

## Writing

| What | Where | URL |
| --- | --- | --- |
| Blog posts | `src/content/posts/YYYY-MM-DD-slug.md(x)` | `/blog/slug/` |
| Categories | `src/data/categories.ts` | `/category/<slug>/` |
| 3D models | `src/content/models/*.md` + file in `public/models/` | `/models/<slug>/` |
| Interactive tools | `src/content/tools/*.mdx` + component in `src/components/tools/` | `/tools/<slug>/` |
| Static pages | `src/pages/*.md` with `layout: ../layouts/PageLayout.astro` | `/<name>/` |
| Talks (reveal.js) | `src/content/talks/<slug>.html`, images in `public/<slug>/` | `/<slug>/` |

Start a new post with:

```bash
npm run new -- "My long run in the hills" running
```

It creates a draft (`draft: true`). Drafts show in `npm run dev` but are left out of the published site.

### Post front matter

```yaml
---
title: My long run in the hills
description: One sentence used in lists, RSS and search results.
date: 2026-10-20
category: running        # must be a slug from src/data/categories.ts
tags: [trail, training]  # optional
cover: ./images/ridge.jpg # optional, path relative to the post file
coverAlt: Looking along the ridge at sunrise
draft: false
---
```

For posts with images, use a folder: `src/content/posts/2026-10-20-long-run/index.md` with images next to it. Astro optimises them at build time.

Use `.mdx` when a post needs a component, e.g. embedding the model viewer:

```mdx
import ModelViewer from '../../components/ModelViewer.astro';

<ModelViewer src="/models/desk-cable-clip.stl" format="stl" label="Desk cable clip" />
```

### 3D models

Put the `.stl`, `.glb` or `.gltf` file in `public/models/`, then add `src/content/models/<slug>.md` (see `desk-cable-clip.md`, which is an example you can delete). Optional `preview` is an image path under `public/` for the models index; `printSettings` is a free-form list shown beside the viewer.

### Tools

A tool is an MDX page that imports a component with its own `<script>`. See `src/components/tools/PaceCalculator.astro` and `src/content/tools/pace-calculator.mdx`.

## Design

- `src/styles/global.css`: colour tokens (light and dark), type scale, prose styles.
- `src/layouts/`: `BaseLayout` (header, footer, theme toggle, parallax script), `PostLayout`, `PageLayout`, `TalkLayout`.
- `src/components/Ridges.astro`: the layered contour ridgelines used for the parallax hero, banners and footer. Each post gets its own skyline, seeded from its slug and tinted with its category colour.
- Fonts are self-hosted via Fontsource: Bricolage Grotesque (headings, UI), Source Serif 4 (article text), JetBrains Mono (code).

## The old talks site

The reveal.js decks from talks.evilprofessor.co.uk are kept at their original URLs (e.g. `/intro-to-xmpp/`). The reveal.js 2.4 engine lives in `public/reveal/`. The old `/xmppuk-ietf/` duplicate copy is now a set of redirects to the canonical talk URLs. `decentralized` was an unfinished deck with no front matter; it is still published at `/decentralized/` but not listed.

## Deployment

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. In the repository settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**. The custom domain is set in `public/CNAME` and in the Pages settings.
