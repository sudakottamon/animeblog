// 判定理由が「評価は変わらない」系なのに点数が前の勢と違うものを、前の勢の点数にそろえる。
// 使い方: node scripts/fix-inherit-scores.mjs <slug> [slug ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { parseDocument } from 'yaml';

const INHERIT = /据え置|評価を変える材料はない|評価は変わらない/;
for (const slug of process.argv.slice(2)) {
  const path = new URL(`../src/content/rankings/${slug}.yaml`, import.meta.url);
  const doc = parseDocument(readFileSync(path, 'utf8'));
  const order = doc.toJS().bases.map((b) => b.id);
  let fixed = 0;
  doc.get('candidates').items.forEach((cand) => {
    const editor = cand.get('editor');
    if (!editor) return;
    order.forEach((b, i) => {
      if (i === 0) return;
      const cur = editor.get(b);
      const prev = editor.get(order[i - 1]);
      if (!cur || !prev) return;
      if (INHERIT.test(cur.get('note') ?? '') && cur.get('score') !== prev.get('score')) {
        cur.set('score', prev.get('score'));
        fixed++;
      }
    });
  });
  if (fixed) writeFileSync(path, doc.toString({ lineWidth: 0 }));
  console.log(`${slug}: ${fixed}件そろえた`);
}
