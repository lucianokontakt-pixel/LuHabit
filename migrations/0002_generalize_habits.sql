-- Entfernt die feste CHECK-Liste von entries/goals (jetzt beliebige Habit-IDs erlaubt)
-- und legt die custom_habits Tabelle für selbst erstellte Mini-Habits an.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0002_generalize_habits.sql

CREATE TABLE entries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (habit, date)
);
INSERT INTO entries_new SELECT * FROM entries;
DROP TABLE entries;
ALTER TABLE entries_new RENAME TO entries;
CREATE INDEX IF NOT EXISTS idx_entries_habit_date ON entries (habit, date);

CREATE TABLE goals_new (
  habit TEXT PRIMARY KEY,
  target REAL NOT NULL
);
INSERT INTO goals_new SELECT * FROM goals;
DROP TABLE goals;
ALTER TABLE goals_new RENAME TO goals;

INSERT OR IGNORE INTO goals (habit, target) VALUES
  ('reading', 20),
  ('writing', 15);

CREATE TABLE IF NOT EXISTS custom_habits (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Target',
  default_goal REAL NOT NULL,
  quick_add TEXT NOT NULL,
  step REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
