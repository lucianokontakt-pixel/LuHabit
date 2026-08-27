import type { NextConfig } from "next";

/**
 * Die alten Adressen aus der Zeit, als die App auch ein Habit-Tracker war und
 * das Training unter /training lag.
 *
 * Sie bleiben stehen, weil sie in Lesezeichen, im Startpunkt der installierten
 * PWA und im Cache alter Service Worker stecken. Dauerhaft (308), damit
 * Browser sie sich merken und die Umleitung nur einmal kostet.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/training", destination: "/", permanent: true },
      { source: "/training/plaene", destination: "/plaene", permanent: true },
      { source: "/training/plaene/:id", destination: "/plaene/:id", permanent: true },
      { source: "/training/uebungen", destination: "/uebungen", permanent: true },
      { source: "/training/session", destination: "/session", permanent: true },
      { source: "/training/einheit/:id", destination: "/einheit/:id", permanent: true },
      { source: "/training/statistik", destination: "/statistik", permanent: true },
      {
        source: "/training/progression",
        destination: "/statistik/progression",
        permanent: true,
      },
      // Das Habit-System und alles, was daran hing.
      { source: "/training/emom", destination: "/", permanent: true },
      { source: "/stats", destination: "/statistik", permanent: true },
      { source: "/habits", destination: "/", permanent: true },
      { source: "/habit/:id", destination: "/", permanent: true },
      { source: "/water", destination: "/koerper", permanent: true },
      { source: "/coffee", destination: "/", permanent: true },
      { source: "/steps", destination: "/", permanent: true },
      { source: "/reading", destination: "/", permanent: true },
      { source: "/writing", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
