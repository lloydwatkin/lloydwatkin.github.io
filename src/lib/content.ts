import { getCollection } from 'astro:content';

const showDrafts = import.meta.env.DEV;

export async function getPosts() {
  const posts = await getCollection('posts', ({ data }) => showDrafts || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getModels() {
  const models = await getCollection('models', ({ data }) => showDrafts || !data.draft);
  return models.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getTools() {
  const tools = await getCollection('tools', ({ data }) => showDrafts || !data.draft);
  return tools.sort((a, b) => a.data.title.localeCompare(b.data.title));
}

export async function getTalks() {
  const talks = await getCollection('talks', ({ data }) => data.listed);
  return talks.sort((a, b) => (b.data.date?.valueOf() ?? 0) - (a.data.date?.valueOf() ?? 0));
}

export function formatDate(date: Date, precision: 'day' | 'month' = 'day') {
  return date.toLocaleDateString('en-GB', {
    day: precision === 'day' ? 'numeric' : undefined,
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Rough reading time from the raw Markdown body. */
export function readingTime(body = '') {
  const words = body.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
