/**
 * Ein Signal: "der lokale Bestand hat sich geändert".
 *
 * Steht bewusst in einer eigenen Datei. Sowohl der Abgleich als auch die
 * Warteschlange lösen es aus, und beide brauchen einander — lägen die
 * Zuhörer in einer der beiden, würden sich die Dateien gegenseitig
 * importieren.
 */

const listeners = new Set<() => void>();

/** Wer aus dem lokalen Bestand liest, will es erfahren, wenn er sich ändert. */
export function subscribeLocalData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLocalDataChanged() {
  for (const listener of listeners) listener();
}
