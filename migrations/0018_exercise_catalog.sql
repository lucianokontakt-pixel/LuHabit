-- Übungsbibliothek gegen den openGym-Katalog getauscht.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0018_exercise_catalog.sql
--
-- Die Bibliothek steht ab jetzt im Code (lib/exercise-catalog.ts) statt in der
-- Datenbank. Diese Migration tut deshalb zweierlei: sie biegt jeden Verweis in
-- Plänen und im Trainingsverlauf auf die neue ID um, und sie räumt die alten
-- Bibliothekszeilen weg. Selbst angelegte Übungen (is_custom = 1) bleiben
-- unangetastet.
--
-- Erzeugt aus LEGACY_EXERCISE_MAP in lib/exercise-legacy-map.ts — beide müssen
-- dieselbe Zuordnung nennen. 4 alte Übungen haben im Katalog keine
-- Entsprechung (nordic-curls, hip-thrust, plank, side-plank); ihre Zeilen und Verweise
-- bleiben stehen, statt auf etwas Falsches zu zeigen.

CREATE TABLE exercise_id_map (
  alt TEXT PRIMARY KEY,
  neu TEXT NOT NULL
);

INSERT INTO exercise_id_map (alt, neu) VALUES
  ('bankdruecken-lh', 'og-0025'),
  ('schraegbank-lh', 'og-0047'),
  ('negativbank-lh', 'og-0033'),
  ('bankdruecken-kh', 'og-0289'),
  ('schraegbank-kh', 'og-0314'),
  ('fliegende-kh', 'og-0308'),
  ('schraegbank-fliegende', 'og-0319'),
  ('butterfly', 'og-0596'),
  ('brustpresse', 'og-0577'),
  ('kabelzug-fliegende', 'og-0227'),
  ('dips-brust', 'og-0251'),
  ('liegestuetze', 'og-0662'),
  ('schraegbank-multipresse', 'og-0757'),
  ('kreuzheben', 'og-0032'),
  ('rack-pulls', 'og-0074'),
  ('langhantelrudern', 'og-0027'),
  ('t-bar-rudern', 'og-0606'),
  ('kurzhantelrudern', 'og-0292'),
  ('klimmzuege', 'og-0652'),
  ('latzug-breit', 'og-0198'),
  ('latzug-eng', 'og-0245'),
  ('rudern-kabel', 'og-0861'),
  ('rudermaschine', 'og-1350'),
  ('ueberzuege-kabel', 'og-0238'),
  ('hyperextensions', 'og-0489'),
  ('shrugs-kh', 'og-0406'),
  ('shrugs-lh', 'og-0095'),
  ('schulterdruecken-lh', 'og-0091'),
  ('schulterdruecken-kh', 'og-0405'),
  ('schulterpresse-maschine', 'og-0603'),
  ('arnold-press', 'og-2137'),
  ('seitheben-kh', 'og-0334'),
  ('seitheben-kabel', 'og-0178'),
  ('frontheben-kh', 'og-0310'),
  ('vorgebeugtes-seitheben', 'og-0380'),
  ('reverse-butterfly', 'og-0602'),
  ('face-pulls', 'og-0203'),
  ('aufrechtes-rudern', 'og-0120'),
  ('langhantelcurls', 'og-0031'),
  ('sz-curls', 'og-0447'),
  ('kurzhantelcurls', 'og-0294'),
  ('hammercurls', 'og-0313'),
  ('scottcurls', 'og-0070'),
  ('kabelcurls', 'og-0868'),
  ('konzentrationscurls', 'og-0297'),
  ('reverse-curls', 'og-0080'),
  ('curlmaschine', 'og-0592'),
  ('engbankdruecken', 'og-0030'),
  ('dips-trizeps', 'og-0814'),
  ('bankdips', 'og-0129'),
  ('trizepsdruecken-kabel', 'og-0201'),
  ('trizepsdruecken-seil', 'og-0200'),
  ('french-press', 'og-1749'),
  ('overhead-trizeps-kh', 'og-0092'),
  ('kickbacks', 'og-0333'),
  ('dipmaschine', 'og-0591'),
  ('kniebeugen', 'og-0043'),
  ('frontkniebeugen', 'og-0042'),
  ('multipresse-kniebeuge', 'og-0770'),
  ('beinpresse', 'og-0739'),
  ('hackenschmidt', 'og-0743'),
  ('beinstrecker', 'og-0585'),
  ('ausfallschritte-kh', 'og-0336'),
  ('bulgarian-split-squat', 'og-0410'),
  ('goblet-squat', 'og-1760'),
  ('step-ups', 'og-0431'),
  ('sissy-squat', 'og-1489'),
  ('rumaenisches-kreuzheben', 'og-0085'),
  ('rumaenisches-kreuzheben-kh', 'og-1459'),
  ('beinbeuger-liegend', 'og-0586'),
  ('beinbeuger-sitzend', 'og-0599'),
  ('good-mornings', 'og-0044'),
  ('glute-bridge', 'og-1409'),
  ('glute-kickbacks-kabel', 'og-0228'),
  ('abduktoren', 'og-0597'),
  ('adduktoren', 'og-0598'),
  ('wadenheben-stehend', 'og-0605'),
  ('wadenheben-sitzend', 'og-0594'),
  ('wadenheben-beinpresse', 'og-1391'),
  ('wadenheben-kh', 'og-0417'),
  ('crunches', 'og-0274'),
  ('beinheben-haengend', 'og-0472'),
  ('russian-twists', 'og-0687'),
  ('kabel-crunches', 'og-0175'),
  ('ab-wheel', 'og-0857'),
  ('bauchmaschine', 'og-1452');

