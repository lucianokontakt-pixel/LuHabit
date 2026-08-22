/**
 * Zwei Signale zwischen Abgleich und Warteschlange.
 *
 * Stehen bewusst in einer eigenen Datei. Beide Seiten lösen Signale aus und
 * hören auf welche der jeweils anderen — lägen die Zuhörer in einer der
 * beiden Dateien, würden sich sync.ts und write-queue.ts gegenseitig
 * importieren.
 */

const dataListeners = new Set<() => void>();

/** Wer aus dem lokalen Bestand liest, will es erfahren, wenn er sich ändert. */
export function subscribeLocalData(listener: () => void): () => void {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

export function notifyLocalDataChanged() {
  for (const listener of dataListeners) listener();
}

const flushListeners = new Set<() => void>();

/**
 * "Die Warteschlange hat gerade erfolgreich etwas gesendet." Der Abgleich
 * hört darauf, um kurz danach den echten Serverstand zu holen — sonst bliebe
 * der lokale Bestand bis zum nächsten Sichtbarkeits- oder Online-Ereignis bei
 * der eigenen, nur geschätzten Fassung stehen (z.B. der genaue Zeitstempel
 * einer neu angelegten Zeile, den nur der Server kennt).
 */
export function subscribeFlushSucceeded(listener: () => void): () => void {
  flushListeners.add(listener);
  return () => flushListeners.delete(listener);
}

export function notifyFlushSucceeded() {
  for (const listener of flushListeners) listener();
}
