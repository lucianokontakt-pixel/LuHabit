import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "@/lib/csv";

describe("csvEscape", () => {
  it("lässt harmlose Werte in Ruhe", () => {
    expect(csvEscape("Wasser")).toBe("Wasser");
    expect(csvEscape(2000)).toBe("2000");
    expect(csvEscape(0)).toBe("0");
  });

  it("macht aus leeren Werten ein leeres Feld", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });

  it("quotet Trennzeichen, Zeilenumbrüche und Anführungszeichen", () => {
    expect(csvEscape("Kniebeugen; tief")).toBe('"Kniebeugen; tief"');
    expect(csvEscape("Zeile1\nZeile2")).toBe('"Zeile1\nZeile2"');
    expect(csvEscape('Satz "schwer"')).toBe('"Satz ""schwer"""');
  });
});

describe("toCsv", () => {
  it("schreibt Kopfzeile und Werte mit CRLF", () => {
    const csv = toCsv(["habit", "date", "value"], [["water", "2026-08-19", 750]]);
    expect(csv).toBe("﻿habit;date;value\r\nwater;2026-08-19;750\r\n");
  });

  it("kommt ohne Zeilen aus", () => {
    expect(toCsv(["a", "b"], [])).toBe("﻿a;b\r\n");
  });

  it("hält die Spaltenzahl auch bei Sonderzeichen ein", () => {
    const csv = toCsv(["name", "note"], [["Dips; eng", 'mit "Pause"']]);
    const zeile = csv.split("\r\n")[1];
    expect(zeile).toBe('"Dips; eng";"mit ""Pause"""');
  });
});
