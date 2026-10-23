import type { APIRoute } from 'astro';
import { env, json, notReady } from '../../lib/api';

export const prerender = false;

// トップページ用: ランキングごとの参加者数・採点数と、サイト全体の新着コメント
export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const [totals, recent] = await e.DB.batch([
    e.DB.prepare('SELECT ranking, COUNT(DISTINCT ip_hash) AS participants, COUNT(*) AS votes FROM scores GROUP BY ranking'),
    e.DB.prepare(
      'SELECT id, ranking, basis, candidate, name, body, score, spoiler, created_at FROM cand_comments WHERE hidden = 0 ORDER BY created_at DESC LIMIT 8'
    ),
  ]);
  return json({
    rankings: Object.fromEntries((totals.results as any[]).map((t) => [t.ranking, { participants: t.participants, votes: t.votes }])),
    recent: recent.results,
  });
};
