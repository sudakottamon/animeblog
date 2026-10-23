import type { APIRoute } from 'astro';
import { env, json, notReady, ipHash, cleanId, cleanText, displayName, readBody } from '../../lib/api';
import { getRanking, hasBasis, candidatesFor } from '../../lib/rankings';
import { TIERS } from '../../lib/tiers';

export const prerender = false;

const BODY_MAX = 500;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_POSTS = 6;

// 1勢ぶんの集計（キャラごとの段の内訳）と、自分の投稿
export const GET: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const slug = cleanId(ctx.url.searchParams.get('r'));
  const basis = cleanId(ctx.url.searchParams.get('b'));
  const r = slug ? await getRanking(slug) : undefined;
  if (!r || !basis || !hasBasis(r, basis)) return json({ error: 'bad_request' }, 400);
  const me = await ipHash(ctx, e);

  const [count, dist, pos, mine] = await e.DB.batch([
    e.DB.prepare('SELECT COUNT(*) AS n FROM tier_posts WHERE ranking = ? AND basis = ? AND hidden = 0').bind(slug, basis),
    e.DB.prepare(
      `SELECT p.candidate, p.tier, COUNT(*) AS n
       FROM tier_placements p JOIN tier_posts t ON t.id = p.post_id
       WHERE p.ranking = ? AND p.basis = ? AND t.hidden = 0
       GROUP BY p.candidate, p.tier`
    ).bind(slug, basis),
    e.DB.prepare(
      `SELECT p.candidate, SUM(p.pos) AS sum, COUNT(p.pos) AS n
       FROM tier_placements p JOIN tier_posts t ON t.id = p.post_id
       WHERE p.ranking = ? AND p.basis = ? AND t.hidden = 0 AND p.pos IS NOT NULL
       GROUP BY p.candidate`
    ).bind(slug, basis),
    e.DB.prepare('SELECT id, tiers, name, body, spoiler FROM tier_posts WHERE ranking = ? AND basis = ? AND ip_hash = ?').bind(slug, basis, me),
  ]);

  // distribution[candidate] = [D, C, B, A, S] の人数
  const distribution: Record<string, number[]> = {};
  for (const row of dist.results as { candidate: string; tier: number; n: number }[]) {
    (distribution[row.candidate] ??= [0, 0, 0, 0, 0])[row.tier - 1] = row.n;
  }
  const m = mine.results[0] as { id: number; tiers: string; name: string; body: string; spoiler: number } | undefined;
  return json({
    posts: (count.results[0] as { n: number })?.n ?? 0,
    distribution,
    // positions[candidate] = 投稿内の通し順位の合計と件数（平均順位の計算用）
    positions: Object.fromEntries((pos.results as { candidate: string; sum: number; n: number }[]).map((r) => [r.candidate, { sum: r.sum, n: r.n }])),
    mine: m ? { id: m.id, tiers: JSON.parse(m.tiers), name: m.name, body: m.body, spoiler: m.spoiler } : null,
  });
};

// ティア表の投稿。その勢の候補を全員、ちょうど1回ずつ置いていないと受け付けない。
export const POST: APIRoute = async (ctx) => {
  const e = env(ctx);
  if (!e.DB) return notReady();
  const b = await readBody(ctx);
  if (typeof b.website === 'string' && b.website.length > 0) return json({ ok: true });

  const slug = cleanId(b.r);
  const basis = cleanId(b.b);
  const r = slug ? await getRanking(slug) : undefined;
  if (!r || !basis || !hasBasis(r, basis)) return json({ error: 'bad_request' }, 400);

  const raw = (b.tiers ?? {}) as Record<string, unknown>;
  const expected = new Set(candidatesFor(r, basis).map((c) => c.id));
  const tiers: Record<string, string[]> = {};
  // 並び順に意味がある: S段の左端が1位、D段の右端が最下位
  const placed: { candidate: string; value: number; pos: number }[] = [];
  const seen = new Set<string>();
  for (const t of TIERS) {
    const list = Array.isArray(raw[t.id]) ? (raw[t.id] as unknown[]) : [];
    tiers[t.id] = [];
    for (const id of list) {
      if (typeof id !== 'string' || !expected.has(id) || seen.has(id)) {
        return json({ error: 'bad_tiers', message: 'ティア表の内容が正しくありません。ページを読み込み直してください。' }, 400);
      }
      seen.add(id);
      tiers[t.id].push(id);
      placed.push({ candidate: id, value: t.value, pos: placed.length + 1 });
    }
  }
  if (seen.size !== expected.size) {
    return json({ error: 'incomplete', message: `まだ並べていないキャラが${expected.size - seen.size}人います。全員並べると投稿できます。` }, 400);
  }

  const me = await ipHash(ctx, e);
  const now = Date.now();
  const recent = await e.DB.prepare('SELECT COUNT(*) AS n FROM tier_posts WHERE ip_hash = ? AND updated_at > ?')
    .bind(me, now - RATE_WINDOW_MS)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= RATE_MAX_POSTS) {
    return json({ error: 'rate_limited', message: '短い時間に投稿が続いています。少し時間をおいてください。' }, 429);
  }

  const name = displayName(b.name);
  const body = cleanText(b.body, BODY_MAX);
  const spoiler = b.spoiler === true || b.spoiler === 'on' ? 1 : 0;

  await e.DB.prepare(
    `INSERT INTO tier_posts (ranking, basis, ip_hash, tiers, name, body, spoiler, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ranking, basis, ip_hash) DO UPDATE SET
       tiers = excluded.tiers, name = excluded.name, body = excluded.body, spoiler = excluded.spoiler, updated_at = excluded.updated_at`
  )
    .bind(slug, basis, me, JSON.stringify(tiers), name, body, spoiler, now, now)
    .run();
  const post = await e.DB.prepare('SELECT id, created_at FROM tier_posts WHERE ranking = ? AND basis = ? AND ip_hash = ?')
    .bind(slug, basis, me)
    .first<{ id: number; created_at: number }>();
  if (!post) return json({ error: 'server' }, 500);

  await e.DB.batch([
    e.DB.prepare('DELETE FROM tier_placements WHERE post_id = ?').bind(post.id),
    ...placed.map((p) =>
      e.DB.prepare('INSERT INTO tier_placements (post_id, ranking, basis, candidate, tier, pos) VALUES (?, ?, ?, ?, ?, ?)').bind(post.id, slug, basis, p.candidate, p.value, p.pos)
    ),
  ]);

  return json({ ok: true, post: { id: post.id, tiers, name, body, spoiler, created_at: post.created_at, updated_at: now, good: 0, bad: 0, my_vote: null } });
};
