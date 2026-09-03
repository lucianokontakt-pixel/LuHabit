-- Die Übungsbibliothek wechselt von openGym auf RepDB.
--
-- Die Übungs-IDs ändern sich damit vollständig ("og-0025" → "bench-press").
-- Pläne und Verlauf zeigen aber auf die alten — diese Migration zieht sie um.
--
-- Welche Übung welche wird, steht in lib/repdb-migration.ts; diese Datei ist
-- daraus erzeugt (scripts/repdb-migration-bauen.mjs) und wird nicht von Hand
-- bearbeitet. 32 der 40 benutzten Übungen haben ein Gegenstück, 8 nicht — die
-- bleiben als eigene Übung bestehen, mit Namen und Verlauf.
--
-- Anwenden mit:
--   npx wrangler d1 execute luhabit --remote --file=./migrations/0024_repdb_katalog.sql

-- Erst die 8 ohne Gegenstück retten. Eine Katalogübung, die nie verstellt
-- wurde, hat keine Zeile in exercises — nach dem Wechsel kennt der Katalog sie
-- nicht mehr, und ohne Zeile fiele sie ersatzlos aus Plan und Statistik. Also
-- eine Zeile anlegen, für jeden Nutzer, der sie benutzt (INSERT ... SELECT
-- DISTINCT über beide Quellen), und als eigene Übung markieren.

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-1299', 'Lever Incline Chest Press', 'chest', 'machine', 1, 0, 0.5, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-1299'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-1299'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-1299';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0588', 'Lever Narrow Grip Seated Row', 'back', 'machine', 1, 0, 0.55, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0588'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0588'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0588';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0861', 'Cable Seated Row', 'back', 'cable', 1, 0, 0.55, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0861'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0861'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0861';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0203', 'Cable Rear Delt Row (With Rope)', 'shoulders', 'cable', 1, 0, 0.13, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0203'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0203'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0203';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0602', 'Lever Seated Reverse Fly', 'shoulders', 'machine', 1, 0, 0.2, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0602'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0602'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0602';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0194', 'Cable Overhead Triceps Extension (Rope Attachment)', 'triceps', 'cable', 1, 0, 0.3, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0194'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0194'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0194';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0243', 'Cable Twist', 'core', 'cable', 1, 0, 0.3, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0243'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0243'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0243';

INSERT OR IGNORE INTO exercises
  (user_id, id, name, muscle, equipment, is_custom, hidden, bodyweight_factor, load_factor, favorite)
SELECT nutzer, 'og-0198', 'Cable Pulldown', 'back', 'cable', 1, 0, 0.55, NULL, 0
FROM (
  SELECT DISTINCT user_id AS nutzer FROM plan_exercises WHERE exercise_id = 'og-0198'
  UNION
  SELECT DISTINCT user_id AS nutzer FROM workout_sets WHERE exercise_id = 'og-0198'
);
-- Wer die Übung schon einmal verstellt hatte, hat bereits eine Zeile; die
-- bekommt der INSERT oben nicht zu fassen. Sie ist ab jetzt trotzdem eine
-- eigene Übung — der Katalog kennt sie nicht mehr.
UPDATE exercises SET is_custom = 1, updated_at = datetime('now') WHERE id = 'og-0198';

-- Jetzt der Umzug. Die Reihenfolge ist egal, die Ziel-IDs sind neu und können
-- deshalb mit nichts kollidieren — anders als beim ersten Anlauf im August, wo
-- zwei alte Übungen dieselbe neue bekamen und SQLite über (user_id, id)
-- stolperte. Dass keine zwei aufs selbe Ziel zeigen, prüft ein Test.

-- Barbell Bench Press → bench-press
UPDATE plan_exercises SET exercise_id = 'bench-press' WHERE exercise_id = 'og-0025';
UPDATE workout_sets  SET exercise_id = 'bench-press' WHERE exercise_id = 'og-0025';
UPDATE exercises     SET id = 'bench-press', updated_at = datetime('now') WHERE id = 'og-0025';

-- Barbell Bent Over Row → barbell-row
UPDATE plan_exercises SET exercise_id = 'barbell-row' WHERE exercise_id = 'og-0027';
UPDATE workout_sets  SET exercise_id = 'barbell-row' WHERE exercise_id = 'og-0027';
UPDATE exercises     SET id = 'barbell-row', updated_at = datetime('now') WHERE id = 'og-0027';

