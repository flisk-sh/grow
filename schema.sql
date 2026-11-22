CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, url TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS plans_url ON plans (url, created);
CREATE TABLE IF NOT EXISTS days (day TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, login TEXT, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, url TEXT NOT NULL, keywords TEXT NOT NULL DEFAULT '', plan_id TEXT, listened INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sites_user ON sites (user_id);
CREATE TABLE IF NOT EXISTS leads (site_id TEXT NOT NULL, url TEXT NOT NULL, source TEXT, title TEXT, text TEXT, author TEXT, author_url TEXT, at INTEGER, status TEXT NOT NULL DEFAULT 'new', found INTEGER, PRIMARY KEY (site_id, url));
CREATE TABLE IF NOT EXISTS listings (site_id TEXT NOT NULL, place TEXT NOT NULL, status TEXT NOT NULL, link TEXT, updated INTEGER, PRIMARY KEY (site_id, place));
CREATE TABLE IF NOT EXISTS posted (site_id TEXT NOT NULL, kind TEXT NOT NULL, job_id TEXT NOT NULL, link TEXT NOT NULL, title TEXT, at INTEGER NOT NULL, PRIMARY KEY (site_id, kind));
CREATE TABLE IF NOT EXISTS clicks (day TEXT NOT NULL, page TEXT NOT NULL, dev TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS clicks_page ON clicks (page, dev, day);

-- Thumbs and "did it work" per plan item (src/feedback.js). Read back only as counts.
CREATE TABLE IF NOT EXISTS feedback (day TEXT NOT NULL, plan TEXT NOT NULL, item TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS feedback_day ON feedback (day, kind);
