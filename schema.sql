-- Steps: der Anfangsstand der Datenbank — NICHT der heutige.
--
-- Diese Datei endet beim Wochenziel (Migration 0006). Alles danach steht in
-- migrations/, unter anderem die users-Tabelle: ohne sie scheitert jede
-- Anfrage. Sie hier nachzuziehen wäre eine zweite Wahrheit neben den
-- Migrationen, und zwei Wahrheiten driften.
--
-- Anwenden also immer in zwei Schritten:
--   npx wrangler d1 execute luhabit --remote --file=./schema.sql
--   for f in migrations/*.sql; do npx wrangler d1 execute luhabit --remote --file="$f"; done
--
-- Ein paar "duplicate column"-Fehler dabei sind erwartet: die frühen
-- Migrationen stecken schon hier drin. `node scripts/audit-sql.mjs` baut
-- dieselbe Reihenfolge lokal auf und prüft, dass am Ende alle Tabellen stehen.

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
  target REAL NOT NULL,
  weekly_target REAL
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
  kind TEXT NOT NULL DEFAULT 'counter', -- 'counter' | 'toggle' (Ja/Nein)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO custom_habits (id, label, unit, icon, default_goal, quick_add, step, kind, created_at) VALUES
  ('steps', 'Schritte', 'Schritte', 'Footprints', 10000, '[1000,2500,5000]', 500, 'counter', '2020-01-01 00:00:00'),
  ('water', 'Wasser', 'ml', 'Droplets', 2000, '[250,500,750]', 50, 'counter', '2020-01-01 00:00:01'),
  ('coffee', 'Kaffee', 'Tassen', 'Coffee', 3, '[1]', 1, 'counter', '2020-01-01 00:00:02'),
  ('training', 'Training', 'Minuten', 'Dumbbell', 30, '[15,30,45]', 5, 'counter', '2020-01-01 00:00:03'),
  ('reading', 'Lesen', 'Minuten', 'BookOpen', 20, '[5,10,15]', 5, 'counter', '2020-01-01 00:00:04'),
  ('writing', 'Schreiben', 'Minuten', 'PenLine', 15, '[5,10,15]', 5, 'counter', '2020-01-01 00:00:05');
-- Trainingsbereich: Übungsbibliothek, Pläne, Einheiten und Sätze.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0005_training.sql

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle TEXT NOT NULL,
  equipment TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  increment REAL,
  bodyweight_factor REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises (muscle);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_days (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  weekday INTEGER
);

CREATE INDEX IF NOT EXISTS idx_plan_days_plan ON plan_days (plan_id, position);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  sets INTEGER NOT NULL DEFAULT 3,
  rep_min INTEGER NOT NULL DEFAULT 8,
  rep_max INTEGER NOT NULL DEFAULT 12,
  rest_seconds INTEGER NOT NULL DEFAULT 120,
  increment REAL,
  start_weight REAL
);

CREATE INDEX IF NOT EXISTS idx_plan_exercises_day ON plan_exercises (day_id, position);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  day_id TEXT,
  day_name TEXT NOT NULL,
  date TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  duration_seconds INTEGER,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON workout_sessions (date DESC);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sets_session ON workout_sets (session_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON workout_sets (exercise_id);

INSERT OR IGNORE INTO exercises
  (id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor)
VALUES
  ('bankdruecken-lh', 'Bankdrücken (Langhantel)', 'chest', 'barbell', 0, 0, NULL, 0.6),
  ('schraegbank-lh', 'Schrägbankdrücken (Langhantel)', 'chest', 'barbell', 0, 0, NULL, 0.5),
  ('negativbank-lh', 'Negativbankdrücken (Langhantel)', 'chest', 'barbell', 0, 0, NULL, 0.55),
  ('bankdruecken-kh', 'Bankdrücken (Kurzhantel)', 'chest', 'dumbbell', 0, 0, NULL, 0.22),
  ('schraegbank-kh', 'Schrägbankdrücken (Kurzhantel)', 'chest', 'dumbbell', 0, 0, NULL, 0.18),
  ('fliegende-kh', 'Fliegende (Kurzhantel)', 'chest', 'dumbbell', 0, 0, NULL, 0.1),
  ('schraegbank-fliegende', 'Schrägbank-Fliegende', 'chest', 'dumbbell', 0, 0, NULL, 0.09),
  ('butterfly', 'Butterfly (Maschine)', 'chest', 'machine', 0, 0, NULL, 0.35),
  ('brustpresse', 'Brustpresse (Maschine)', 'chest', 'machine', 0, 0, NULL, 0.5),
  ('kabelzug-fliegende', 'Kabelzug-Fliegende', 'chest', 'cable', 0, 0, NULL, 0.12),
  ('dips-brust', 'Dips (brustbetont)', 'chest', 'bodyweight', 0, 0, NULL, NULL),
  ('liegestuetze', 'Liegestütze', 'chest', 'bodyweight', 0, 0, NULL, NULL),
  ('schraegbank-multipresse', 'Schrägbankdrücken (Multipresse)', 'chest', 'machine', 0, 0, NULL, 0.45),
  ('kreuzheben', 'Kreuzheben', 'back', 'barbell', 0, 0, NULL, 1.0),
  ('rack-pulls', 'Rack Pulls', 'back', 'barbell', 0, 0, NULL, 1.1),
  ('langhantelrudern', 'Langhantelrudern', 'back', 'barbell', 0, 0, NULL, 0.5),
  ('t-bar-rudern', 'T-Bar-Rudern', 'back', 'barbell', 0, 0, NULL, 0.45),
  ('kurzhantelrudern', 'Kurzhantelrudern (einarmig)', 'back', 'dumbbell', 0, 0, NULL, 0.25),
  ('klimmzuege', 'Klimmzüge', 'back', 'bodyweight', 0, 0, NULL, NULL),
  ('latzug-breit', 'Latzug (breit)', 'back', 'cable', 0, 0, NULL, 0.55),
  ('latzug-eng', 'Latzug (eng, Untergriff)', 'back', 'cable', 0, 0, NULL, 0.55),
  ('rudern-kabel', 'Rudern am Kabel (sitzend)', 'back', 'cable', 0, 0, NULL, 0.55),
  ('rudermaschine', 'Rudermaschine', 'back', 'machine', 0, 0, NULL, 0.55),
  ('ueberzuege-kabel', 'Überzüge (Kabel)', 'back', 'cable', 0, 0, NULL, 0.3),
  ('hyperextensions', 'Hyperextensions', 'back', 'bodyweight', 0, 0, NULL, NULL),
  ('shrugs-kh', 'Shrugs (Kurzhantel)', 'back', 'dumbbell', 0, 0, NULL, 0.3),
  ('shrugs-lh', 'Shrugs (Langhantel)', 'back', 'barbell', 0, 0, NULL, 0.5),
  ('schulterdruecken-lh', 'Schulterdrücken (Langhantel)', 'shoulders', 'barbell', 0, 0, NULL, 0.4),
  ('schulterdruecken-kh', 'Schulterdrücken (Kurzhantel)', 'shoulders', 'dumbbell', 0, 0, NULL, 0.15),
  ('schulterpresse-maschine', 'Schulterpresse (Maschine)', 'shoulders', 'machine', 0, 0, NULL, 0.4),
  ('arnold-press', 'Arnold Press', 'shoulders', 'dumbbell', 0, 0, NULL, 0.14),
  ('seitheben-kh', 'Seitheben (Kurzhantel)', 'shoulders', 'dumbbell', 0, 0, NULL, 0.08),
  ('seitheben-kabel', 'Seitheben (Kabel)', 'shoulders', 'cable', 0, 0, NULL, 0.08),
  ('frontheben-kh', 'Frontheben (Kurzhantel)', 'shoulders', 'dumbbell', 0, 0, NULL, 0.08),
  ('vorgebeugtes-seitheben', 'Vorgebeugtes Seitheben', 'shoulders', 'dumbbell', 0, 0, NULL, 0.07),
  ('reverse-butterfly', 'Reverse Butterfly', 'shoulders', 'machine', 0, 0, NULL, 0.25),
  ('face-pulls', 'Face Pulls', 'shoulders', 'cable', 0, 0, NULL, 0.25),
  ('aufrechtes-rudern', 'Aufrechtes Rudern', 'shoulders', 'barbell', 0, 0, NULL, 0.3),
  ('langhantelcurls', 'Langhantel-Curls', 'biceps', 'barbell', 0, 0, NULL, 0.3),
  ('sz-curls', 'SZ-Curls', 'biceps', 'barbell', 0, 0, NULL, 0.28),
  ('kurzhantelcurls', 'Kurzhantel-Curls', 'biceps', 'dumbbell', 0, 0, NULL, 0.12),
  ('hammercurls', 'Hammercurls', 'biceps', 'dumbbell', 0, 0, NULL, 0.13),
  ('scottcurls', 'Scott-Curls', 'biceps', 'barbell', 0, 0, NULL, 0.22),
  ('kabelcurls', 'Kabel-Curls', 'biceps', 'cable', 0, 0, NULL, 0.25),
  ('konzentrationscurls', 'Konzentrationscurls', 'biceps', 'dumbbell', 0, 0, NULL, 0.1),
  ('reverse-curls', 'Reverse Curls', 'biceps', 'barbell', 0, 0, NULL, 0.2),
  ('curlmaschine', 'Curl-Maschine', 'biceps', 'machine', 0, 0, NULL, 0.25),
  ('engbankdruecken', 'Enges Bankdrücken', 'triceps', 'barbell', 0, 0, NULL, 0.45),
  ('dips-trizeps', 'Dips (trizepsbetont)', 'triceps', 'bodyweight', 0, 0, NULL, NULL),
  ('bankdips', 'Bankdips', 'triceps', 'bodyweight', 0, 0, NULL, NULL),
  ('trizepsdruecken-kabel', 'Trizepsdrücken am Kabel', 'triceps', 'cable', 0, 0, NULL, 0.3),
  ('trizepsdruecken-seil', 'Trizepsdrücken (Seil)', 'triceps', 'cable', 0, 0, NULL, 0.25),
  ('french-press', 'French Press (SZ)', 'triceps', 'barbell', 0, 0, NULL, 0.2),
  ('overhead-trizeps-kh', 'Überkopf-Trizeps (Kurzhantel)', 'triceps', 'dumbbell', 0, 0, NULL, 0.15),
  ('kickbacks', 'Kickbacks', 'triceps', 'dumbbell', 0, 0, NULL, 0.08),
  ('dipmaschine', 'Dip-Maschine', 'triceps', 'machine', 0, 0, NULL, 0.4),
  ('kniebeugen', 'Kniebeugen (Langhantel)', 'quads', 'barbell', 0, 0, NULL, 0.75),
  ('frontkniebeugen', 'Frontkniebeugen', 'quads', 'barbell', 0, 0, NULL, 0.55),
  ('multipresse-kniebeuge', 'Kniebeuge (Multipresse)', 'quads', 'machine', 0, 0, NULL, 0.7),
  ('beinpresse', 'Beinpresse', 'quads', 'machine', 0, 0, NULL, 1.5),
  ('hackenschmidt', 'Hackenschmidt-Kniebeuge', 'quads', 'machine', 0, 0, NULL, 0.9),
  ('beinstrecker', 'Beinstrecker', 'quads', 'machine', 0, 0, NULL, 0.5),
  ('ausfallschritte-kh', 'Ausfallschritte (Kurzhantel)', 'quads', 'dumbbell', 0, 0, NULL, 0.2),
  ('bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', 'dumbbell', 0, 0, NULL, 0.2),
  ('goblet-squat', 'Goblet Squat', 'quads', 'dumbbell', 0, 0, NULL, 0.3),
  ('step-ups', 'Step-Ups', 'quads', 'dumbbell', 0, 0, NULL, 0.15),
  ('sissy-squat', 'Sissy Squat', 'quads', 'bodyweight', 0, 0, NULL, NULL),
  ('rumaenisches-kreuzheben', 'Rumänisches Kreuzheben', 'hamstrings', 'barbell', 0, 0, NULL, 0.7),
  ('rumaenisches-kreuzheben-kh', 'Rumänisches Kreuzheben (Kurzhantel)', 'hamstrings', 'dumbbell', 0, 0, NULL, 0.3),
  ('beinbeuger-liegend', 'Beinbeuger (liegend)', 'hamstrings', 'machine', 0, 0, NULL, 0.35),
  ('beinbeuger-sitzend', 'Beinbeuger (sitzend)', 'hamstrings', 'machine', 0, 0, NULL, 0.4),
  ('good-mornings', 'Good Mornings', 'hamstrings', 'barbell', 0, 0, NULL, 0.4),
  ('nordic-curls', 'Nordic Curls', 'hamstrings', 'bodyweight', 0, 0, NULL, NULL),
  ('hip-thrust', 'Hip Thrust', 'glutes', 'barbell', 0, 0, NULL, 0.9),
  ('glute-bridge', 'Glute Bridge', 'glutes', 'barbell', 0, 0, NULL, 0.7),
  ('glute-kickbacks-kabel', 'Glute Kickbacks (Kabel)', 'glutes', 'cable', 0, 0, NULL, 0.15),
  ('abduktoren', 'Abduktoren-Maschine', 'glutes', 'machine', 0, 0, NULL, 0.4),
  ('adduktoren', 'Adduktoren-Maschine', 'glutes', 'machine', 0, 0, NULL, 0.4),
  ('wadenheben-stehend', 'Wadenheben (stehend)', 'calves', 'machine', 0, 0, NULL, 0.8),
  ('wadenheben-sitzend', 'Wadenheben (sitzend)', 'calves', 'machine', 0, 0, NULL, 0.5),
  ('wadenheben-beinpresse', 'Wadenheben (Beinpresse)', 'calves', 'machine', 0, 0, NULL, 1.0),
  ('wadenheben-kh', 'Wadenheben (Kurzhantel)', 'calves', 'dumbbell', 0, 0, NULL, 0.3),
  ('crunches', 'Crunches', 'core', 'bodyweight', 0, 0, NULL, NULL),
  ('beinheben-haengend', 'Hängendes Beinheben', 'core', 'bodyweight', 0, 0, NULL, NULL),
  ('plank', 'Plank', 'core', 'bodyweight', 0, 0, NULL, NULL),
  ('side-plank', 'Side Plank', 'core', 'bodyweight', 0, 0, NULL, NULL),
  ('russian-twists', 'Russian Twists', 'core', 'dumbbell', 0, 0, NULL, 0.1),
  ('kabel-crunches', 'Kabel-Crunches', 'core', 'cable', 0, 0, NULL, 0.3),
  ('ab-wheel', 'Ab Wheel', 'core', 'bodyweight', 0, 0, NULL, NULL),
  ('bauchmaschine', 'Bauchmaschine', 'core', 'machine', 0, 0, NULL, 0.35);

INSERT OR IGNORE INTO workout_plans (id, name, is_active, position) VALUES ('plan-ppl', 'Push / Pull / Legs', 1, 0);

INSERT OR IGNORE INTO plan_days (id, plan_id, name, position, weekday) VALUES
  ('day-ppl-push', 'plan-ppl', 'Push', 0, NULL),
  ('day-ppl-pull', 'plan-ppl', 'Pull', 1, NULL),
  ('day-ppl-legs', 'plan-ppl', 'Legs', 2, NULL);

INSERT OR IGNORE INTO plan_exercises
  (id, day_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, increment, start_weight)
VALUES
  ('pe-day-ppl-push-0', 'day-ppl-push', 'bankdruecken-lh', 0, 3, 8, 12, 150, NULL, NULL),
  ('pe-day-ppl-push-1', 'day-ppl-push', 'schraegbank-kh', 1, 3, 8, 12, 120, NULL, NULL),
  ('pe-day-ppl-push-2', 'day-ppl-push', 'schulterdruecken-kh', 2, 3, 8, 12, 120, NULL, NULL),
  ('pe-day-ppl-push-3', 'day-ppl-push', 'seitheben-kh', 3, 3, 10, 15, 75, NULL, NULL),
  ('pe-day-ppl-push-4', 'day-ppl-push', 'trizepsdruecken-seil', 4, 3, 10, 15, 75, NULL, NULL),
  ('pe-day-ppl-push-5', 'day-ppl-push', 'dips-trizeps', 5, 3, 8, 12, 90, NULL, NULL),
  ('pe-day-ppl-pull-0', 'day-ppl-pull', 'klimmzuege', 0, 3, 6, 12, 150, NULL, NULL),
  ('pe-day-ppl-pull-1', 'day-ppl-pull', 'langhantelrudern', 1, 3, 8, 12, 150, NULL, NULL),
  ('pe-day-ppl-pull-2', 'day-ppl-pull', 'latzug-breit', 2, 3, 8, 12, 120, NULL, NULL),
  ('pe-day-ppl-pull-3', 'day-ppl-pull', 'rudern-kabel', 3, 3, 8, 12, 120, NULL, NULL),
  ('pe-day-ppl-pull-4', 'day-ppl-pull', 'face-pulls', 4, 3, 12, 15, 75, NULL, NULL),
  ('pe-day-ppl-pull-5', 'day-ppl-pull', 'sz-curls', 5, 3, 8, 12, 90, NULL, NULL),
  ('pe-day-ppl-legs-0', 'day-ppl-legs', 'kniebeugen', 0, 4, 8, 12, 180, NULL, NULL),
  ('pe-day-ppl-legs-1', 'day-ppl-legs', 'rumaenisches-kreuzheben', 1, 3, 8, 12, 150, NULL, NULL),
  ('pe-day-ppl-legs-2', 'day-ppl-legs', 'beinpresse', 2, 3, 10, 15, 120, NULL, NULL),
  ('pe-day-ppl-legs-3', 'day-ppl-legs', 'beinbeuger-liegend', 3, 3, 10, 15, 90, NULL, NULL),
  ('pe-day-ppl-legs-4', 'day-ppl-legs', 'wadenheben-stehend', 4, 4, 12, 20, 60, NULL, NULL),
  ('pe-day-ppl-legs-5', 'day-ppl-legs', 'beinheben-haengend', 5, 3, 10, 15, 60, NULL, NULL);

-- Wochenziel je Plan: wie viele Einheiten pro Woche angestrebt werden.
-- Ersetzt die Idee von Ruhetagen im Plan — die Rotation bleibt frei, das
-- Wochenziel misst die Frequenz.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0006_plan_weekly_target.sql

ALTER TABLE workout_plans ADD COLUMN weekly_target INTEGER;

UPDATE workout_plans SET weekly_target = 3 WHERE id = 'plan-ppl' AND weekly_target IS NULL;

