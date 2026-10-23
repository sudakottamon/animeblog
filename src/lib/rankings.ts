import { getCollection, type CollectionEntry } from 'astro:content';

export type Ranking = CollectionEntry<'rankings'>;
export type Candidate = Ranking['data']['candidates'][number];

// 票が少ない候補がたまたま満点で首位にならないよう、50点の仮票を PRIOR 票ぶん混ぜて並べる。
export const PRIOR_VOTES = 3;
export const PRIOR_SCORE = 50;
export const adjusted = (sum: number, n: number) => (sum + PRIOR_VOTES * PRIOR_SCORE) / (n + PRIOR_VOTES);

export async function getRanking(slug: string): Promise<Ranking | undefined> {
  const all = await getCollection('rankings');
  return all.find((r) => r.id === slug);
}

// その勢で見えている候補だけを返す（後ろの勢で初登場するキャラはネタバレになるので除く）
export function candidatesFor(r: Ranking, basis: string): Candidate[] {
  const order = r.data.bases.map((b) => b.id as string);
  const at = order.indexOf(basis);
  if (at < 0) return [];
  return r.data.candidates.filter((c) => {
    const from = order.indexOf(c.appears);
    return from >= 0 && from <= at;
  });
}

export function hasBasis(r: Ranking, basis: string): boolean {
  return r.data.bases.some((b) => b.id === basis);
}
