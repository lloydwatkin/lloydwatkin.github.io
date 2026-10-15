import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { readdir, readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import { categorySlugs } from './data/categories';

/** Blog posts: src/content/posts/**\/*.md(x) */
const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
    // "2026-10-15-my-post.md" or "2026-10-15-my-post/index.md" -> "my-post",
    // so files sort by date on disk but URLs stay short.
    generateId: ({ entry }) =>
      entry
        .replace(/\.mdx?$/, '')
        .replace(/\/index$/, '')
        .split('/')
        .map((part) => part.replace(/^\d{4}-\d{2}-\d{2}-/, ''))
        .join('/'),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      category: z.enum(categorySlugs),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

/** Shareable 3D models: src/content/models/*.md(x), files in public/models/ */
const models = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/models' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    /** Path under /public, e.g. /models/drill-guide.stl */
    file: z.string(),
    format: z.enum(['stl', 'glb', 'gltf']),
    /** Optional preview image under /public, shown on the models index */
    preview: z.string().optional(),
    /** Viewer colour for STL files (GLB/GLTF carry their own materials) */
    color: z.string().default('#d9dee2'),
    license: z.string().default('CC BY 4.0'),
    category: z.enum(categorySlugs).default('diy'),
    printSettings: z.record(z.string(), z.string()).optional(),
    /**
     * Parametric models: name of a generator in src/components/generators/.
     * The page then shows a form that rebuilds the model in the browser, and
     * `file` is the default version.
     */
    generator: z.enum(['drill-guide', 'board-joint', 'hanging-rail']).optional(),
    draft: z.boolean().default(false),
  }),
});

/** Interactive tools: src/content/tools/*.mdx (import components with JS) */
const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.enum(categorySlugs).optional(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Talks: reveal.js decks kept as HTML with YAML front matter (carried over
 * from the old Jekyll site). Each is rendered at /<id>/ so old links work.
 */
function htmlWithFrontmatter(base: string): Loader {
  return {
    name: 'html-frontmatter',
    async load({ store, parseData, generateDigest, logger }) {
      store.clear();
      const files = (await readdir(base)).filter((f) => f.endsWith('.html'));
      for (const file of files) {
        const raw = await readFile(`${base}/${file}`, 'utf8');
        const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
        if (!match) {
          logger.warn(`Skipping ${file}: no front matter`);
          continue;
        }
        const id = file.replace(/\.html$/, '');
        const data = await parseData({ id, data: { ...parseYaml(match[1]), html: match[2] } });
        store.set({ id, data, digest: generateDigest(raw) });
      }
    },
  };
}

const talks = defineCollection({
  loader: htmlWithFrontmatter('./src/content/talks'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    summary: z.string().optional(),
    date: z.coerce.date().optional(),
    datePrecision: z.enum(['day', 'month']).default('day'),
    theme: z.string().default('moon'),
    extraOptions: z.string().optional(),
    listed: z.boolean().default(true),
    html: z.string(),
  }),
});

export const collections = { posts, models, tools, talks };
