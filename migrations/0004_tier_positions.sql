-- 投稿の中での通し順位（S段の左端が1位）。同じ段の中の並び順を集計に使う。
ALTER TABLE tier_placements ADD COLUMN pos INTEGER;
