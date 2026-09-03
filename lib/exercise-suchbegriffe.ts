/**
 * Deutsche Suchbegriffe für eine englische Bibliothek.
 *
 * Die Übungsnamen stehen seit dem 30. August bewusst im englischen Original
 * (siehe scripts/build-exercise-catalog.mjs). Das ist für die Anzeige
 * entschieden — für die Suche war es ein Loch: „Beinpresse“, „Latzug“ und
 * „Bankdrücken“ fanden nichts, und genau das tippt jemand, der im Gym steht.
 *
 * Diese Tabelle übersetzt darum die *Eingabe*, nicht den Namen. Die Bibliothek
 * heißt weiter, wie sie heißt.
 *
 * Die Schlüssel sind Wortstämme in der normalisierten Form aus
 * lib/exercise-suche.ts — klein, ohne Umlaute („huft“ statt „hüft“). Ein Wort
 * der Eingabe gilt als übersetzt, wenn es mit einem Schlüssel anfängt; damit
 * greifen „Kniebeuge“ und „Kniebeugen“ auf denselben Eintrag. Passen mehrere,
 * gewinnt der längste — „bein“ soll „beinpresse“ nicht wegschnappen.
 *
 * Jede Zeile ist eine Behauptung darüber, wie die Übung im Datensatz heißt,
 * und jede ist gegen lib/exercise-catalog.json geprüft. Wo kein Treffer
 * herauskam, steht kein Eintrag — ein Begriff, der ins Leere zeigt, ist
 * schlimmer als keiner: er verdrängt die Wortsuche, die vielleicht getroffen
 * hätte.
 */
export const SUCHBEGRIFFE: Record<string, string> = {
  // Drücken
  bankdruck: "bench press",
  schragbankdruck: "incline press",
  schragbank: "incline",
  negativbank: "decline",
  brustpress: "chest press",
  butterfly: "fly",
  fliegend: "fly",
  uberkopfdruck: "overhead press",
  schulterdruck: "shoulder press",
  nackendruck: "military press",
  militarypress: "military press",
  frontdruck: "front raise",
  liegestutz: "push-up",
  dips: "dip",
};
