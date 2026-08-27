# Herkunft der Übungsdaten

Die Übungsbibliothek in `lib/exercise-catalog.json`, die Anleitungen in
`anleitungen.json` und die Bilder in `gif/` und `img/` stammen aus dem Datensatz
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
und kamen über [openGym](https://github.com/dqsantos/openGym) hierher.

Namen und Zuordnung zu Muskelgruppen und Geräten sind für LuHabit ins Deutsche
übertragen worden (siehe `scripts/exercise-names.mjs`). Bilder und Animationen
sind unverändert übernommen.

Die **Anleitungen sind übersetzt, nicht im Original**: alle 1295 Übungen mit
zusammen 7538 Schritten liegen in `anleitungen-de.json` auf Deutsch vor. Der
englische Urtext bleibt in `anleitungen.json` liegen und dient als
Rückfallebene, falls für eine Übung keine deutsche Fassung existiert (siehe
`loadInstructions` in `lib/exercise-catalog.ts`).

Übersetzt wurde Satz für Satz statt Übung für Übung — 7538 Schritte bestehen
nur aus 4284 verschiedenen Sätzen. Die Zuordnung steht in
`scripts/anleitungen-woerterbuch.json`, die verbindliche Terminologie in
`scripts/GLOSSAR.md`, und `scripts/anleitungen-bauen.mjs` setzt daraus die
deutsche Datei zusammen.

Für Weiterverbreitung gelten die Lizenzbedingungen des Ursprungs-Datensatzes,
nicht die von openGym oder LuHabit.
