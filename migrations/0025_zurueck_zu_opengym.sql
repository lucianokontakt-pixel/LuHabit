-- Zurück zur openGym-Bibliothek.
--
-- Migration 0024 hat die Übungs-IDs auf RepDB umgestellt ("og-0025" →
-- "bench-press"). Diese hier dreht das um: dieselben 32 Paare, nur andersherum,
-- plus die acht Übungen, die damals zu eigenen wurden, wieder als Katalogübung.
--
-- Der Verlauf bleibt dabei unangetastet — es ändert sich nur, worauf die
-- Zeilen zeigen. Vorher gesichert: luhabit-nach-repdb-2026-09-04.sql.
--
-- Anwenden mit:
--   npx wrangler d1 execute luhabit --remote --file=./migrations/0025_zurueck_zu_opengym.sql


UPDATE plan_exercises SET exercise_id = 'og-0025' WHERE exercise_id = 'bench-press';
UPDATE workout_sets  SET exercise_id = 'og-0025' WHERE exercise_id = 'bench-press';
UPDATE exercises     SET id = 'og-0025', updated_at = datetime('now') WHERE id = 'bench-press';

UPDATE plan_exercises SET exercise_id = 'og-0027' WHERE exercise_id = 'barbell-row';
UPDATE workout_sets  SET exercise_id = 'og-0027' WHERE exercise_id = 'barbell-row';
UPDATE exercises     SET id = 'og-0027', updated_at = datetime('now') WHERE id = 'barbell-row';

UPDATE plan_exercises SET exercise_id = 'og-0043' WHERE exercise_id = 'squat';
UPDATE workout_sets  SET exercise_id = 'og-0043' WHERE exercise_id = 'squat';
UPDATE exercises     SET id = 'og-0043', updated_at = datetime('now') WHERE id = 'squat';

UPDATE plan_exercises SET exercise_id = 'og-0085' WHERE exercise_id = 'romanian-deadlift';
UPDATE workout_sets  SET exercise_id = 'og-0085' WHERE exercise_id = 'romanian-deadlift';
UPDATE exercises     SET id = 'og-0085', updated_at = datetime('now') WHERE id = 'romanian-deadlift';

UPDATE plan_exercises SET exercise_id = 'og-0150' WHERE exercise_id = 'lat-pulldown';
UPDATE workout_sets  SET exercise_id = 'og-0150' WHERE exercise_id = 'lat-pulldown';
UPDATE exercises     SET id = 'og-0150', updated_at = datetime('now') WHERE id = 'lat-pulldown';

UPDATE plan_exercises SET exercise_id = 'og-0165' WHERE exercise_id = 'cable-hammer-curl';
UPDATE workout_sets  SET exercise_id = 'og-0165' WHERE exercise_id = 'cable-hammer-curl';
UPDATE exercises     SET id = 'og-0165', updated_at = datetime('now') WHERE id = 'cable-hammer-curl';

UPDATE plan_exercises SET exercise_id = 'og-0175' WHERE exercise_id = 'cable-crunch';
UPDATE workout_sets  SET exercise_id = 'og-0175' WHERE exercise_id = 'cable-crunch';
UPDATE exercises     SET id = 'og-0175', updated_at = datetime('now') WHERE id = 'cable-crunch';

UPDATE plan_exercises SET exercise_id = 'og-0192' WHERE exercise_id = 'cable-lateral-raise';
UPDATE workout_sets  SET exercise_id = 'og-0192' WHERE exercise_id = 'cable-lateral-raise';
UPDATE exercises     SET id = 'og-0192', updated_at = datetime('now') WHERE id = 'cable-lateral-raise';

UPDATE plan_exercises SET exercise_id = 'og-0199' WHERE exercise_id = 'straight-arm-pulldown';
UPDATE workout_sets  SET exercise_id = 'og-0199' WHERE exercise_id = 'straight-arm-pulldown';
UPDATE exercises     SET id = 'og-0199', updated_at = datetime('now') WHERE id = 'straight-arm-pulldown';

UPDATE plan_exercises SET exercise_id = 'og-0200' WHERE exercise_id = 'tricep-pushdown';
UPDATE workout_sets  SET exercise_id = 'og-0200' WHERE exercise_id = 'tricep-pushdown';
UPDATE exercises     SET id = 'og-0200', updated_at = datetime('now') WHERE id = 'tricep-pushdown';

UPDATE plan_exercises SET exercise_id = 'og-0314' WHERE exercise_id = 'incline-db-press';
UPDATE workout_sets  SET exercise_id = 'og-0314' WHERE exercise_id = 'incline-db-press';
UPDATE exercises     SET id = 'og-0314', updated_at = datetime('now') WHERE id = 'incline-db-press';

