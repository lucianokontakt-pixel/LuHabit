-- Wie viel Körpergewicht eine Eigengewichtsübung tatsächlich bewegt.
--
-- Bisher zählte ein Klimmzugsatz mit 0 kg ins Volumen — ein kompletter Pull-Tag
-- trug damit nichts bei. Der Faktor ist bewusst getrennt von bodyweight_factor,
-- das den Startgewichts-Vorschlag steuert und etwas anderes bedeutet.
--
-- NULL heißt: kein Körpergewicht im Spiel, es zählt nur die Hantel.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0012_exercise_load_factor.sql

ALTER TABLE exercises ADD COLUMN load_factor REAL;

UPDATE exercises SET load_factor = 1.0  WHERE id = 'klimmzuege';
UPDATE exercises SET load_factor = 0.95 WHERE id IN ('dips-brust', 'dips-trizeps');
UPDATE exercises SET load_factor = 0.65 WHERE id = 'liegestuetze';
UPDATE exercises SET load_factor = 0.6  WHERE id IN ('sissy-squat', 'nordic-curls');
UPDATE exercises SET load_factor = 0.5  WHERE id = 'hyperextensions';
UPDATE exercises SET load_factor = 0.45 WHERE id = 'beinheben-haengend';
UPDATE exercises SET load_factor = 0.4  WHERE id IN ('bankdips', 'ab-wheel');
UPDATE exercises SET load_factor = 0.3  WHERE id = 'crunches';

-- Plank und Side Plank werden in Sekunden gemessen, nicht in Wiederholungen.
-- Ein kg-Wert wäre dort erfunden.
UPDATE exercises SET load_factor = 0 WHERE id IN ('plank', 'side-plank');
