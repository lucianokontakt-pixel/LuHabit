import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth";

describe("isPublicPath", () => {
  it("lässt Webhooks durch — sie prüfen ihr eigenes Secret", () => {
    // Der Grund für diesen Test: /api/entries/webhook fehlte in der früheren
    // Matcher-Regex und bekam deshalb 401, bevor die Route überhaupt lief.
    // Der Gewicht-Sync aus Apple Health war damit tot.
    expect(isPublicPath("/api/entries/webhook")).toBe(true);
    expect(isPublicPath("/api/steps/webhook")).toBe(true);
  });

  it("nimmt einen künftigen Webhook automatisch aus", () => {
    expect(isPublicPath("/api/schlaf/webhook")).toBe(true);
  });

  it("lässt Login-Seite und OAuth-Fluss durch", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/google/start")).toBe(true);
    expect(isPublicPath("/api/auth/google/callback")).toBe(true);
    expect(isPublicPath("/api/auth/logout")).toBe(true);
  });

  it("schützt die Datenrouten", () => {
    expect(isPublicPath("/api/entries")).toBe(false);
    expect(isPublicPath("/api/habits")).toBe(false);
    expect(isPublicPath("/api/goals")).toBe(false);
    expect(isPublicPath("/api/webhook-secret")).toBe(false);
    expect(isPublicPath("/api/training/sessions")).toBe(false);
  });

  it("schützt die Seiten", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/einstellungen")).toBe(false);
    expect(isPublicPath("/statistik/koerper")).toBe(false);
  });

  it("öffnet nichts, was nur so aussieht", () => {
    // Kein Präfix /api/, also keine Ausnahme — egal wie der Pfad endet.
    expect(isPublicPath("/webhook")).toBe(false);
    expect(isPublicPath("/training/webhook")).toBe(false);
    // Und kein Teiltreffer auf /login.
    expect(isPublicPath("/login-fake")).toBe(false);
  });
});
