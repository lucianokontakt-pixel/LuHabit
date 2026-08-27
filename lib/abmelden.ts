import { clearLocalDb } from "@/lib/local-db";

/**
 * Alles wegräumen, was dem angemeldeten Konto gehört, bevor sich jemand
 * anderes anmeldet: der Cache des Service Workers und der lokale Bestand.
 *
 * Muss vor der Navigation abgewartet werden — sonst schneidet der Seitenwechsel
 * das Löschen mittendrin ab und Reste eines fremden Kontos bleiben liegen.
 *
 * Steht hier statt in der Oberfläche, weil es zwei Stellen zum Abmelden gibt
 * (Benutzermenü und Einstellungen) und beide dasselbe tun müssen.
 */
export async function raeumeAbmeldungAuf(): Promise<void> {
  navigator.serviceWorker?.controller?.postMessage("luhabit-clear-cache");
  try {
    await clearLocalDb();
  } catch {
    // Lässt sie sich nicht leeren, ist das Abmelden trotzdem richtig — der
    // nächste vollständige Abgleich schreibt sie ohnehin neu.
  }
}