-- Barbell Full Squat → squat
UPDATE plan_exercises SET exercise_id = 'squat' WHERE exercise_id = 'og-0043';
UPDATE workout_sets  SET exercise_id = 'squat' WHERE exercise_id = 'og-0043';
UPDATE exercises     SET id = 'squat', updated_at = datetime('now') WHERE id = 'og-0043';

-- Barbell Romanian Deadlift → romanian-deadlift
UPDATE plan_exercises SET exercise_id = 'romanian-deadlift' WHERE exercise_id = 'og-0085';
UPDATE workout_sets  SET exercise_id = 'romanian-deadlift' WHERE exercise_id = 'og-0085';
UPDATE exercises     SET id = 'romanian-deadlift', updated_at = datetime('now') WHERE id = 'og-0085';

-- Cable Bar Lateral Pulldown → lat-pulldown
UPDATE plan_exercises SET exercise_id = 'lat-pulldown' WHERE exercise_id = 'og-0150';
UPDATE workout_sets  SET exercise_id = 'lat-pulldown' WHERE exercise_id = 'og-0150';
UPDATE exercises     SET id = 'lat-pulldown', updated_at = datetime('now') WHERE id = 'og-0150';

-- Cable Hammer Curl (With Rope) → cable-hammer-curl
UPDATE plan_exercises SET exercise_id = 'cable-hammer-curl' WHERE exercise_id = 'og-0165';
UPDATE workout_sets  SET exercise_id = 'cable-hammer-curl' WHERE exercise_id = 'og-0165';
UPDATE exercises     SET id = 'cable-hammer-curl', updated_at = datetime('now') WHERE id = 'og-0165';

-- Cable Kneeling Crunch → cable-crunch
UPDATE plan_exercises SET exercise_id = 'cable-crunch' WHERE exercise_id = 'og-0175';
UPDATE workout_sets  SET exercise_id = 'cable-crunch' WHERE exercise_id = 'og-0175';
UPDATE exercises     SET id = 'cable-crunch', updated_at = datetime('now') WHERE id = 'og-0175';

-- Cable One Arm Lateral Raise → cable-lateral-raise
UPDATE plan_exercises SET exercise_id = 'cable-lateral-raise' WHERE exercise_id = 'og-0192';
UPDATE workout_sets  SET exercise_id = 'cable-lateral-raise' WHERE exercise_id = 'og-0192';
UPDATE exercises     SET id = 'cable-lateral-raise', updated_at = datetime('now') WHERE id = 'og-0192';

-- Cable Pushdown (Straight Arm) V. 2 → straight-arm-pulldown
UPDATE plan_exercises SET exercise_id = 'straight-arm-pulldown' WHERE exercise_id = 'og-0199';
UPDATE workout_sets  SET exercise_id = 'straight-arm-pulldown' WHERE exercise_id = 'og-0199';
UPDATE exercises     SET id = 'straight-arm-pulldown', updated_at = datetime('now') WHERE id = 'og-0199';

-- Cable Pushdown (With Rope Attachment) → tricep-pushdown
UPDATE plan_exercises SET exercise_id = 'tricep-pushdown' WHERE exercise_id = 'og-0200';
UPDATE workout_sets  SET exercise_id = 'tricep-pushdown' WHERE exercise_id = 'og-0200';
UPDATE exercises     SET id = 'tricep-pushdown', updated_at = datetime('now') WHERE id = 'og-0200';

-- Dumbbell Incline Bench Press → incline-db-press
UPDATE plan_exercises SET exercise_id = 'incline-db-press' WHERE exercise_id = 'og-0314';
UPDATE workout_sets  SET exercise_id = 'incline-db-press' WHERE exercise_id = 'og-0314';
UPDATE exercises     SET id = 'incline-db-press', updated_at = datetime('now') WHERE id = 'og-0314';

-- Dumbbell Lateral Raise → lateral-raise
UPDATE plan_exercises SET exercise_id = 'lateral-raise' WHERE exercise_id = 'og-0334';
UPDATE workout_sets  SET exercise_id = 'lateral-raise' WHERE exercise_id = 'og-0334';
UPDATE exercises     SET id = 'lateral-raise', updated_at = datetime('now') WHERE id = 'og-0334';

-- Dumbbell Seated Shoulder Press → seated-db-press
UPDATE plan_exercises SET exercise_id = 'seated-db-press' WHERE exercise_id = 'og-0405';
UPDATE workout_sets  SET exercise_id = 'seated-db-press' WHERE exercise_id = 'og-0405';
UPDATE exercises     SET id = 'seated-db-press', updated_at = datetime('now') WHERE id = 'og-0405';

