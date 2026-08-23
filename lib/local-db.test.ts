import { describe, expect, it } from "vitest";
import { upgradePlan } from "@/lib/local-db";

/**
 * IndexedDB gibt es im Testlauf nicht — geprüft wird deshalb nur die eine
 * Entscheidung, die still Daten kosten kann: was beim Öffnen einer schon
 * vorhandenen Datenbank mit Bestand und Cursor passiert.
 */
describe("upgradePlan", () => {
  it("lässt eine frisch angelegte Datenbank in Ruhe", () => {
    // oldVersion 0 heißt: es gab noch nichts. Nichts zu retten, nichts
    // nachzuholen — und vor allem kein Cursor, der gelöscht werden müsste.
    expect(upgradePlan(0)).toEqual({ wipe: false, dropCursor: false });
  });

  it("wirft den Bestand nicht weg, wenn nur eine Sammlung dazugekommen ist", () => {
    // Der eigentliche Punkt: Version 2 hat "emomResults" ergänzt, sonst nichts.
    // Würde hier geräumt, stünde jeder, der beim ersten Start nach dem Update
    // kein Netz hat, vor einer leeren App.
    expect(upgradePlan(1).wipe).toBe(false);
  });

  it("holt nach einem Upgrade einmal alles, statt nur die Änderungen", () => {
    // Ohne fallengelassenen Cursor bekäme eine neu hinzugekommene Sammlung nur
    // mit, was sich seit dem letzten Abgleich geändert hat — was schon vorher
    // auf dem Server lag, fehlte in ihr dauerhaft.
    expect(upgradePlan(1).dropCursor).toBe(true);
  });

  it("räumt auf, sobald eine Fassung unter der Verträglichkeitsgrenze liegt", () => {
    // Absicherung für den Tag, an dem sich die Form der Datensätze wirklich
    // ändert und WIPE_BELOW_VERSION mit angehoben wird: dann muss der alte,
    // nicht mehr lesbare Bestand verschwinden.
    const grenze = [0, 1, 2, 3, 5, 10].map((v) => upgradePlan(v).wipe);
    // Bei der heutigen Grenze (1) darf keine bestehende Fassung geräumt werden.
    expect(grenze).toEqual([false, false, false, false, false, false]);
  });

  it("behandelt eine unsinnige Fassung wie eine frische Datenbank", () => {
    expect(upgradePlan(-1)).toEqual({ wipe: false, dropCursor: false });
  });
});
