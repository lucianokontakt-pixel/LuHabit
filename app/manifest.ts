import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LuHabit",
    short_name: "LuHabit",
    description: "Deine Habits, dein Training, deine Werte — an einem Ort.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#101113",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
