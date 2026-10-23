// ランキングデータ（src/content/rankings/*.yaml）の点検。
// スキーマの型チェックはビルドで行うので、ここではネタバレ漏れや偏りなど中身の問題を見る。
// 使い方: node scripts/check-rankings.mjs [slug ...]
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const dir = new URL('../src/content/rankings/', import.meta.url);
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') && (!only.length || only.includes(f.replace(/\.yaml$/, ''))));
const BANNED = ['と言えるでしょう', '圧倒的な', 'まさに', 'でしょう。', '間違いなく', '最強クラスの', '！'];
const tierOf = (s) => (s >= 90 ? 'S' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : 'D');

let problems = 0;
for (const f of files) {
  const issues = [];
  const warn = (m) => issues.push(m);
  let d;
  try {
    d = parse(readFileSync(new URL(f, dir), 'utf8'));
  } catch (e) {
    console.log(`\n■ ${f}\n  ✗ YAMLとして読めません: ${e.message.split('\n')[0]}`);
    problems++;
    continue;
  }
  const order = (d.bases ?? []).map((b) => b.id);
  const cands = d.candidates ?? [];
  const ids = new Set();

  for (const c of cands) {
    if (ids.has(c.id)) warn(`id重複: ${c.id}`);
    ids.add(c.id);
    const from = order.indexOf(c.appears ?? 'anime');
    if (from < 0) warn(`${c.name}: appears=${c.appears} が bases にない`);
    order.forEach((b, i) => {
      const j = c.editor?.[b];
      if (i >= from && !j) warn(`${c.name}: ${b} の判定がない`);
      if (i < from && j) warn(`${c.name}: 登場前の ${b} に判定がある（ネタバレの恐れ）`);
      if (j && typeof j.note === 'string') {
        if (j.note.length > 90) warn(`${c.name}(${b}): 判定理由が長い（${j.note.length}字）`);
        for (const w of BANNED) if (j.note.includes(w)) warn(`${c.name}(${b}): 避ける言い回し「${w}」`);
        // 引用符なしの「第9話: …」は YAML でオブジェクトになるので、ビルドと同じく文字列に戻して見る
        const ev = (Array.isArray(j.evidence) ? j.evidence : []).map((e) =>
          e && typeof e === 'object' ? Object.entries(e).map(([k, v]) => `${k}: ${v}`).join(' ') : e
        );
        const inherits = i > from && /据え置|評価を変える材料はない|評価は変わらない/.test(j.note);
        if (inherits) {
          const prev = c.editor?.[order[i - 1]];
          if (prev && prev.score !== j.score) warn(`${c.name}(${b}): 「評価は変わらない」なのに点数が前の勢と違う（${prev.score}→${j.score}）`);
        }
        if (!ev.length && !inherits) warn(`${c.name}(${b}): 根拠（evidence）がない`);
        if (ev.length > 5) warn(`${c.name}(${b}): 根拠が多すぎる（${ev.length}件）`);
        for (const e of ev) {
          if (typeof e !== 'string') { warn(`${c.name}(${b}): 根拠が文字列でない`); continue; }
          if (!/[:：]/.test(e)) warn(`${c.name}(${b}): 根拠に「どこで:」がない「${e.slice(0, 20)}…」`);
          if (e.length > 90) warn(`${c.name}(${b}): 根拠が長い（${e.length}字）`);
          for (const w of BANNED) if (e.includes(w)) warn(`${c.name}(${b}): 根拠に避ける言い回し「${w}」`);
        }
      }
    });
  }

  // 前の勢の判定理由に、後の勢で初登場するキャラの名前が出ていないか
  order.forEach((b, i) => {
    const later = cands.filter((c) => order.indexOf(c.appears ?? 'anime') > i);
    for (const c of cands) {
      const note = [c.editor?.[b]?.note ?? '', ...(c.editor?.[b]?.evidence ?? []).map((e) => (typeof e === 'string' ? e : JSON.stringify(e)))].join(' ');
      for (const l of later) {
        const short = l.name.replace(/[・（(].*$/, '');
        if (short.length >= 2 && note.includes(short)) warn(`${c.name}(${b}): 後の勢で登場する「${l.name}」に触れている（ネタバレの恐れ）`);
      }
    }
  });

  // ティアの偏り
  for (const b of order) {
    const scores = cands.filter((c) => c.editor?.[b]).map((c) => c.editor[b].score);
    const tiers = new Set(scores.map(tierOf));
    if (scores.length && tiers.size < 3) warn(`${b}: ティアが${[...tiers].join('')}だけに偏っている`);
    const s = scores.filter((x) => x >= 90).length;
    if (s > scores.length * 0.4) warn(`${b}: Sが${s}/${scores.length}人で多すぎる`);
  }
  if (cands.length < 12) warn(`候補が${cands.length}人と少ない`);
  if (cands.length > 24) warn(`候補が${cands.length}人と多い（並べる負担が大きい）`);

  const per = order.map((b) => `${b}:${cands.filter((c) => order.indexOf(c.appears ?? 'anime') <= order.indexOf(b)).length}人`).join(' ');
  console.log(`\n■ ${f}  [${order.join(' > ')}]  ${per}`);
  (d.bases ?? []).forEach((b) => console.log(`  ${b.label}: ${b.range}`));
  if (issues.length) {
    problems += issues.length;
    issues.forEach((m) => console.log(`  ✗ ${m}`));
  } else console.log('  ✓ 問題なし');
}
console.log(`\n${files.length}作品 / 指摘 ${problems}件`);
process.exitCode = problems ? 1 : 0;
