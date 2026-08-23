-- EMOM-Vorlagen: gespeicherte Intervall-Workouts für den Timer.
--
-- Eine Vorlage beschreibt eine Sequenz aus Schritten, die `rounds` mal
-- durchlaufen wird. Ein klassisches EMOM ist ein einzelner Schritt à 60
-- Sekunden bei 10 Runden; wechselnde Intervalle entstehen aus mehreren
-- Schritten mit unterschiedlicher Dauer, die reihum drankommen.
--
-- steps liegt als JSON-Array [{"seconds":60,"label":"12 Burpees"}] in einer
-- Spalte statt in einer eigenen Tabelle: die Liste ist kurz, wird immer nur
-- vollständig gelesen und vollständig ersetzt — eine Kindtabelle brächte hier
-- nur Joins ohne Gegenwert.
--
-- Ursprünglich wurde hier bewusst nichts protokolliert: der Timer war als
-- reines Werkzeug gedacht, kein Trainingstagebuch. Abgeschlossene Durchgänge
-- landen inzwischen trotzdem im Verlauf — siehe 0017_emom_results.sql.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0014_emom_templates.sql

CREATE TABLE IF NOT EXISTS emom_templates (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  prepare_seconds INTEGER NOT NULL DEFAULT 10,
  rounds INTEGER NOT NULL DEFAULT 10,
  steps TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_emom_templates_user ON emom_templates (user_id, position);
