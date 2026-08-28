/**
 * Baut die App-Icons aus einer einzigen Geometrie.
 *
 *   node scripts/icon-bauen.mjs
 *
 * Schreibt app/apple-icon.png (180×180) und app/favicon.ico (16 und 32).
 * app/icon.svg trägt dieselbe Form von Hand — die Zahlen unten und die im SVG
 * müssen übereinstimmen.
 *
 * Warum überhaupt selbst rastern: auf dem Rechner liegt kein SVG-Konverter, und
 * die Marke besteht aus zwei Rundrechtecken. Für so etwas ist ein eigener
 * Rasterer kürzer und verlässlicher als eine Abhängigkeit, die man einmal im
 * Jahr braucht. Vier mal vier Abtastungen je Pixel — ohne die franst jede
 * Rundung aus, und das sieht man auf 16 Pixeln sofort.
 *
 * Gegenprobe nach jeder Änderung: auf 16 Pixeln müssen die drei Stufen noch
 * als Treppe zu erkennen sein und nicht zu einem Balken verkleben. Das ist die
 * Größe, in der das Icon im Browser-Tab steht.
 */

import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

/** Die Marke im 32er-Entwurfsraster — identisch zu app/icon.svg. */
const TILE = "#0d101b";
const MARK = "#b3a0ff";
const TILE_R = 8;
const PILL_R = 3;
/** Drei Stufen. Der Versatz von 7 bei Breite 10 hält sie auch klein getrennt. */
const STUFEN = [
  { x: 4, y: 20.5, w: 10, h: 6 },
  { x: 11, y: 13, w: 10, h: 6 },
  { x: 18, y: 5.5, w: 10, h: 6 },
];

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));

function inRoundRect(px, py, { x, y, w, h }, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function render(size) {
  const s = size / 32;
  const SS = 4;
  const buf = Buffer.alloc(size * size * 4);
  const [tr, tg, tb] = hex(TILE);
  const [mr, mg, mb] = hex(MARK);
  const kachel = { x: 0, y: 0, w: 32, h: 32 };

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let cKachel = 0;
      let cMarke = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = (px + (sx + 0.5) / SS) / s;
          const uy = (py + (sy + 0.5) / SS) / s;
          if (!inRoundRect(ux, uy, kachel, TILE_R)) continue;
          cKachel++;
          if (STUFEN.some((stufe) => inRoundRect(ux, uy, stufe, PILL_R))) cMarke++;
        }
      }
      const n = SS * SS;
      const aKachel = cKachel / n;
      const aMarke = cMarke / n;
      const teiler = aKachel || 1;
      const o = (py * size + px) * 4;
      buf[o] = Math.round((tr * (aKachel - aMarke) + mr * aMarke) / teiler);
      buf[o + 1] = Math.round((tg * (aKachel - aMarke) + mg * aMarke) / teiler);
      buf[o + 2] = Math.round((tb * (aKachel - aMarke) + mb * aMarke) / teiler);
      buf[o + 3] = Math.round(aKachel * 255);
    }
  }
  return buf;
}

function png(size, rgba) {
  const zeile = size * 4 + 1;
  const raw = Buffer.alloc(size * zeile);
  for (let y = 0; y < size; y++) {
    raw[y * zeile] = 0; // Filtertyp „none"
    rgba.copy(raw, y * zeile + 1, y * size * 4, (y + 1) * size * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 Bit je Kanal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO mit eingebetteten PNGs statt BMP — seit Vista überall unterstützt. */
function ico(eintraege) {
  const kopf = Buffer.alloc(6);
  kopf.writeUInt16LE(1, 2);
  kopf.writeUInt16LE(eintraege.length, 4);
  let offset = 6 + eintraege.length * 16;
  const verzeichnis = [];
  const daten = [];
  for (const { size, data } of eintraege) {
    const d = Buffer.alloc(16);
    d[0] = size;
    d[1] = size;
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(data.length, 8);
    d.writeUInt32LE(offset, 12);
    verzeichnis.push(d);
    daten.push(data);
    offset += data.length;
  }
  return Buffer.concat([kopf, ...verzeichnis, ...daten]);
}

writeFileSync("app/apple-icon.png", png(180, render(180)));
writeFileSync("app/favicon.ico", ico([
  { size: 16, data: png(16, render(16)) },
  { size: 32, data: png(32, render(32)) },
]));
console.log("app/apple-icon.png und app/favicon.ico neu gebaut.");
