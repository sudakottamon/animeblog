import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, cleanSlug, cleanText, readBody } from '../../lib/api';

export const prerender = false;

const NAME_MAX = 20;
const BODY_MAX = 600;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const slug = cleanSlug(ctx.url.searchParams.get('slug'));
  if (!slug) return json({ error: 'bad_slug' }, 400);
  const me = await ipHash(ctx, e);
  const { results } = await e.DB.prepare(
    `SELECT c.id, c.name, c.body, c.created_at,
            (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id) AS likes,
            EXISTS(SELECT 1 FROM reactions r WHERE r.comment_id = c.id AND r.ip_hash = ?) AS liked
     FROM comments c WHERE c.slug = ? AND c.hidden = 0
     ORDER BY c.created_at DESC LIMIT 200`
  )
    .bind(me, slug)
    .all();
  return json({ comments: results });
};

export const POST: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const body = await readBody(ctx);
  if (typeof body.website === 'string' && body.website.length > 0) return json({ ok: true }); // honeypot
  const slug = cleanSlug(body.slug);
  const text = cleanText(body.body, BODY_MAX);
  const name = cleanText(body.name, NAME_MAX) || '匿名議員';
  if (!slug || text.length < 1) return json({ error: 'bad_request' }, 400);

  const me = await ipHash(ctx, e);
  const recent = await e.DB.prepare('SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > ?')
    .bind(me, Date.now() - RATE_WINDOW_MS)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= RATE_MAX) return json({ error: 'rate_limited', message: '少し休憩してから投稿してください' }, 429);

  const now = Date.now();
  const res = await e.DB.prepare('INSERT INTO comments (slug, name, body, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(slug, name, text, me, now)
    .run();
  return json({ comment: { id: res.meta.last_row_id, name, body: text, created_at: now, likes: 0, liked: 0 } }, 201);
};

// 「同意」リアクション（トグル）
export const PUT: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const body = await readBody(ctx);
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);
  const existing = await e.DB.prepare('SELECT 1 AS x FROM reactions WHERE comment_id = ? AND ip_hash = ?').bind(id, me).first();
  if (existing) {
    await e.DB.prepare('DELETE FROM reactions WHERE comment_id = ? AND ip_hash = ?').bind(id, me).run();
  } else {
    await e.DB.prepare('INSERT INTO reactions (comment_id, ip_hash, created_at) VALUES (?, ?, ?)').bind(id, me, Date.now()).run();
  }
  const likes = await e.DB.prepare('SELECT COUNT(*) AS n FROM reactions WHERE comment_id = ?').bind(id).first<{ n: number }>();
  return json({ id, likes: likes?.n ?? 0, liked: !existing });
};

// モデレーション: DELETE /api/comments?id=123  (Authorization: Bearer <ADMIN_TOKEN>)
export const DELETE: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const auth = ctx.request.headers.get('authorization') ?? '';
  if (!e.ADMIN_TOKEN || auth !== `Bearer ${e.ADMIN_TOKEN}`) return json({ error: 'forbidden' }, 403);
  const id = Number(ctx.url.searchParams.get('id'));
  if (!Number.isInteger(id)) return json({ error: 'bad_request' }, 400);
  await e.DB.prepare('UPDATE comments SET hidden = 1 WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
