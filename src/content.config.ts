import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['saikyo', 'vod', 'watch', 'ranking', 'guide']),
    services: z.array(z.string()).default([]),
    poll: z
      .object({ question: z.string(), options: z.array(z.string()).min(2).max(12) })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
