-- Eine eigene Beliebtheitsstufe je Übung, 1 bis 5.
--
-- Der Katalog schätzt die Stufe selbst (siehe scripts/exercise-beliebtheit.mjs)
-- — aus Gerät und Name, also aus Vermutungen. Diese Spalte ist das Urteil, das
-- die Vermutung schlägt. NULL heißt "keins gefällt", dann gilt die Schätzung.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0021_exercise_rating.sql

ALTER TABLE exercises ADD COLUMN rating INTEGER;
