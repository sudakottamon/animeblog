import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, cleanSlug, cleanText, readBody } from '../../lib/api';

export const prerender = false;

async function tally(db: D1Database, slug: string) {
  const { results } = await db
    .prepare('SELECT choice, COUNT(*) AS n FROM votes WHERE slug = ? GROUP BY choice ORDER BY n DESC')
    .bind(slug)
    .all<{ choice: string; n: number }>();
  const total = results.reduce((a, r) => a + r.n, 0);
  return { total, counts: Object.fromEntries(results.map((r) => [r.choice, r.n])) };
}

export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const slug = cleanSlug(ctx.url.searchParams.get('slug'));
  if (!slug) return json({ error: 'bad_slug' }, 400);
  const me = await ipHash(ctx, e);
  const mine = await e.DB.prepare('SELECT choice FROM votes WHERE slug = ? AND ip_hash = ?')
    .bind(slug, me)
    .first<{ choice: string }>();
  return json({ ...(await tally(e.DB, slug)), mine: mine?.choice ?? null });
};

export const POST: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const body = await readBody(ctx);
  const slug = cleanSlug(body.slug);
  const choice = cleanText(body.choice, 40);
  if (!slug || !choice) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);
  await e.DB.prepare(
    'INSERT INTO votes (slug, choice, ip_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(slug, ip_hash) DO UPDATE SET choice = excluded.choice, created_at = excluded.created_at'
  )
    .bind(slug, choice, me, Date.now())
    .run();
  return json({ ...(await tally(e.DB, slug)), mine: choice });
};
