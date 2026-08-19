-- Mehrbenutzer-Umbau: jede Datentabelle bekommt eine user_id.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0007_multi_user.sql
--
-- Die bisherigen Daten gehören alle einer Person und werden dem festen
-- Datensatz 'usr_owner' zugeordnet. Wer beim Login zu diesem Datensatz wird,
-- entscheidet OWNER_EMAIL in der Umgebung — passt die Mailadresse, übernimmt
-- man den Bestand, jede andere Adresse bekommt ein leeres Konto.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  provider TEXT NOT NULL DEFAULT 'google',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Platzhalter-Adresse: wird beim ersten Login des Owners überschrieben.
INSERT OR IGNORE INTO users (id, email, name, provider)
VALUES ('usr_owner', 'owner@luhabit.local', 'Owner', 'passcode');

-- ---------------------------------------------------------------------------
-- Tabellen mit geändertem Schlüssel müssen neu gebaut werden (SQLite kann
-- weder Primärschlüssel noch UNIQUE-Constraints nachträglich ändern).
-- ---------------------------------------------------------------------------

CREATE TABLE entries_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  habit TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, habit, date)
);
INSERT INTO entries_new (id, user_id, habit, date, value, created_at)
  SELECT id, 'usr_owner', habit, date, value, created_at FROM entries;
DROP TABLE entries;
ALTER TABLE entries_new RENAME TO entries;
CREATE INDEX IF NOT EXISTS idx_entries_user_habit_date ON entries (user_id, habit, date);

CREATE TABLE goals_new (
  user_id TEXT NOT NULL,
  habit TEXT NOT NULL,
  target REAL NOT NULL,
  weekly_target REAL,
  PRIMARY KEY (user_id, habit)
);
INSERT INTO goals_new (user_id, habit, target, weekly_target)
  SELECT 'usr_owner', habit, target, weekly_target FROM goals;
DROP TABLE goals;
ALTER TABLE goals_new RENAME TO goals;

CREATE TABLE custom_habits_new (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Target',
  default_goal REAL NOT NULL,
  quick_add TEXT NOT NULL,
  step REAL NOT NULL DEFAULT 1,
  kind TEXT NOT NULL DEFAULT 'counter',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, id)
);
INSERT INTO custom_habits_new
  (user_id, id, label, unit, icon, default_goal, quick_add, step, kind, created_at)
  SELECT 'usr_owner', id, label, unit, icon, default_goal, quick_add, step, kind, created_at
    FROM custom_habits;
DROP TABLE custom_habits;
ALTER TABLE custom_habits_new RENAME TO custom_habits;

CREATE TABLE exercises_new (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  equipment TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  increment REAL,
  bodyweight_factor REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, id)
);
INSERT INTO exercises_new
  (user_id, id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor, created_at)
  SELECT 'usr_owner', id, name, muscle, equipment, is_custom, hidden, increment,
         bodyweight_factor, created_at
    FROM exercises;
DROP TABLE exercises;
ALTER TABLE exercises_new RENAME TO exercises;
CREATE INDEX IF NOT EXISTS idx_exercises_user_muscle ON exercises (user_id, muscle);

-- ---------------------------------------------------------------------------
-- Tabellen mit zufälligen IDs brauchen nur eine zusätzliche Spalte.
-- ---------------------------------------------------------------------------

ALTER TABLE workout_plans ADD COLUMN user_id TEXT NOT NULL DEFAULT 'usr_owner';
ALTER TABLE plan_days ADD COLUMN user_id TEXT NOT NULL DEFAULT 'usr_owner';
ALTER TABLE plan_exercises ADD COLUMN user_id TEXT NOT NULL DEFAULT 'usr_owner';
ALTER TABLE workout_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'usr_owner';
ALTER TABLE workout_sets ADD COLUMN user_id TEXT NOT NULL DEFAULT 'usr_owner';

CREATE INDEX IF NOT EXISTS idx_plans_user ON workout_plans (user_id, position);
CREATE INDEX IF NOT EXISTS idx_plan_days_user ON plan_days (user_id, plan_id, position);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_user ON plan_exercises (user_id, day_id, position);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON workout_sessions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sets_user_session ON workout_sets (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sets_user_exercise ON workout_sets (user_id, exercise_id);
