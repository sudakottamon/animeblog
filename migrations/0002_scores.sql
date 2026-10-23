-- キャラごとの採点（1〜100点）。勢（basis: anime/manga/novel）ごとに別集計。
-- 1人（IPハッシュ）につき1勢1キャラ1件、採点し直しは上書き。
CREATE TABLE IF NOT EXISTS scores (
  ranking TEXT NOT NULL,
  basis TEXT NOT NULL,
  candidate TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 100),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (ranking, basis, candidate, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_scores_ranking ON scores (ranking, basis, candidate);

-- キャラごとのコメント。採点と一緒に投稿する。score は投稿時点の採点。
-- 勢ごとに分けて表示する（アニメ勢に原作のネタバレが混ざらないように）。
CREATE TABLE IF NOT EXISTS cand_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ranking TEXT NOT NULL,
  basis TEXT NOT NULL,
  candidate TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  score INTEGER,
  spoiler INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cc_cand ON cand_comments (ranking, basis, candidate, created_at);
CREATE INDEX IF NOT EXISTS idx_cc_recent ON cand_comments (created_at);

-- コメントへの 👍(+1) / 👎(-1)
CREATE TABLE IF NOT EXISTS comment_votes (
  comment_id INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (comment_id, ip_hash)
);

-- 通報
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (comment_id, ip_hash)
);