-- Pläne und Einheiten sind Dokumente: ihre Übungszeilen tragen keinen eigenen
-- Zeitstempel, der Abgleich erkennt eine Änderung nur am Elternteil. Ohne
-- diesen Anstoß behielten die Geräte die alten IDs bis zur nächsten Bearbeitung.
UPDATE workout_plans SET updated_at = datetime('now')
 WHERE id IN (
   SELECT pd.plan_id FROM plan_days pd
     JOIN plan_exercises pe ON pe.day_id = pd.id
    WHERE pe.exercise_id IN (SELECT alt FROM exercise_id_map)
 );

UPDATE workout_sessions SET updated_at = datetime('now')
 WHERE id IN (
   SELECT session_id FROM workout_sets
    WHERE exercise_id IN (SELECT alt FROM exercise_id_map)
 );

UPDATE plan_exercises
   SET exercise_id = (SELECT neu FROM exercise_id_map WHERE alt = plan_exercises.exercise_id)
 WHERE exercise_id IN (SELECT alt FROM exercise_id_map);

UPDATE workout_sets
   SET exercise_id = (SELECT neu FROM exercise_id_map WHERE alt = workout_sets.exercise_id)
 WHERE exercise_id IN (SELECT alt FROM exercise_id_map);

-- Weich löschen, nicht entfernen: ohne Grabstein bliebe die alte Bibliothek auf
-- jedem Handy liegen, das schon einmal abgeglichen hat.
--
-- Verschont bleibt, worauf noch etwas zeigt. Nach den Umschreibungen oben ist
-- das nur noch die Handvoll Übungen ohne Entsprechung im Katalog: sie stehen
-- fortan als eigene Übung neben dem Katalog, damit Plan und Verlauf, die sie
-- nennen, weiterhin einen Namen anzeigen statt einer nackten ID.
UPDATE exercises
   SET is_custom = 1, updated_at = datetime('now')
 WHERE is_custom = 0 AND deleted_at IS NULL
   AND (id IN (SELECT exercise_id FROM plan_exercises)
        OR id IN (SELECT exercise_id FROM workout_sets));

UPDATE exercises
   SET deleted_at = datetime('now'), updated_at = datetime('now')
 WHERE is_custom = 0 AND deleted_at IS NULL;

DROP TABLE exercise_id_map;
