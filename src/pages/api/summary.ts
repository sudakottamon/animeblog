import type { APIRoute } from 'astro';
import { env, json, notReady } from '../../lib/api';

export const prerender = false;

// トップページ用: ランキングごとの投稿数と、サイト全体の新着投稿
export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const [totals, recent] = await e.DB.batch([
    e.DB.prepare('SELECT ranking, COUNT(*) AS posts FROM tier_posts WHERE hidden = 0 GROUP BY ranking'),
    e.DB.prepare(
      'SELECT id, ranking, basis, tiers, name, body, spoiler, updated_at FROM tier_posts WHERE hidden = 0 ORDER BY updated_at DESC LIMIT 8'
    ),
  ]);
  return json({
    rankings: Object.fromEntries((totals.results as any[]).map((t) => [t.ranking, { posts: t.posts }])),
    recent: (recent.results as any[]).map((r) => ({ ...r, tiers: JSON.parse(r.tiers) })),
  });
};
