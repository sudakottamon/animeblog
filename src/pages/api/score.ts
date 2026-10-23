import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, cleanId, cleanText, displayName, readBody } from '../../lib/api';
import { getRanking, candidatesFor } from '../../lib/rankings';

export const prerender = false;

const BODY_MAX = 500;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_COMMENTS = 6;

// 採点（と任意のコメント）を受け付ける
export const POST: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const b = await readBody(ctx);
  if (typeof b.website === 'string' && b.website.length > 0) return json({ ok: true });

  const slug = cleanId(b.r);
  const basis = cleanId(b.b);
  const cand = cleanId(b.c);
  const score = Math.round(Number(b.score));
  const r = slug ? await getRanking(slug) : undefined;
  if (!r || !basis || !cand || !Number.isFinite(score) || score < 1 || score > 100) return json({ error: 'bad_request' }, 400);
  if (!candidatesFor(r, basis).some((c) => c.id === cand)) return json({ error: 'bad_candidate' }, 400);

  const me = await ipHash(ctx, e);
  const now = Date.now();
  const body = cleanText(b.body, BODY_MAX);
  const name = displayName(b.name);
  const spoiler = b.spoiler === true || b.spoiler === 'on' || b.spoiler === 1 ? 1 : 0;

  if (body) {
    const recent = await e.DB.prepare('SELECT COUNT(*) AS n FROM cand_comments WHERE ip_hash = ? AND created_at > ?')
      .bind(me, now - RATE_WINDOW_MS)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= RATE_MAX_COMMENTS) {
      return json({ error: 'rate_limited', message: '短い時間にコメントが続いています。少し時間をおいてください。' }, 429);
    }
  }

  const stmts = [
    e.DB.prepare(
      `INSERT INTO scores (ranking, basis, candidate, ip_hash, score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(ranking, basis, candidate, ip_hash) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`
    ).bind(slug, basis, cand, me, score, now, now),
  ];
  if (body) {
    stmts.push(
      e.DB.prepare(
        'INSERT INTO cand_comments (ranking, basis, candidate, name, body, score, spoiler, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(slug, basis, cand, name, body, score, spoiler, me, now)
    );
  }
  const res = await e.DB.batch(stmts);
  const stat = await e.DB.prepare('SELECT SUM(score) AS sum, COUNT(*) AS n FROM scores WHERE ranking = ? AND basis = ? AND candidate = ?')
    .bind(slug, basis, cand)
    .first<{ sum: number; n: number }>();

  return json({
    candidate: cand,
    mine: score,
    stat: { sum: stat?.sum ?? 0, n: stat?.n ?? 0 },
    comment: body
      ? { id: res[1].meta.last_row_id, candidate: cand, name, body, score, spoiler, created_at: now, good: 0, bad: 0, my_vote: null }
      : null,
  });
};
