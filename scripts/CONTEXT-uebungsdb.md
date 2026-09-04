# Kontext: Übungsbibliothek aufräumen

Diese Datei ersetzt den Chat, in dem das Konzept entstanden ist. Sie enthält den
Stand nach allen Korrekturen — der Gesprächsverlauf enthält Zwischenstände, die
hier bereits überholt sind.

## Ausgangslage

`lib/exercise-catalog.json` enthält 1295 Übungen aus dem openGym-Datensatz.
Problem: 1106 davon sind standardmäßig sichtbar. Die Liste ist unbenutzbar.

## Die drei Befunde, auf denen alles aufbaut

**1. `rank` ist nicht pro Muskelgruppe normiert.**
Bizeps hat 145 Übungen auf Rang 5, Beinbeuger 6. Ein globaler Schwellwert kann
das nicht reparieren. Lösung: `rankNorm` (Perzentil innerhalb der Muskelgruppe),
liegt im Patch bereit. Überall, wo aktuell `rank >= 3` steht, gehört
`rankNorm >= 0.35` hin.

**2. Der Katalog ist voller Varianten, nicht voller Übungen.**
12× Dumbbell Curl, 9× Push-up, 139 Familien mit Mehrfachvarianten. `familyId`
und `isVariant` liegen im Patch. Liste zeigt nur den Familienkopf, Varianten
aufklappbar.

**3. Die Beine sind im Datensatz unterversorgt.**
78 Übungen für Quadrizeps + Beinbeuger zusammen, gegen 188 für Bizeps. Im
geführten Profil bleiben davon 6 übrig. Das ist eine echte Datenlücke und muss
irgendwann von Hand ergänzt werden — kein Bug in der Filterlogik.

## Getroffene Entscheidungen

**Nichts wird je gelöscht.** Ausblenden heißt: taucht in der Hauptliste nicht
auf, bleibt über die Zeile "+ N ausgeblendete Treffer anzeigen" und über den
Schalter "Ausgeblendete zeigen" jederzeit erreichbar.

**`taste` statt Favoriten-Boolean.** Eine Skala von -2 bis +2:
-2 nie · -1 unbeliebt · 0 neutral · +1 beliebt · +2 Kern.
Ein Feld statt zwei Booleans, weil Sortierung und Filter sonst zwei Quellen
haben. `taste >= +1` überschreibt immer alle Verstecken-Regeln.

**Ausblenden per Regel, nicht per Klick.** 446 Übungen einzeln wegzutippen macht
niemand. Das Feld `autoHideSuggestion` enthält pro Übung die zutreffenden
Regel-Tags. Regeln sind einzeln an- und abschaltbar und dürfen Handarbeit des
Nutzers nie überschreiben.

**`hiddenReason` beim Ausblenden abfragen.** Ein Tap, sechs Optionen. Wertvoller
als der Ausblend-Klick selbst: Gym gewechselt → alle `geraet-fehlt` zurückholen.
Schmerzen → App warnt bei gleichem `jointLoad`-Tag.

**Ziel des Nutzers:** ästhetischer Körper, geführte und halbgeführte Übungen
bevorzugt, wenig freistehende Langhantel. Deshalb ist `guidance` (4 geführt →
3 halbgeführt → 2 frei → 1 instabil) das wichtigste neue Filterfeld.
Trainingshintergrund: 10+ Jahre Calisthenics, seit einem Monat zusätzlich Gym.

## Sprache: Englisch bleibt, Deutsch kommt dazu

`name` (Englisch) bleibt unverändert — Join-Key zum openGym-Datensatz und zu den
Media-IDs, außerdem der Begriff, unter dem man Demo-Videos findet.
`nameDe` ist der Anzeigename. Die Suche geht über beide Felder gleichwertig.
In der Detailansicht steht der englische Name klein darunter.

**Nicht alles wird übersetzt.** Im deutschen Gym sagt niemand "Überzüge", man
sagt Pullover. Dips, Curl, Hip Thrust, Face Pull, Crunch, Lat Pulldown sind
bereits die deutschen Wörter. Übersetzt wird nur, wo es ein echtes deutsches
Gym-Wort gibt: Bench Press → Bankdrücken, Squat → Kniebeuge, Deadlift →
Kreuzheben, Lateral Raise → Seitheben.
In `namen-pruefliste.csv` steht dafür ein `=` in der Spalte `name_de_final`.

## Dateien

| Datei | Was drin ist |
|---|---|
| `enrich_catalog.py` | leitet 22 Felder aus name + equipment + secondary ab, überschreibt nichts Bestehendes |
| `catalog-patch.json` | Ergebnis des Laufs: id + 22 abgeleitete Felder für alle 1295 Übungen |
| `namen-pruefliste.csv` | 804 deutsche Namen zum Nachschärfen, nach Rang sortiert |
| `TODO-uebungsdb.md` | 16 Tasks mit fertigen Aufträgen und Abnahmekriterien |
| `uebungsdb-konzept.md` | vollständige Feldliste inkl. der Felder für später |

`catalog-patch.json` getrennt von `exercise-catalog.json` halten und zur Laufzeit
über die `id` mergen — dann bleibt das Anreicherungs-Skript jederzeit wiederholbar.

## Bekannte Schwächen der automatischen Ableitung

- `risk` ist grob geschätzt. Reicht als Filter, taugt nicht als Aussage.
- Die Regel `einarmig` blendet auch sinnvolle unilaterale Übungen aus
  (Bulgarian Split Squat). Deshalb ist sie ein eigener Schalter.
- `familyId` clustert nur 214 der 1295 Übungen zusammen. Konservativ gewählt:
  lieber zu wenig zusammenfassen als zwei verschiedene Übungen verschmelzen.
- 804 der deutschen Namen haben Reste oder Fehler. Die ersten 150 Zeilen der
  CSV bringen 90 % des Nutzens, der Rest kann liegenbleiben.
- Einzelne Originalnamen sind im openGym-Datensatz kaputt
  ("Dumbbell Incline Breeding"). Nicht übersetzbar, nur ersetzbar.

## Reihenfolge

Task 1-3 (Daten), dann 4-8 (Ausblenden, Wischen, Aufräum-Assistent). Danach ist
die Liste benutzbar. Task 5 — eine einzige `isVisible()`-Funktion — nicht
überspringen, auch wenn er nichts Sichtbares bringt.

Eine Aufgabe pro Session, ein Commit pro Aufgabe.
