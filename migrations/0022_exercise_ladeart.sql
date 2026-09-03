-- Wie das Gewicht an das Gerät kommt: Steckgewicht, Scheiben, freie Gewichte
-- oder gar keins.
--
-- Das Gerät allein sagt darüber nichts. "Maschine" ist die Brustpresse mit
-- Steckgewicht genauso wie die Multipresse, an die man Scheiben hängt — im
-- Training der Unterschied zwischen zehn Sekunden und zwei Minuten je
-- Gewichtswechsel.
--
-- Die App leitet den Wert aus Gerät und englischem Namen ab (ladeartVon in
-- lib/training.ts). Diese Spalte ist das Urteil, das die Ableitung schlägt:
-- dieselbe Maschine steht im einen Studio mit Steckgewicht und im anderen mit
-- Scheiben, und das weiß nur, wer davorsteht. NULL heißt "keins gefällt".
--
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0022_exercise_ladeart.sql

ALTER TABLE exercises ADD COLUMN ladeart TEXT;
