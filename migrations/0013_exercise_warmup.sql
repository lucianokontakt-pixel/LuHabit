-- Wie eine Übung zu Aufwärmsätzen steht: automatisch entscheiden, immer, oder nie.
--
-- NULL heißt: die Automatik entscheidet (erste Übung des Tages, sonst ab einem
-- Arbeitsgewicht). 'always' und 'never' überschreiben das je Übung — nötig für
-- Übungen, die trotz niedrigem Gewicht eine Rampe brauchen (oder umgekehrt).
-- Eigengewichtsübungen bekommen nie eine Rampe: da gibt es kein Gewicht, das
-- man abstufen könnte.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0013_exercise_warmup.sql

ALTER TABLE exercises ADD COLUMN warmup TEXT;

UPDATE exercises SET warmup = 'never' WHERE equipment = 'bodyweight';
