import { gifUrl, imageUrl, INSTRUCTIONS_URL } from "@/lib/exercise-catalog";
import type { Exercise } from "@/lib/training";

export type VorladeFortschritt = { fertig: number; gesamt: number };

/**
 * Die Bilder der Übungen aufs Gerät holen, damit sie ohne Netz da sind.
 *
 * Bewusst nur die Übungen, die man wirklich braucht. Die ganze Bibliothek sind
 * 1295 GIFs und rund 120 MB — das scheitert auf iOS an der Speicherquote, und
 * niemand trainiert 1295 Übungen. Ein Plan sind typisch 30 bis 50.
 *
 * Geholt wird über ein normales fetch: der Service Worker fängt es ab und legt
 * die Antwort in seinen Cache. Anschließend liefert er sie auch offline aus.
 *
 * Nacheinander statt alles auf einmal — hundert gleichzeitige Anfragen bringen
 * mobile Netze eher zum Stocken, als dass sie etwas beschleunigen.
 */
export async function ladeMedienVor(
  exercises: Exercise[],
  onProgress?: (fortschritt: VorladeFortschritt) => void
): Promise<{ geladen: number; fehler: number }> {
  const urls: string[] = [INSTRUCTIONS_URL];
  for (const exercise of exercises) {
    const gif = gifUrl(exercise);
    const still = imageUrl(exercise);
    if (still) urls.push(still);
    if (gif) urls.push(gif);
  }

  let geladen = 0;
  let fehler = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) geladen++;
      else fehler++;
    } catch {
      fehler++;
    }
    onProgress?.({ fertig: geladen + fehler, gesamt: urls.length });
  }

  return { geladen, fehler };
}
