# Herkunft der Übungsdaten

Die Übungsbibliothek in `lib/exercise-catalog.json`, die Texte in `texte.json`
und die Bilder in `repdb/` stammen aus dem **RepDB Exercise Dataset (free
tier)** — <https://repdb.co>. Die Quelldatei liegt unversehrt im Repo unter
`data/repdb/exercises.json`, der Katalog entsteht daraus mit
`node scripts/build-repdb-katalog.mjs`.

## Attribution

Die Lizenz verlangt einen sichtbaren Hinweis (`data/repdb/LICENSE-DATA.md`,
Punkt 2). Er steht in den Einstellungen der App und in der README:

> Exercise data by [RepDB](https://repdb.co)

## Was übernommen wurde und was nicht

Übernommen: deutsche und englische Namen, Beschreibungen, Anleitungen und
Tipps; Kategorie, Mechanik (mehr-/eingelenkig), Zugart, Schwierigkeit; primäre
und sekundäre Muskeln; Variationsgruppen; ein-/beidseitig, Eigengewicht, MET;
die Bilder (`flat/`, 512 px WebP, Start- und Umkehrposition), dazu die 27
Muskel- und 55 Gerätebilder.

Nicht übernommen:

- **Spanisch.** Der Datensatz führt jede Übung auch auf Spanisch. Die App
  spricht es nirgends, und der Text wöge so viel wie der deutsche.
- **`premium-samples/`.** Die animierten Vorschauen sind laut Lizenz (Punkt 6)
  ausdrücklich nur zur Bewertung der kostenpflichtigen Fassung gedacht und
  dürfen nicht in eine Anwendung.
- **Die Website des Datensatzes** (`index.html`, `exercise/`, `sitemap.xml`).

## Vorgeschichte

Bis zum 3. September 2026 kam die Bibliothek aus dem Datensatz
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
über [openGym](https://github.com/dqsantos/openGym): 1295 Übungen, englische
Namen, 180-px-GIFs. Vieles, was dort geraten werden musste — die Untergruppe
aus einem Namensregex, die Beliebtheitsstufe aus dem Gerät, die Ladeart aus
Handarbeit, die deutsche Suche aus einem Wörterbuch —, steht bei RepDB als
Angabe im Datensatz. Wie die alten IDs auf die neuen umgezogen sind, steht in
`lib/repdb-migration.ts` und `migrations/0024_repdb_katalog.sql`.
