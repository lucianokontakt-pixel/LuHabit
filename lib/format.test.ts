import { describe, expect, it } from "vitest";
import {
  formatNumber,
  formatCompact,
  formatSigned,
  formatPercentDelta,
  formatClock,
} from "@/lib/format";

describe("formatNumber", () => {
  it("formatiert im deutschen Zahlenformat", () => {
    expect(formatNumber(65.1)).toBe("65,1");
    expect(formatNumber(1234)).toBe("1.234");
  });

  it("fängt nicht-endliche Werte ab", () => {
    expect(formatNumber(NaN)).toBe("0");
    expect(formatNumber(Infinity)).toBe("0");
  });
});

describe("formatCompact", () => {
  it("kürzt große Werte auf k", () => {
    expect(formatCompact(12400)).toBe("12,4k");
  });

  it("lässt kleine Werte unangetastet", () => {
    expect(formatCompact(9999)).toBe("9.999");
  });
});

describe("formatSigned", () => {
  it("setzt ein Plus vor positive Werte", () => {
    expect(formatSigned(2.5)).toBe("+2,5");
  });

  it("setzt ein Minus vor negative Werte", () => {
    expect(formatSigned(-2.5)).toBe("−2,5");
  });

  it("zeigt Null ohne Vorzeichen", () => {
    expect(formatSigned(0)).toBe("0");
  });

  it("rundet vor dem Vorzeichen-Check — kein '-0'", () => {
    expect(formatSigned(-0.001, 1)).toBe("0");
  });
});

describe("formatPercentDelta", () => {
  it("berechnet die prozentuale Veränderung", () => {
    expect(formatPercentDelta(110, 100)).toBe("+10 %");
  });

  it("gibt bei previous=0 null zurück statt zu dividieren", () => {
    expect(formatPercentDelta(10, 0)).toBeNull();
  });
});

describe("formatClock", () => {
  it("formatiert Sekunden als m:ss", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(59)).toBe("0:59");
  });

  it("kappt negative Werte auf 0:00", () => {
    expect(formatClock(-5)).toBe("0:00");
  });
});
