import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, cleanId, readBody } from '../../lib/api';

export const prerender = false;

const PAGE = 20;

// キャラごとのコメント一覧（もっと読む）
export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const p = ctx.url.searchParams;
  const slug = cleanId(p.get('r'));
  const basis = cleanId(p.get('b'));
  const cand = cleanId(p.get('c'));
  const sort = p.get('sort') === 'new' ? 'new' : 'top';
  const offset = Math.max(0, Math.min(1000, Number(p.get('offset')) || 0));
  if (!slug || !basis || !cand) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);
  const order = sort === 'new' ? 'c.created_at DESC' : 'COALESCE(SUM(v.value), 0) DESC, c.created_at DESC';
  const { results } = await e.DB.prepare(
    `SELECT c.id, c.candidate, c.name, c.body, c.score, c.spoiler, c.created_at,
            COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 END), 0) AS good,
            COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 END), 0) AS bad,
            MAX(CASE WHEN v.ip_hash = ? THEN v.value END) AS my_vote
     FROM cand_comments c LEFT JOIN comment_votes v ON v.comment_id = c.id
     WHERE c.ranking = ? AND c.basis = ? AND c.candidate = ? AND c.hidden = 0
     GROUP BY c.id ORDER BY ${order} LIMIT ? OFFSET ?`
  )
    .bind(me, slug, basis, cand, PAGE + 1, offset)
    .all();
  return json({ comments: results.slice(0, PAGE), more: results.length > PAGE });
};

// 👍(+1) / 👎(-1)。同じ側をもう一度押すと取り消し。
export const PUT: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const b = await readBody(ctx);
  const id = Number(b.id);
  const value = Number(b.value);
  if (!Number.isInteger(id) || id <= 0 || (value !== 1 && value !== -1)) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);
  const cur = await e.DB.prepare('SELECT value FROM comment_votes WHERE comment_id = ? AND ip_hash = ?').bind(id, me).first<{ value: number }>();
  const undo = cur?.value === value;
  if (undo) {
    await e.DB.prepare('DELETE FROM comment_votes WHERE comment_id = ? AND ip_hash = ?').bind(id, me).run();
  } else {
    await e.DB.prepare(
      'INSERT INTO comment_votes (comment_id, ip_hash, value, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(comment_id, ip_hash) DO UPDATE SET value = excluded.value'
    )
      .bind(id, me, value, Date.now())
      .run();
  }
  const t = await e.DB.prepare(
    'SELECT COALESCE(SUM(CASE WHEN value = 1 THEN 1 END), 0) AS good, COALESCE(SUM(CASE WHEN value = -1 THEN 1 END), 0) AS bad FROM comment_votes WHERE comment_id = ?'
  )
    .bind(id)
    .first<{ good: number; bad: number }>();
  return json({ id, good: t?.good ?? 0, bad: t?.bad ?? 0, my_vote: undo ? null : value });
};

// 管理用: DELETE /api/cc/?id=123  (Authorization: Bearer <ADMIN_TOKEN>)
export const DELETE: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  if (!e.ADMIN_TOKEN || ctx.request.headers.get('authorization') !== `Bearer ${e.ADMIN_TOKEN}`) return json({ error: 'forbidden' }, 403);
  const id = Number(ctx.url.searchParams.get('id'));
  if (!Number.isInteger(id)) return json({ error: 'bad_request' }, 400);
  await e.DB.prepare('UPDATE cand_comments SET hidden = 1 WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