UPDATE plan_exercises SET exercise_id = 'og-0334' WHERE exercise_id = 'lateral-raise';
UPDATE workout_sets  SET exercise_id = 'og-0334' WHERE exercise_id = 'lateral-raise';
UPDATE exercises     SET id = 'og-0334', updated_at = datetime('now') WHERE id = 'lateral-raise';

UPDATE plan_exercises SET exercise_id = 'og-0405' WHERE exercise_id = 'seated-db-press';
UPDATE workout_sets  SET exercise_id = 'og-0405' WHERE exercise_id = 'seated-db-press';
UPDATE exercises     SET id = 'og-0405', updated_at = datetime('now') WHERE id = 'seated-db-press';

UPDATE plan_exercises SET exercise_id = 'og-0447' WHERE exercise_id = 'ez-bar-curl';
UPDATE workout_sets  SET exercise_id = 'og-0447' WHERE exercise_id = 'ez-bar-curl';
UPDATE exercises     SET id = 'og-0447', updated_at = datetime('now') WHERE id = 'ez-bar-curl';

UPDATE plan_exercises SET exercise_id = 'og-0472' WHERE exercise_id = 'hanging-leg-raise';
UPDATE workout_sets  SET exercise_id = 'og-0472' WHERE exercise_id = 'hanging-leg-raise';
UPDATE exercises     SET id = 'og-0472', updated_at = datetime('now') WHERE id = 'hanging-leg-raise';

UPDATE plan_exercises SET exercise_id = 'og-0573' WHERE exercise_id = 'machine-back-extension';
UPDATE workout_sets  SET exercise_id = 'og-0573' WHERE exercise_id = 'machine-back-extension';
UPDATE exercises     SET id = 'og-0573', updated_at = datetime('now') WHERE id = 'machine-back-extension';

UPDATE plan_exercises SET exercise_id = 'og-0576' WHERE exercise_id = 'chest-press-machine';
UPDATE workout_sets  SET exercise_id = 'og-0576' WHERE exercise_id = 'chest-press-machine';
UPDATE exercises     SET id = 'og-0576', updated_at = datetime('now') WHERE id = 'chest-press-machine';

UPDATE plan_exercises SET exercise_id = 'og-0585' WHERE exercise_id = 'leg-extension';
UPDATE workout_sets  SET exercise_id = 'og-0585' WHERE exercise_id = 'leg-extension';
UPDATE exercises     SET id = 'og-0585', updated_at = datetime('now') WHERE id = 'leg-extension';

UPDATE plan_exercises SET exercise_id = 'og-0586' WHERE exercise_id = 'leg-curl';
UPDATE workout_sets  SET exercise_id = 'og-0586' WHERE exercise_id = 'leg-curl';
UPDATE exercises     SET id = 'og-0586', updated_at = datetime('now') WHERE id = 'leg-curl';

UPDATE plan_exercises SET exercise_id = 'og-0594' WHERE exercise_id = 'seated-calf-raise';
UPDATE workout_sets  SET exercise_id = 'og-0594' WHERE exercise_id = 'seated-calf-raise';
UPDATE exercises     SET id = 'og-0594', updated_at = datetime('now') WHERE id = 'seated-calf-raise';

UPDATE plan_exercises SET exercise_id = 'og-0596' WHERE exercise_id = 'machine-chest-fly';
UPDATE workout_sets  SET exercise_id = 'og-0596' WHERE exercise_id = 'machine-chest-fly';
UPDATE exercises     SET id = 'og-0596', updated_at = datetime('now') WHERE id = 'machine-chest-fly';

UPDATE plan_exercises SET exercise_id = 'og-0599' WHERE exercise_id = 'seated-leg-curl';
UPDATE workout_sets  SET exercise_id = 'og-0599' WHERE exercise_id = 'seated-leg-curl';
UPDATE exercises     SET id = 'og-0599', updated_at = datetime('now') WHERE id = 'seated-leg-curl';

UPDATE plan_exercises SET exercise_id = 'og-0604' WHERE exercise_id = 'plate-loaded-shrug';
UPDATE workout_sets  SET exercise_id = 'og-0604' WHERE exercise_id = 'plate-loaded-shrug';
UPDATE exercises     SET id = 'og-0604', updated_at = datetime('now') WHERE id = 'plate-loaded-shrug';

UPDATE plan_exercises SET exercise_id = 'og-0605' WHERE exercise_id = 'standing-calf-raise';
UPDATE workout_sets  SET exercise_id = 'og-0605' WHERE exercise_id = 'standing-calf-raise';
UPDATE exercises     SET id = 'og-0605', updated_at = datetime('now') WHERE id = 'standing-calf-raise';

