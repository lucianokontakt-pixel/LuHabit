-- Pause zwischen den Runden: 0 heißt aus, sonst Sekunden zwischen zwei
-- Runden — nicht zwischen Schritten innerhalb einer Runde, das bleibt der
-- Schritt-Sekunden selbst vorbehalten.
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0015_emom_rest_seconds.sql

ALTER TABLE emom_templates ADD COLUMN rest_seconds INTEGER NOT NULL DEFAULT 0;
