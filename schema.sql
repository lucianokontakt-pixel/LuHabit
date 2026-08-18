-- LuHabit D1 schema
-- Apply with: npx wrangler d1 execute luhabit --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (habit, date)
);

CREATE INDEX IF NOT EXISTS idx_entries_habit_date ON entries (habit, date);

CREATE TABLE IF NOT EXISTS goals (
  habit TEXT PRIMARY KEY,
  target REAL NOT NULL
);

INSERT OR IGNORE INTO goals (habit, target) VALUES
  ('steps', 10000),
  ('water', 2000),
  ('coffee', 3),
  ('training', 30),
  ('reading', 20),
  ('writing', 15);

-- Vom Nutzer selbst angelegte Mini-Habits ("Todos" mit Zahlen-Ziel)
CREATE TABLE IF NOT EXISTS custom_habits (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Target',
  default_goal REAL NOT NULL,
  quick_add TEXT NOT NULL, -- JSON-Array, z.B. "[5,10,15]"
  step REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO custom_habits (id, label, unit, icon, default_goal, quick_add, step, created_at) VALUES
  ('steps', 'Schritte', 'Schritte', 'Footprints', 10000, '[1000,2500,5000]', 500, '2020-01-01 00:00:00'),
  ('water', 'Wasser', 'ml', 'Droplets', 2000, '[250,500,750]', 50, '2020-01-01 00:00:01'),
  ('coffee', 'Kaffee', 'Tassen', 'Coffee', 3, '[1]', 1, '2020-01-01 00:00:02'),
  ('training', 'Training', 'Minuten', 'Dumbbell', 30, '[15,30,45]', 5, '2020-01-01 00:00:03'),
  ('reading', 'Lesen', 'Minuten', 'BookOpen', 20, '[5,10,15]', 5, '2020-01-01 00:00:04'),
  ('writing', 'Schreiben', 'Minuten', 'PenLine', 15, '[5,10,15]', 5, '2020-01-01 00:00:05');
