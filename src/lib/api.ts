import type { APIContext } from 'astro';

export type Env = {
  DB?: D1Database;
  IP_SALT?: string;
  ADMIN_TOKEN?: string;
};

export function env(ctx: APIContext): Env {
  return ((ctx.locals as any).runtime?.env ?? {}) as Env;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function notReady(): Response {
  return json({ error: 'not_ready', message: '投票所は準備中です' }, 503);
}

export async function ipHash(ctx: APIContext, e: Env): Promise<string> {
  const ip =
    ctx.request.headers.get('cf-connecting-ip') ??
    ctx.request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';
  const salt = e.IP_SALT ?? 'tsuyosa-gikai-default-salt';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function cleanSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/^\/+|\/+$/g, '');
  return /^[a-z0-9\-\/]{1,120}$/.test(s) ? s : null;
}

export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

export async function readBody(ctx: APIContext): Promise<Record<string, unknown>> {
  try {
    const ct = ctx.request.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return (await ctx.request.json()) as Record<string, unknown>;
    const fd = await ctx.request.formData();
    return Object.fromEntries(fd.entries());
  } catch {
    return {};
  }
}
