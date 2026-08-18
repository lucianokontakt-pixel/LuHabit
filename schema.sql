-- LuHabit D1 schema
-- Apply with: npx wrangler d1 execute luhabit --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit TEXT NOT NULL CHECK (habit IN ('steps', 'water', 'coffee', 'training')),
  date TEXT NOT NULL, -- YYYY-MM-DD
  value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (habit, date)
);

CREATE INDEX IF NOT EXISTS idx_entries_habit_date ON entries (habit, date);

CREATE TABLE IF NOT EXISTS goals (
  habit TEXT PRIMARY KEY CHECK (habit IN ('steps', 'water', 'coffee', 'training')),
  target REAL NOT NULL
);

INSERT OR IGNORE INTO goals (habit, target) VALUES
  ('steps', 10000),
  ('water', 2000),
  ('coffee', 3),
  ('training', 30);
