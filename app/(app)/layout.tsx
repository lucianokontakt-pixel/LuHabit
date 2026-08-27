import { Nav } from "@/components/nav";
import { BottomNav } from "@/components/bottom-nav";
import { TrainingProvider } from "@/lib/training-store";

/**
 * Alles außer der Anmeldung — samt Navigation und Inhaltsrahmen.
 *
 * Der TrainingProvider lag früher nur über dem Trainingsbereich, inzwischen
 * brauchen ihn alle Seiten. Er liest aus IndexedDB und nicht aus dem Netz,
 * kostet also keinen zusätzlichen Ladeweg.
 *
 * Dass auch die Navigation hier hängt und nicht mehr in der Wurzel, hat einen
 * Grund: der Start-Knopf in der unteren Leiste startet den nächsten Tag des
 * aktiven Plans. Dafür muss er den Plan kennen — außerhalb des Providers
 * könnte er das nicht. Die Anmeldeseite bleibt bewusst außen vor: dort gibt es
 * weder Daten zu lesen noch etwas zu navigieren.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <TrainingProvider>
      <Nav />
      {/* Der untere Abstand ist gerechnet, nicht geraten: die Leiste wächst um
          die Safe-Area-Höhe des Geräts nach unten, sonst verschwände der
          letzte Inhalt darunter. */}
      <main className="px-edge mx-auto w-full max-w-4xl flex-1 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:[--edge:1.5rem] sm:pb-9 sm:pt-6">
        {children}
      </main>
      <BottomNav />
    </TrainingProvider>
  );
}
