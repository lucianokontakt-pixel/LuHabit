-- Fügt Ja/Nein-Habits (kind) und optionale Wochenziele (weekly_target) hinzu.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0004_habit_kind_and_weekly_goal.sql

ALTER TABLE custom_habits ADD COLUMN kind TEXT NOT NULL DEFAULT 'counter';
ALTER TABLE goals ADD COLUMN weekly_target REAL;
