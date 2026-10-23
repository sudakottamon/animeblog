import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, cleanId } from '../../lib/api';
import { getRanking, hasBasis } from '../../lib/rankings';

export const prerender = false;

const PREVIEW_PER_CANDIDATE = 2;

// 1勢ぶんの集計・自分の採点・各キャラの上位コメントをまとめて返す
export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const slug = cleanId(ctx.url.searchParams.get('r'));
  const basis = cleanId(ctx.url.searchParams.get('b'));
  const r = slug ? await getRanking(slug) : undefined;
  if (!r || !basis || !hasBasis(r, basis)) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);

  const [totals, stats, mine, counts, previews] = await e.DB.batch([
    e.DB.prepare('SELECT COUNT(DISTINCT ip_hash) AS participants, COUNT(*) AS votes FROM scores WHERE ranking = ? AND basis = ?').bind(slug, basis),
    e.DB.prepare('SELECT candidate, SUM(score) AS sum, COUNT(*) AS n FROM scores WHERE ranking = ? AND basis = ? GROUP BY candidate').bind(slug, basis),
    e.DB.prepare('SELECT candidate, score FROM scores WHERE ranking = ? AND basis = ? AND ip_hash = ?').bind(slug, basis, me),
    e.DB.prepare('SELECT candidate, COUNT(*) AS n FROM cand_comments WHERE ranking = ? AND basis = ? AND hidden = 0 GROUP BY candidate').bind(slug, basis),
    e.DB.prepare(
      `SELECT * FROM (
         SELECT c.id, c.candidate, c.name, c.body, c.score, c.spoiler, c.created_at,
                COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 END), 0) AS good,
                COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 END), 0) AS bad,
                MAX(CASE WHEN v.ip_hash = ? THEN v.value END) AS my_vote,
                ROW_NUMBER() OVER (
                  PARTITION BY c.candidate
                  ORDER BY COALESCE(SUM(v.value), 0) DESC, c.created_at DESC
                ) AS rn
         FROM cand_comments c LEFT JOIN comment_votes v ON v.comment_id = c.id
         WHERE c.ranking = ? AND c.basis = ? AND c.hidden = 0
         GROUP BY c.id
       ) WHERE rn <= ?`
    ).bind(me, slug, basis, PREVIEW_PER_CANDIDATE),
  ]);

  const t = (totals.results[0] ?? {}) as { participants?: number; votes?: number };
  const preview: Record<string, unknown[]> = {};
  for (const row of previews.results as any[]) (preview[row.candidate] ??= []).push(row);

  return json({
    participants: t.participants ?? 0,
    votes: t.votes ?? 0,
    stats: Object.fromEntries((stats.results as any[]).map((s) => [s.candidate, { sum: s.sum, n: s.n }])),
    mine: Object.fromEntries((mine.results as any[]).map((m) => [m.candidate, m.score])),
    commentCounts: Object.fromEntries((counts.results as any[]).map((c) => [c.candidate, c.n])),
    preview,
  });
};
