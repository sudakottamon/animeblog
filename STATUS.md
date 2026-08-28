# STATUS — アニメ配信ナビ

最終更新: 2026-08-28（ティック9）

記事数: 18本（watch12 / ranking4 / guide2）＋マネーページ。ビルド22ページ。
データ照合済み: DMM TV無料期間は14日間（30日は旧情報。2026-08-28に全記事修正済み）。
SEO基盤: OGP・JSON-LD（BlogPosting）・robots.txt・sitemap・canonical 実装済み。
記事化済み: フリーレン / 鬼滅無限城 / 呪術3期 / チェンソーマンレゼ篇 / 無職転生Ⅲ / BLEACH TYBW / 逃げ上手2期 / SPY×FAMILY / 薬屋 / ダンダダン
候補: ワンピース / 片田舎のおっさんII / 攻殻機動隊 / 進撃の巨人 / ヒロアカ / 推しの子
時事メモ: 薬屋3期 2026-10-02開始・劇場版2026年12月 → 10月に記事更新。レゼ篇 2026-09-19 Prime独占開始 → 当日更新。
今期メモ: 2026夏の注目=無職転生Ⅲ（照合済み・記事化済み）/ BLEACH禍進譚 / 逃げ上手2期 / 片田舎のおっさんII / 攻殻機動隊 → 個別記事の候補。
時事メモ: チェンソーマン レゼ篇が2026-09-19にPrime Video独占配信開始予定 → 配信開始日に記事更新すること。

## 現在の状態

- [x] 事業計画（PLAN.md）
- [x] Astroサイト実装・ビルド成功（7ページ）
- [x] シード記事3本（guide×2, ranking×1）＋マネーページ（/vod/）
- [x] ステマ規制対応（全ページPR表記）、about/privacy整備
- [x] 作品別「どこで見れる」記事 2本（フリーレン2期／鬼滅・無限城編、配信状況はWeb照合済み 2026-08-28）
- [ ] 作品記事の量産継続（次: 今期アニメ・SPY×FAMILY・呪術廻戦など検索ボリューム大の作品）
- [ ] 鬼滅・無限城編の配信解禁を検知したら記事更新（定期照合）
- [ ] デプロイ（ユーザーのアカウント作業待ち）
- [ ] ASP登録（ユーザー作業待ち）→ `src/data/affiliates.json` の affiliateUrl に貼るだけ

## 公開情報（2026-08-28 デプロイ完了）

- 本番URL: https://animeblog.kyoukarabokuha.workers.dev/
- GitHub: https://github.com/sudakottamon/animeblog （main へ push で自動デプロイ）
- 認証: gh CLI = sudakottamon。リモートURLにユーザー名を明示して認証固定済み
- 以降、各ティックの末尾で commit + push する（自動反映）

## ユーザーにお願いしたい作業（残り）

1. **A8.netへ登録**（無料・審査緩め）→ U-NEXT / DMM TV / ABEMA等の広告主に提携申請 → 発行リンクをClaudeに渡す（affiliates.jsonに反映して全記事に適用）
2. Google Search Console 登録（sitemap送信でインデックス促進）
3. 記事20〜30本たまったら もしもアフィリエイト / Amazonアソシエイト / AdSense 申請

## 次のティックでやること

1. WebSearchで現行シーズン・配信状況を照合し、/watch/ 作品記事を2〜3本執筆
2. affiliates.json の料金をWeb照合（lastVerified更新）
3. 記事量産を続ける（毎ティック2〜3本ペース）

## 運用ループの設計

- 各ティック: 記事執筆（配信状況はWeb照合）→ ビルド確認 → コミット →（デプロイ接続後はpush）
- 週次相当: 料金照合、リンク切れ確認、シーズン記事更新
