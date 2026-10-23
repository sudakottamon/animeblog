-- ティア表の投稿。1人（IPハッシュ）につき1ランキング1勢で1件、投稿し直しは上書き。
CREATE TABLE IF NOT EXISTS tier_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ranking TEXT NOT NULL,
  basis TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  tiers TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  spoiler INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  UNIQUE (ranking, basis, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_tp_feed ON tier_posts (ranking, basis, updated_at);
CREATE INDEX IF NOT EXISTS idx_tp_recent ON tier_posts (updated_at);

-- 集計用: 投稿ごとの各キャラの段（S=5 … D=1）
CREATE TABLE IF NOT EXISTS tier_placements (
  post_id INTEGER NOT NULL,
  ranking TEXT NOT NULL,
  basis TEXT NOT NULL,
  candidate TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
  PRIMARY KEY (post_id, candidate)
);
CREATE INDEX IF NOT EXISTS idx_tpl_agg ON tier_placements (ranking, basis, candidate);

-- 投稿への 👍(+1) / 👎(-1)
CREATE TABLE IF NOT EXISTS tier_post_votes (
  post_id INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, ip_hash)
);

-- 投稿への通報
CREATE TABLE IF NOT EXISTS tier_post_reports (
  post_id INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, ip_hash)
);