-- Ez Barbell Curl → ez-bar-curl
UPDATE plan_exercises SET exercise_id = 'ez-bar-curl' WHERE exercise_id = 'og-0447';
UPDATE workout_sets  SET exercise_id = 'ez-bar-curl' WHERE exercise_id = 'og-0447';
UPDATE exercises     SET id = 'ez-bar-curl', updated_at = datetime('now') WHERE id = 'og-0447';

-- Hanging Leg Raise → hanging-leg-raise
UPDATE plan_exercises SET exercise_id = 'hanging-leg-raise' WHERE exercise_id = 'og-0472';
UPDATE workout_sets  SET exercise_id = 'hanging-leg-raise' WHERE exercise_id = 'og-0472';
UPDATE exercises     SET id = 'hanging-leg-raise', updated_at = datetime('now') WHERE id = 'og-0472';

-- Lever Back Extension → machine-back-extension
UPDATE plan_exercises SET exercise_id = 'machine-back-extension' WHERE exercise_id = 'og-0573';
UPDATE workout_sets  SET exercise_id = 'machine-back-extension' WHERE exercise_id = 'og-0573';
UPDATE exercises     SET id = 'machine-back-extension', updated_at = datetime('now') WHERE id = 'og-0573';

-- Lever Chest Press → chest-press-machine
UPDATE plan_exercises SET exercise_id = 'chest-press-machine' WHERE exercise_id = 'og-0576';
UPDATE workout_sets  SET exercise_id = 'chest-press-machine' WHERE exercise_id = 'og-0576';
UPDATE exercises     SET id = 'chest-press-machine', updated_at = datetime('now') WHERE id = 'og-0576';

-- Lever Leg Extension → leg-extension
UPDATE plan_exercises SET exercise_id = 'leg-extension' WHERE exercise_id = 'og-0585';
UPDATE workout_sets  SET exercise_id = 'leg-extension' WHERE exercise_id = 'og-0585';
UPDATE exercises     SET id = 'leg-extension', updated_at = datetime('now') WHERE id = 'og-0585';

-- Lever Lying Leg Curl → leg-curl
UPDATE plan_exercises SET exercise_id = 'leg-curl' WHERE exercise_id = 'og-0586';
UPDATE workout_sets  SET exercise_id = 'leg-curl' WHERE exercise_id = 'og-0586';
UPDATE exercises     SET id = 'leg-curl', updated_at = datetime('now') WHERE id = 'og-0586';

-- Lever Seated Calf Raise → seated-calf-raise
UPDATE plan_exercises SET exercise_id = 'seated-calf-raise' WHERE exercise_id = 'og-0594';
UPDATE workout_sets  SET exercise_id = 'seated-calf-raise' WHERE exercise_id = 'og-0594';
UPDATE exercises     SET id = 'seated-calf-raise', updated_at = datetime('now') WHERE id = 'og-0594';

-- Lever Seated Fly → machine-chest-fly
UPDATE plan_exercises SET exercise_id = 'machine-chest-fly' WHERE exercise_id = 'og-0596';
UPDATE workout_sets  SET exercise_id = 'machine-chest-fly' WHERE exercise_id = 'og-0596';
UPDATE exercises     SET id = 'machine-chest-fly', updated_at = datetime('now') WHERE id = 'og-0596';

-- Lever Seated Leg Curl → seated-leg-curl
UPDATE plan_exercises SET exercise_id = 'seated-leg-curl' WHERE exercise_id = 'og-0599';
UPDATE workout_sets  SET exercise_id = 'seated-leg-curl' WHERE exercise_id = 'og-0599';
UPDATE exercises     SET id = 'seated-leg-curl', updated_at = datetime('now') WHERE id = 'og-0599';

-- Lever Shrug → plate-loaded-shrug
UPDATE plan_exercises SET exercise_id = 'plate-loaded-shrug' WHERE exercise_id = 'og-0604';
UPDATE workout_sets  SET exercise_id = 'plate-loaded-shrug' WHERE exercise_id = 'og-0604';
UPDATE exercises     SET id = 'plate-loaded-shrug', updated_at = datetime('now') WHERE id = 'og-0604';

-- Lever Standing Calf Raise → standing-calf-raise
UPDATE plan_exercises SET exercise_id = 'standing-calf-raise' WHERE exercise_id = 'og-0605';
UPDATE workout_sets  SET exercise_id = 'standing-calf-raise' WHERE exercise_id = 'og-0605';
UPDATE exercises     SET id = 'standing-calf-raise', updated_at = datetime('now') WHERE id = 'og-0605';

