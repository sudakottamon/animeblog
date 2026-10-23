# STATUS — アニメ最強ランキング（anime.chottotools.com）

最終更新: 2026-10-23

## 現行の方針（2026-10-23、ユーザー決定）
- ドメイン: anime.chottotools.com（ちょこっとツールズのサブドメイン。本体 chottotools.com は別プロジェクトで、デザインは合わせない）
- 作り: ranking.net 型の参加型ランキング（参考: ranking.net/rankings/strongest-anime-characters）。稼ぐページは mybest 型（/vod/）
- 勢で分ける: アニメ勢／漫画勢／原作勢。漫画原作の作品は「漫画・原作勢」1タブ。タブごとに候補・運営判定・採点・コメントが別
- **ティア表方式（2026-10-23 ユーザー決定）**: 候補を全員 S〜D に並べきらないと投稿できない。1人1ランキング1勢1件・上書き可。表示は「みんなのティア表」（S=5〜D=1の平均、4.5/3.5/2.5/1.5で段分け）と「運営のティア表」（editor score 90/80/70/60で段分け）の切替。投稿5件未満は運営を初期表示。架空の投稿は入れない
- 投稿一覧（ミニティア表＋コメント、👍👎、通報5件で自動非表示）、投稿後にXシェアリンク
- 段の中の並び順に意味がある（左ほど強い）。tier_placements.pos に通し順位（S左端=1）を保存（0004）。みんなのティア表は段=平均点、段内=平均順位。作成画面は番号表示・選択中に段内のキャラをタップでその左に差し込み・◀▶ボタン・外す
- データ: src/content/rankings/*.yaml（bases / candidates[].appears / editor[basis]{score,note}）
- API: /api/tier/ (GET集計+自分の投稿 / POST投稿・全員配置を検証) /api/posts/ (GET一覧・PUT👍👎・DELETE管理) /api/report/ (POST通報) /api/summary/ (トップ用)
- DB: migrations/0003_tierlists.sql（tier_posts / tier_placements / tier_post_votes / tier_post_reports）本番適用済み。0002の点数制テーブルは未使用（残置）
- 旧 /saikyo/* は public/_redirects で /rankings/* に301
- 本番公開済み 2026-10-23: https://anime.chottotools.com/ （`npm run build` → `npx wrangler deploy`）。workers.dev は無効化（旧URLは使わない）
- ユーザーのPowerShellはnpx.ps1がブロックされる → 案内するときは `npx.cmd wrangler ...` と書く
- **最強ランキング専門（2026-10-23 ユーザー決定）**: 記事・VOD比較・読みものは削除（旧URLは public/_redirects で転送）。「ありとあらゆる作品」を追加していく方針
- 掲載198作品（2026-10-23、docs/WORKS_QUEUE.md の全29バッチ完了・本番反映済み）。データ作成はサブエージェント分担＋WebSearchで裏取り → `node scripts/check-rankings.mjs` で点検 → コミット → `scripts/deploy-committed.ps1`（HEADだけをビルドして deploy）
- 運営判定には根拠（evidence「どこで: 何が起きたか」）を付ける（2026-10-23 ユーザー指示）。仕様は docs/RANKING_GUIDE.md
- 弱い箇所（記憶ベース・未確認の範囲）は docs/VERIFY_TODO.md に作品ごとに記録。検証エージェントで順に潰す（WebSearch上限のため1ターン1体）
- **ユーザーが「見ていない作品」を後で指摘する → その作品のファイルを削除する**（2026-10-23 ユーザー指示）
- 表示側の補正: 「据え置く／評価を変える材料はない」だけの判定理由は前の勢の理由を引き継いで表示。勢が1つの作品は「〇〇勢別」を出さない
- 要フォロー:
  - BLEACH: TVアニメ最終話（第50話）が2026-10-26放送 → 放送後に勢を1つ（アニメ・漫画勢）に統合
  - ONE PIECE: 漫画・原作勢タブがアニメ勢と同内容（エルバフ編後半以降の原作描写を未反映）→ 原作の先の展開を調べて追記
  - 呪術廻戦: アニメ範囲が第2期まで → 第3期「死滅回游 前編」を反映
  - 東京卍リベンジャーズ: 三天戦争編がTV放送中 → 放送後にアニメ範囲を更新
  - ワンパンマン: ONE版タブは村田版の要素（オロチ等）も含む前提
- 次: 検証パス（VERIFY_TODO）を進める。新規追加はユーザーの削除指摘の後で検討

---
（以下は過去の記録）


最終更新: 2026-09-10

## 参加型化（2026-09-10、ユーザー決定）「みんなでわいわい」
- デザインv5: ポップ路線（Dela Gothic One見出し・クリーム地＋ネイビー罫＋赤/黄/青、ステッカー風オフセット影、吹き出しコメント）
- 投票（Poll.astro）＋コメント（Comments.astro、匿名可・👍同意・ハニーポット・10分5件レート制限）を実装
- バックエンド: @astrojs/cloudflare adapter + D1。API: /api/vote/ (GET/POST), /api/comments/ (GET/POST/PUT like/DELETE admin)
- 本番稼働中（2026-09-10 17:00）: D1 `tsuyosa-gikai`（id 83850745-…）をDBにバインド、マイグレーション適用済み、IP_SALT/ADMIN_TOKENはWorker secret（値は .dev.vars にローカル保管・gitignore）
- 過去のビルド失敗原因: dist/_worker.js をアセット公開しようとして拒否 → public/.assetsignore で解決
- Cloudflare認証: wrangler login 済み（kyoukarabokuha@gmail.com）。`npx wrangler deploy` で直接デプロイ可能
- ローカル検証: `npx wrangler dev --config wrangler.local.jsonc --port 8787`（ローカルD1、全API合格 2026-09-10）
- モデレーション: DELETE /api/comments/?id=N with Authorization: Bearer <ADMIN_TOKEN>（hidden=1にする）

## ピボット（2026-09-10、ユーザー決定）
「各作品の最強キャラランキング」特化サイトに全面転換。サイト名「強さ議会」。
- 新カテゴリ saikyo（最強議決）: アニメ基準＋原作基準の2部構成。原作パートは<details>でネタバレ隔離
- /rules/ = 議事規則（査定基準の全文公開）。全ランキングはこれに従う。判決文形式で書く
- 収益主導線を電子書籍アフィリエイトへ（affiliates.jsonにcmoa/ebookjapan/dmmbooks追加、type:ebook）。VODは副導線
- 既存の watch/ranking/guide 記事はSEO土台として存続
- 看板記事: /saikyo/jujutsu-kaisen/ と /saikyo/kimetsu/（フォーマットの見本）
- 次のsaikyo候補: ワンピース / ヒロアカ / フリーレン（魔法使い最強）/ ハンターハンター / ドラゴンボール / 呪術遡及（3期完結後改訂）
- gh認証注意: アクティブアカウントが karagechokopai-create の場合あり。pushは gh auth switch -u sudakottamon → push → switch back

デザイン: v4「深夜アニメの雑誌」路線（しっぽり明朝・縦書き表紙タイル・朱アクセント・紙色背景・罫線）。紫グラデ／ガラス風／ピル形状は禁止（AI生成の典型のため）。
文体: 全記事WRITING.md準拠（テンプレ骨格禁止・記事ごとに固有の切り口・書き手の感情/たとえ話/断定）。
記事数: 23本＋マネーページ。ビルド30ページ。
データ照合済み: DMM TV無料期間は14日間（2026-08-28修正）。Disney+はスタンダード1,250円/プレミアム1,670円（2026年3月改定）。
SEO基盤: OGP・JSON-LD・robots.txt・sitemap・canonical実装済み。

運用カレンダー（この予定で記事更新する）:
- 2026-09-19 レゼ篇アマプラ独占解禁 → /watch/chainsaw-man-reze/ と予定表を当日更新
- 2026-10-02 薬屋3期開始 → /watch/kusuriya/ 更新（配信先確定を照合）
- 2026-10-04 アオのハコ2期開始 → /watch/ao-no-hako/ 更新
- 2026年12月 薬屋劇場版公開
- 随時: 鬼滅無限城編のサブスク解禁を監視 → 解禁日に即更新（トラフィックの山）
- 予定表記事 /ranking/2026-fall-schedule/ は日付確定のたびに更新

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
