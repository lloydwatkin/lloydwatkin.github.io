// Blog categories. Add a new one here and it gets its own page, colour and
// listing automatically. `slug` is what you put in a post's `category` field.
export const categories = [
  { slug: 'ai', name: 'AI', color: '#8a78f0', blurb: 'Working with language models, agents and the tools around them.' },
  { slug: 'coding', name: 'Coding', color: '#1fa3b0', blurb: 'Software, infrastructure and things I have built.' },
  { slug: 'running', name: 'Running', color: '#e5772e', blurb: 'Trail running, races, training and kit.' },
  { slug: 'diy', name: 'DIY', color: '#5f9a4b', blurb: 'Building things with wood, metal, electronics and a 3D printer.' },
  { slug: 'life', name: 'Life', color: '#c9a227', blurb: 'Everything else.' },
] as const;

export type CategorySlug = (typeof categories)[number]['slug'];

export const categorySlugs = categories.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function getCategory(slug: string) {
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) throw new Error(`Unknown category "${slug}". Add it to src/data/categories.ts`);
  return cat;
}
