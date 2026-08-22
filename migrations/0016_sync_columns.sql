-- Unterbau für den Abgleich zwischen Handy und Server.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0016_sync_columns.sql
--
-- Zwei Spalten auf jeder Tabelle, die für sich abgeglichen wird:
--
--   updated_at  Wann dieser Datensatz zuletzt geändert wurde. Der Abgleich
--               fragt "gib mir alles seit X" — ohne diese Spalte müsste jedes
--               Mal der ganze Bestand übertragen werden.
--   deleted_at  Grabstein statt echtem Löschen. Eine gelöschte Zeile, die
--               verschwindet, ist vom Handy aus nicht von einer Zeile zu
--               unterscheiden, die es noch nie gab — sie käme beim nächsten
--               Abgleich fröhlich zurück.
--
-- Kindtabellen (plan_days, plan_exercises, workout_sets) bekommen bewusst
-- keine eigenen Stempel: ein Plan und eine Einheit werden immer als Ganzes
-- gelesen und als Ganzes ersetzt. Sie hängen am Zeitstempel ihres Elternteils.
--
-- body_profile bleibt außen vor: es hat sein updated_at schon (0009) und ein
-- Profil wird nie gelöscht, nur überschrieben.
--
-- SQLite erlaubt bei ADD COLUMN keinen Vorgabewert, der sich errechnet
-- (datetime('now') geht also nicht). Deshalb: Spalte leer anlegen, danach
-- einmalig füllen. Ab jetzt setzt die Anwendung den Stempel bei jedem
-- Schreibvorgang selbst.

ALTER TABLE entries ADD COLUMN updated_at TEXT;
ALTER TABLE entries ADD COLUMN deleted_at TEXT;
UPDATE entries SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entries_sync ON entries (user_id, updated_at);

ALTER TABLE goals ADD COLUMN updated_at TEXT;
ALTER TABLE goals ADD COLUMN deleted_at TEXT;
UPDATE goals SET updated_at = datetime('now') WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_sync ON goals (user_id, updated_at);

ALTER TABLE custom_habits ADD COLUMN updated_at TEXT;
ALTER TABLE custom_habits ADD COLUMN deleted_at TEXT;
UPDATE custom_habits SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_habits_sync ON custom_habits (user_id, updated_at);

ALTER TABLE exercises ADD COLUMN updated_at TEXT;
ALTER TABLE exercises ADD COLUMN deleted_at TEXT;
UPDATE exercises SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_sync ON exercises (user_id, updated_at);

ALTER TABLE workout_plans ADD COLUMN updated_at TEXT;
ALTER TABLE workout_plans ADD COLUMN deleted_at TEXT;
UPDATE workout_plans SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_plans_sync ON workout_plans (user_id, updated_at);

ALTER TABLE workout_sessions ADD COLUMN updated_at TEXT;
ALTER TABLE workout_sessions ADD COLUMN deleted_at TEXT;
UPDATE workout_sessions SET updated_at = COALESCE(started_at, datetime('now')) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_sync ON workout_sessions (user_id, updated_at);

ALTER TABLE emom_templates ADD COLUMN updated_at TEXT;
ALTER TABLE emom_templates ADD COLUMN deleted_at TEXT;
UPDATE emom_templates SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_emom_templates_sync ON emom_templates (user_id, updated_at);
