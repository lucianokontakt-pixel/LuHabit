-- Ersetzt favorite (Boolean) und hidden (Boolean) durch eine einzige
-- Geschmacksskala: taste von -2 bis +2.
--   -2 nie (später über den Ausblenden-Grund-Dialog) · -1 stört mich ·
--    0 neutral · +1 beliebt · +2 Kern.
-- taste <= -1 heißt ausgeblendet, taste >= +1 heißt immer sichtbar — damit hat
-- Sortierung und Sichtbarkeit nur noch eine Quelle statt zwei Booleans.
--
-- Die alten Spalten bleiben stehen, unbenutzt: ein ALTER TABLE DROP COLUMN
-- ist auf einer Live-Datenbank ein Risiko ohne Nutzen, das Backfill hier
-- reicht.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0026_exercise_taste.sql

ALTER TABLE exercises ADD COLUMN taste INTEGER NOT NULL DEFAULT 0;

UPDATE exercises SET taste = 1 WHERE favorite = 1;
UPDATE exercises SET taste = -1 WHERE hidden = 1 AND favorite = 0;
