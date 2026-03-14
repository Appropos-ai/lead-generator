CREATE TABLE IF NOT EXISTS leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  linkedin_url  TEXT,
  company       TEXT,
  title         TEXT,
  source        TEXT,
  notes         TEXT,
  stage         TEXT NOT NULL DEFAULT 'new'
                CHECK(stage IN ('new','contacted','responded','converted','lost')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outreach_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  channel    TEXT NOT NULL CHECK(channel IN ('email','linkedin')),
  status     TEXT NOT NULL CHECK(status IN ('sent','replied','bounced')),
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plugin_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  plugin_name   TEXT NOT NULL,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  status        TEXT NOT NULL DEFAULT 'running'
                CHECK(status IN ('running','completed','failed')),
  leads_found   INTEGER DEFAULT 0,
  leads_added   INTEGER DEFAULT 0,
  error_message TEXT
);
