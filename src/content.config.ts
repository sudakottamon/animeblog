import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// anime: アニメ / manga: 漫画（小説原作ならコミカライズ） / novel: 原作小説 / original: 原作がWeb漫画など別にある場合（例: ワンパンマンのONE版）
export const BASES = ['anime', 'manga', 'novel', 'original'] as const;
const basisId = z.enum(BASES);

const editorJudgment = z.object({
  score: z.number().int().min(1).max(100),
  note: z.string(),
  // 判定の根拠になった場面。「どこで（話数・巻・章）: 何が起きたか」を1件1文で。その勢の範囲の場面だけ。
  // YAML で引用符なしの「第9話: …」は { 第9話: … } と読まれるので、その形も文字列に戻して受け取る
  evidence: z
    .array(
      z.union([
        z.string(),
        z.record(z.string(), z.string()).transform((o) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(' ')),
      ])
    )
    .max(5)
    .default([]),
});

const rankings = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/rankings' }),
  schema: z.object({
    work: z.string(),
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    // 勢の並びは「情報量が少ない順」。後ろの勢ほど先の展開まで含む。
    bases: z
      .array(
        z.object({
          id: basisId,
          label: z.string(),
          range: z.string(),
        })
      )
      .min(1),
    candidates: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          name: z.string(),
          affiliation: z.string().optional(),
          cv: z.string().optional(),
          // この勢から登場する（それより前の勢には出さない）
          appears: basisId.default('anime'),
          editor: z.record(basisId, editorJudgment).default({}),
        })
      )
      .min(2),
    services: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
  }),
});

export const collections = { rankings };
