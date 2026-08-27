import { TrainingProvider } from "@/lib/training-store";

/**
 * Alles außer der Anmeldung.
 *
 * Der TrainingProvider lag früher nur über dem Trainingsbereich. Inzwischen
 * brauchen ihn auch die Statistik und die Körperseite — er liest aus IndexedDB
 * und nicht aus dem Netz, kostet also keinen zusätzlichen Ladeweg. Die
 * Anmeldeseite bleibt bewusst außen vor: dort gibt es noch keine Daten, die er
 * lesen könnte.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <TrainingProvider>{children}</TrainingProvider>;
}