-- Pull-Up → pull-up
UPDATE plan_exercises SET exercise_id = 'pull-up' WHERE exercise_id = 'og-0652';
UPDATE workout_sets  SET exercise_id = 'pull-up' WHERE exercise_id = 'og-0652';
UPDATE exercises     SET id = 'pull-up', updated_at = datetime('now') WHERE id = 'og-0652';

-- Sled 45° Leg Press → leg-press
UPDATE plan_exercises SET exercise_id = 'leg-press' WHERE exercise_id = 'og-0739';
UPDATE workout_sets  SET exercise_id = 'leg-press' WHERE exercise_id = 'og-0739';
UPDATE exercises     SET id = 'leg-press', updated_at = datetime('now') WHERE id = 'og-0739';

-- Cable Curl → cable-curl
UPDATE plan_exercises SET exercise_id = 'cable-curl' WHERE exercise_id = 'og-0868';
UPDATE workout_sets  SET exercise_id = 'cable-curl' WHERE exercise_id = 'og-0868';
UPDATE exercises     SET id = 'cable-curl', updated_at = datetime('now') WHERE id = 'og-0868';

-- Lever Shoulder Press V. 2 → machine-shoulder-press
UPDATE plan_exercises SET exercise_id = 'machine-shoulder-press' WHERE exercise_id = 'og-0869';
UPDATE workout_sets  SET exercise_id = 'machine-shoulder-press' WHERE exercise_id = 'og-0869';
UPDATE exercises     SET id = 'machine-shoulder-press', updated_at = datetime('now') WHERE id = 'og-0869';

-- Lever Seated Row → seated-cable-row
UPDATE plan_exercises SET exercise_id = 'seated-cable-row' WHERE exercise_id = 'og-1350';
UPDATE workout_sets  SET exercise_id = 'seated-cable-row' WHERE exercise_id = 'og-1350';
UPDATE exercises     SET id = 'seated-cable-row', updated_at = datetime('now') WHERE id = 'og-1350';

-- Lever Seated Crunch → machine-seated-crunch
UPDATE plan_exercises SET exercise_id = 'machine-seated-crunch' WHERE exercise_id = 'og-1452';
UPDATE workout_sets  SET exercise_id = 'machine-seated-crunch' WHERE exercise_id = 'og-1452';
UPDATE exercises     SET id = 'machine-seated-crunch', updated_at = datetime('now') WHERE id = 'og-1452';

-- Cable Rear Delt Row (Stirrups) → face-pull
UPDATE plan_exercises SET exercise_id = 'face-pull' WHERE exercise_id = 'og-0202';
UPDATE workout_sets  SET exercise_id = 'face-pull' WHERE exercise_id = 'og-0202';
UPDATE exercises     SET id = 'face-pull', updated_at = datetime('now') WHERE id = 'og-0202';

-- Triceps Dip → bench-dips
UPDATE plan_exercises SET exercise_id = 'bench-dips' WHERE exercise_id = 'og-0814';
UPDATE workout_sets  SET exercise_id = 'bench-dips' WHERE exercise_id = 'og-0814';
UPDATE exercises     SET id = 'bench-dips', updated_at = datetime('now') WHERE id = 'og-0814';

-- Zum Schluss aufräumen. Übrig bleiben Zeilen mit alter ID, die weder in
-- einem Plan noch in einer Einheit vorkommen: Reste früherer Versuche, ohne
-- Favorit, Stufe oder eigene Ladeart. Ohne Katalogeintrag stünden sie ab jetzt
-- als eigene Übungen in der Bibliothek — Namen ohne Bild, die nie jemand
-- angelegt hat.
--
-- Die Bedingung prüft die Verwendung selbst, statt einer Liste zu vertrauen:
-- was benutzt wird, überlebt, auch wenn die Liste oben etwas übersehen hätte.
--
-- Als Grabstein, nicht als DELETE: die App ist local-first, jedes Gerät hält
-- eine eigene Kopie, und der Abgleich holt nur, was sich seit dem letzten Mal
-- geändert hat (app/api/sync/route.ts). Eine hart gelöschte Zeile ändert sich
-- nicht mehr — sie bliebe auf jedem Gerät stehen, das sie schon kennt.
UPDATE exercises
SET deleted_at = datetime('now'), updated_at = datetime('now')
WHERE id LIKE 'og-%'
  AND deleted_at IS NULL
  AND id NOT IN (SELECT exercise_id FROM plan_exercises)
  AND id NOT IN (SELECT exercise_id FROM workout_sets);
