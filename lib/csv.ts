/**
 * CSV für den Datenexport.
 *
 * Semikolon statt Komma und CRLF als Zeilenende: so öffnet Excel im deutschen
 * Gebietsschema die Datei in Spalten statt alles in eine zu kippen. Das BOM
 * davor sorgt dafür, dass Umlaute nicht als Buchstabensalat ankommen.
 */
const SEPARATOR = ";";

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Nur quoten, wenn nötig — sonst wird die Datei unnötig unleserlich.
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(columns: string[], rows: unknown[][]): string {
  const lines = [columns.map(csvEscape).join(SEPARATOR)];
  for (const row of rows) lines.push(row.map(csvEscape).join(SEPARATOR));
  return `﻿${lines.join("\r\n")}\r\n`;
}