UPDATE plan_exercises SET exercise_id = 'og-0652' WHERE exercise_id = 'pull-up';
UPDATE workout_sets  SET exercise_id = 'og-0652' WHERE exercise_id = 'pull-up';
UPDATE exercises     SET id = 'og-0652', updated_at = datetime('now') WHERE id = 'pull-up';

UPDATE plan_exercises SET exercise_id = 'og-0739' WHERE exercise_id = 'leg-press';
UPDATE workout_sets  SET exercise_id = 'og-0739' WHERE exercise_id = 'leg-press';
UPDATE exercises     SET id = 'og-0739', updated_at = datetime('now') WHERE id = 'leg-press';

UPDATE plan_exercises SET exercise_id = 'og-0868' WHERE exercise_id = 'cable-curl';
UPDATE workout_sets  SET exercise_id = 'og-0868' WHERE exercise_id = 'cable-curl';
UPDATE exercises     SET id = 'og-0868', updated_at = datetime('now') WHERE id = 'cable-curl';

UPDATE plan_exercises SET exercise_id = 'og-0869' WHERE exercise_id = 'machine-shoulder-press';
UPDATE workout_sets  SET exercise_id = 'og-0869' WHERE exercise_id = 'machine-shoulder-press';
UPDATE exercises     SET id = 'og-0869', updated_at = datetime('now') WHERE id = 'machine-shoulder-press';

UPDATE plan_exercises SET exercise_id = 'og-1350' WHERE exercise_id = 'seated-cable-row';
UPDATE workout_sets  SET exercise_id = 'og-1350' WHERE exercise_id = 'seated-cable-row';
UPDATE exercises     SET id = 'og-1350', updated_at = datetime('now') WHERE id = 'seated-cable-row';

UPDATE plan_exercises SET exercise_id = 'og-1452' WHERE exercise_id = 'machine-seated-crunch';
UPDATE workout_sets  SET exercise_id = 'og-1452' WHERE exercise_id = 'machine-seated-crunch';
UPDATE exercises     SET id = 'og-1452', updated_at = datetime('now') WHERE id = 'machine-seated-crunch';

UPDATE plan_exercises SET exercise_id = 'og-0202' WHERE exercise_id = 'face-pull';
UPDATE workout_sets  SET exercise_id = 'og-0202' WHERE exercise_id = 'face-pull';
UPDATE exercises     SET id = 'og-0202', updated_at = datetime('now') WHERE id = 'face-pull';

UPDATE plan_exercises SET exercise_id = 'og-0814' WHERE exercise_id = 'bench-dips';
UPDATE workout_sets  SET exercise_id = 'og-0814' WHERE exercise_id = 'bench-dips';
UPDATE exercises     SET id = 'og-0814', updated_at = datetime('now') WHERE id = 'bench-dips';

-- Die acht Geretteten sind wieder Katalogübungen: der alte Katalog kennt sie.
UPDATE exercises
SET is_custom = 0, updated_at = datetime('now')
WHERE id IN ('og-1299', 'og-0588', 'og-0861', 'og-0203', 'og-0602', 'og-0194', 'og-0243', 'og-0198');

-- Und die Reste, die 0024 als gelöscht markiert hat, gab es vorher auch.
-- Zurückholen heißt zurückholen.
UPDATE exercises
SET deleted_at = NULL, updated_at = datetime('now')
WHERE id LIKE 'og-%' AND deleted_at IS NOT NULL;

-- Zum Schluss die Zeilen wieder weg, die es vor dem Hinweg gar nicht gab.
--
-- Migration 0024 hat sie angelegt, damit die acht Übungen den Wechsel als
-- eigene Übungen überstehen. Jetzt kennt der Katalog sie wieder selbst — die
-- Zeile sagt nichts mehr, was nicht ohnehin dort stünde.
--
-- Als Grabstein, nicht als DELETE: die App holt sich nur Geändertes, eine hart
-- gelöschte Zeile bliebe auf jedem Gerät stehen, das sie schon kennt (siehe
-- app/api/sync/route.ts). Ausgenommen ist die eine Zeile, die es auch vorher
-- schon gab: usr_owner / og-1299.
UPDATE exercises
SET deleted_at = datetime('now'), updated_at = datetime('now')
WHERE id IN ('og-1299', 'og-0588', 'og-0861', 'og-0203', 'og-0602', 'og-0194', 'og-0243', 'og-0198')
  AND NOT (user_id = 'usr_owner' AND id = 'og-1299');
