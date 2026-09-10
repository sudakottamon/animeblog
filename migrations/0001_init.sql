-- 投票: 1人（IPハッシュ）につき1記事1票。投票し直しは上書き。
CREATE TABLE IF NOT EXISTS votes (
  slug TEXT NOT NULL,
  choice TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_votes_slug ON votes (slug);

-- コメント: 匿名可。hidden=1 で非表示（モデレーション用）。
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments (slug, created_at);

-- コメントへの「同意」リアクション
CREATE TABLE IF NOT EXISTS reactions (
  comment_id INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (comment_id, ip_hash)
);
