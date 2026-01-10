DROP TABLE IF EXISTS links;
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER,
  max_visits INTEGER,
  note TEXT
);

DROP TABLE IF EXISTS visits;
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT,
  referer TEXT,
  visit_time INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_slug ON links(slug);

-- Settings table for storing configuration (e.g., daily_limit)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Insert default limit if not exists (default: 0 means unlimited, or set a specific number like 50)
INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_limit', '100');
