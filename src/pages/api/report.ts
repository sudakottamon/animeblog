import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, readBody } from '../../lib/api';

export const prerender = false;

const REASONS = ['spoiler', 'abuse', 'obscene', 'other'] as const;
const AUTO_HIDE_AT = 5;

// 投稿（ティア表＋コメント）の通報。一定数に達したら自動で非表示にする。
export const POST: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const b = await readBody(ctx);
  const id = Number(b.id);
  const reason = String(b.reason);
  if (!Number.isInteger(id) || id <= 0 || !(REASONS as readonly string[]).includes(reason)) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);
  await e.DB.prepare('INSERT OR IGNORE INTO tier_post_reports (post_id, ip_hash, reason, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, me, reason, Date.now())
    .run();
  const n = await e.DB.prepare('SELECT COUNT(*) AS n FROM tier_post_reports WHERE post_id = ?').bind(id).first<{ n: number }>();
  if ((n?.n ?? 0) >= AUTO_HIDE_AT) await e.DB.prepare('UPDATE tier_posts SET hidden = 1 WHERE id = ?').bind(id).run();
  return json({ ok: true });
};
