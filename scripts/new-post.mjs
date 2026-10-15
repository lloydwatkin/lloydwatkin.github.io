#!/usr/bin/env node
// Create a new post:  npm run new -- "Post title" running
import { writeFileSync, existsSync } from 'node:fs';

const [title, category = 'life'] = process.argv.slice(2);
if (!title) {
  console.error('Usage: npm run new -- "Post title" [category]');
  process.exit(1);
}
const date = new Date().toISOString().slice(0, 10);
const slug = title
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^\w\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-');
const file = `src/content/posts/${date}-${slug}.md`;
if (existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}
writeFileSync(
  file,
  `---
title: ${JSON.stringify(title)}
description: ""
date: ${date}
category: ${category}
tags: []
draft: true
---

Write here.
`,
);
console.log(`Created ${file} (draft: set draft: false to publish)`);
