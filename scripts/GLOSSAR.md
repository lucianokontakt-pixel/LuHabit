# Glossar für die Übungsanleitungen

Die Anleitungen werden Satz für Satz übersetzt (siehe `anleitungen-extrahieren.mjs`).
4284 Sätze über viele Durchgänge halten nur zusammen, wenn dieselben Begriffe
jedes Mal gleich fallen. Diese Liste ist verbindlich.

## Ton

**Du-Form, Imperativ, knapp.** „Senke die Hantel langsam ab", nicht „Die Hantel
wird langsam abgesenkt" und nicht „Sie senken die Hantel ab". Das Original sagt
„Lower the barbell slowly" — genauso kurz bleiben.

Kein „nun", kein „anschließend" als Füllwort. Das Original nummeriert die
Schritte, die Reihenfolge steht also schon da.

## Geräte

| Englisch | Deutsch |
|---|---|
| barbell | Langhantel |
| dumbbell(s) | Kurzhantel(n) |
| EZ bar / EZ curl bar | SZ-Stange |
| cable / cable machine | Kabelzug |
| machine | Maschine |
| smith machine | Multipresse |
| kettlebell | Kettlebell |
| resistance band | Widerstandsband |
| stability ball / exercise ball | Gymnastikball |
| bench | Bank |
| incline bench | Schrägbank |
| decline bench | Negativbank |
| flat bench | Flachbank |
| pull-up bar | Klimmzugstange |
| dip bars / parallel bars | Barren |
| mat | Matte |
| rack | Ablage |
| weight stack | Gewichtsblock |
| handle(s) | Griff(e) |
| rope attachment | Seilzug |
| plate | Hantelscheibe |

## Körper und Haltung

| Englisch | Deutsch |
|---|---|
| shoulder-width apart | schulterbreit |
| hip-width apart | hüftbreit |
| slightly wider than shoulder-width | etwas weiter als schulterbreit |
| core | Rumpf |
| engage your core | spanne den Rumpf an |
| brace your core | halte den Rumpf fest |
| chest up | Brust raus |
| back straight | Rücken gerade |
| neutral spine | neutrale Wirbelsäule |
| shoulder blades | Schulterblätter |
| retract your shoulder blades | zieh die Schulterblätter zusammen |
| elbows tucked in | Ellbogen am Körper |
| palms facing forward | Handflächen nach vorn |
| palms facing each other | Handflächen zueinander |
| overhand grip | Obergriff |
| underhand grip | Untergriff |
| neutral grip | Neutralgriff |
| grip | Griff |
| stance | Stand |
| range of motion | Bewegungsumfang |

## Muskeln

Immer die geläufige deutsche Form, nicht die lateinische.

| Englisch | Deutsch |
|---|---|
| biceps | Bizeps |
| triceps | Trizeps |
| quads / quadriceps | Quadrizeps |
| hamstrings | Beinbeuger |
| glutes | Gesäß |
| calves | Waden |
| lats | Latissimus |
| traps | Trapezmuskel |
| delts / deltoids | Schultern |
| abs | Bauchmuskeln |
| obliques | seitliche Bauchmuskeln |
| lower back | unterer Rücken |
| forearms | Unterarme |
| pecs / chest | Brust |

## Bewegung

| Englisch | Deutsch |
|---|---|
| lower … slowly | senke … langsam ab |
| lift / raise | hebe |
| press | drücke |
| push | drücke |
| pull | ziehe |
| squeeze | spanne … an |
| extend | strecke |
| bend | beuge |
| hold | halte |
| pause | halte kurz |
| return to the starting position | geh zurück in die Ausgangsposition |
| starting position | Ausgangsposition |
| contracted position | Endposition |
| controlled / in a controlled manner | kontrolliert |
| explosively | explosiv |
| inhale | atme ein |
| exhale | atme aus |

## Wiederholungen

| Englisch | Deutsch |
|---|---|
| Repeat for the desired number of repetitions. | Wiederhole so oft wie gewünscht. |
| … then switch sides. | … dann wechsle die Seite. |
| … then switch arms. | … dann wechsle den Arm. |
| … then switch legs. | … dann wechsle das Bein. |
| Continue alternating sides … | Wechsle die Seiten ab … |
| set | Satz |
| rep / repetition | Wiederholung |

## Was nicht übersetzt wird

Eigennamen von Übungen innerhalb eines Satzes bleiben stehen, wenn sie im
Deutschen so heißen (Burpee, Crunch, Plank, Deadlift → **Kreuzheben**,
Squat → **Kniebeuge**, Lunge → **Ausfallschritt**).

## Fehlerfall

Ein Satz, für den es keine gute deutsche Fassung gibt, bleibt **unübersetzt im
Wörterbuch weg** — `anleitungen-bauen.mjs` lässt ihn dann fallen. Lieber ein
Schritt weniger als ein englischer Satz mitten im Ablauf.

---

## Arbeitsablauf

```bash
node scripts/anleitungen-extrahieren.mjs   # Sätze ziehen, häufigste zuerst
# → scripts/anleitungen-quelle.json übersetzen, Einträge in
#   scripts/anleitungen-woerterbuch.json ergänzen
node scripts/anleitungen-bauen.mjs         # baut public/uebungen/anleitungen-de.json
```

Der Bauer schreibt eine Übung **nur, wenn jeder ihrer Schritte übersetzt ist**.
Der Loader (`lib/exercise-catalog.ts`) nimmt Deutsch, sobald es für eine Übung
da ist — eine halb übersetzte Übung hätte sonst still Schritte verloren.
Unvollständige bleiben deshalb vorerst ganz englisch. Es kann also nichts
kaputtgehen, egal wie weit man kommt.

Nach jedem Durchgang zeigt `anleitungen-bauen.mjs`, wie viele Übungen fertig
sind, und schreibt die noch offenen Sätze nach
`scripts/anleitungen-fehlend.json`.

**Nächster Schritt:** die Sätze aus `anleitungen-quelle.json` weiter von oben
nach unten abarbeiten, in Blöcken von 100 bis 150. Was schon im Wörterbuch
steht, überspringen.
