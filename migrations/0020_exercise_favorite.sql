-- Übungen lassen sich als Favorit markieren, um sie in der Bibliothek und im
-- Übungswähler zuerst zu finden.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0020_exercise_favorite.sql

ALTER TABLE exercises ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
