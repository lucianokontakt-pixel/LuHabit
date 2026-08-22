-- Aufwärmsätze als solche markieren.
--
-- Bisher musste die App raten, welcher Satz Arbeit war: "der schwerste zählt".
-- Das machte aus einer Rampe 12,5/15/17,5 kg drei Sätze auf 17,5 kg und ließ
-- Aufwärmsätze in den Wochen-Satzzähler, ins Volumen und in die Dichte
-- einfließen. Jetzt sagt es der Nutzer selbst.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0011_warmup_sets.sql

ALTER TABLE workout_sets ADD COLUMN warmup INTEGER NOT NULL DEFAULT 0;
