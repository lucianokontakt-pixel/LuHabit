export type UnitCategory = {
  key: string;
  label: string;
  units: string[];
};

export const UNIT_CATEGORIES: UnitCategory[] = [
  { key: "time", label: "Zeit", units: ["Minuten", "Stunden"] },
  { key: "distance", label: "Distanz", units: ["Meter", "Kilometer"] },
  {
    key: "count",
    label: "Menge/Anzahl",
    units: ["Stück", "Mal", "Seiten", "Gläser", "Schritte", "Tassen"],
  },
  { key: "weight", label: "Gewicht", units: ["Gramm", "Kilogramm"] },
  { key: "volume", label: "Volumen", units: ["ml", "Liter"] },
];

export function categoryForUnit(unit: string): string | null {
  const found = UNIT_CATEGORIES.find((c) => c.units.includes(unit));
  return found?.key ?? null;
}
