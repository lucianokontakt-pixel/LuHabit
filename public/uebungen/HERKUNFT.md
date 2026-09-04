# Herkunft der Übungsdaten

Die Übungsbibliothek in `lib/exercise-catalog.json`, die Anleitungen in
`anleitungen.json` und die Bilder in `gif/` und `img/` stammen aus dem Datensatz
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
und kamen über [openGym](https://github.com/dqsantos/openGym) hierher.

Die Zuordnung zu Muskelgruppen und Geräten ist auf LuHabits eigene Kategorien
übertragen worden. Die **Namen stehen im Original** — unverändert aus dem
Datensatz, nur mit großgeschriebenem Anfangsbuchstaben je Wort statt
durchgehend klein ("Barbell Bench Press" statt "barbell bench press"), wie
openGym sie selbst per CSS anzeigt. Ein Zwischenspiel mit deutschen Namen
("Bankdrücken (Langhantel)") gab es vom 26. bis 30. August 2026 — dabei blieb
das englische Original je Übung im Feld `en` erhalten, darüber ließ sich die
Rückumstellung ohne erneute Übersetzung machen. Bilder und Animationen sind
unverändert übernommen.

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
