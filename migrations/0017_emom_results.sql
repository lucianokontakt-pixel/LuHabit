-- EMOM-Ergebnisse: abgeschlossene Durchgänge, protokolliert für den Verlauf.
--
-- Der Name der Vorlage steht als Momentaufnahme in template_name statt als
-- Fremdschlüssel — dieselbe Wahl wie day_name bei workout_sessions. Die
-- Vorlage kann inzwischen umbenannt, geändert oder gelöscht sein; das
-- Ergebnis soll trotzdem noch zeigen, was damals gelaufen ist.
--
-- rounds_completed kann unter rounds_planned liegen: wer abbricht, bevor der
-- Durchgang durch ist, trägt ein, wie weit er gekommen ist. Das war zunächst
-- bewusst nicht vorgesehen (siehe 0014_emom_templates.sql) — dieser Wunsch
-- kam von Luciano nachträglich dazu.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0017_emom_results.sql

CREATE TABLE IF NOT EXISTS emom_results (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  date TEXT NOT NULL,
  rounds_planned INTEGER NOT NULL DEFAULT 0,
  rounds_completed INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_emom_results_user ON emom_results (user_id, date DESC, created_at DESC);
