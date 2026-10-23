// ティアの定義。value は集計に使う点数（S=5 … D=1）。
export const TIERS = [
  { id: 'S', value: 5, color: '#e5482f' },
  { id: 'A', value: 4, color: '#f08a24' },
  { id: 'B', value: 3, color: '#e0b100' },
  { id: 'C', value: 2, color: '#6e9a3f' },
  { id: 'D', value: 1, color: '#5b7b9a' },
] as const;

export type TierId = (typeof TIERS)[number]['id'];

export const tierByValue = (v: number) => TIERS.find((t) => t.value === v)!;

// 運営の判定（100点満点）をティアに直す
export function editorTier(score: number): TierId {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

