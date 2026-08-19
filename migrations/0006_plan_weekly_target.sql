-- Wochenziel je Plan: wie viele Einheiten pro Woche angestrebt werden.
-- Ersetzt die Idee von Ruhetagen im Plan — die Rotation bleibt frei, das
-- Wochenziel misst die Frequenz.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0006_plan_weekly_target.sql

ALTER TABLE workout_plans ADD COLUMN weekly_target INTEGER;

UPDATE workout_plans SET weekly_target = 3 WHERE id = 'plan-ppl' AND weekly_target IS NULL;
