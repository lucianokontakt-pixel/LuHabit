import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { HabitRegistryProvider } from "@/lib/habit-registry";

// Sohne stand-in — the half-step weights in the design map onto Inter's
// variable axis, so the finer 430/450/480 hierarchy survives.
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Signifier stand-in. Stays at weight 400 at every size, per the design system.
const display = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LuHabit",
  description: "Deine Habits, dein Training, deine Werte — an einem Ort.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101113" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <HabitRegistryProvider>
            <Nav />
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-12 sm:pt-8">
              {children}
            </main>
            <BottomNav />
            <Toaster />
          </HabitRegistryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
