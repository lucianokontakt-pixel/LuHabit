import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";
import { BottomNav } from "@/components/bottom-nav";
import { SyncRunner } from "@/components/sync-runner";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { Toaster } from "@/components/ui/sonner";

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
  description: "Dein Training und deine Werte — an einem Ort.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LuHabit",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101113" },
  ],
  // Ohne das bleibt die Safe-Area der PWA leer (env(safe-area-inset-*) liefert
  // dann überall 0px) — die App füllt den Bildschirm nicht bis zum Rand, und
  // die untere Navigation sitzt direkt über der Wisch-Zone, in der iOS den
  // App-Wechsler und (in Safari) die Tab-Leiste erwartet.
  viewportFit: "cover",
  // Kein Zoom: die App soll sich wie eine installierte anfühlen und nicht
  // verrutschen, wenn beim Training zwei Finger danebengreifen.
  //
  // Zwei Dinge dazu, die leicht falsch verstanden werden. Erstens greift das
  // nur in der installierten PWA — Safari als Browser ignoriert es seit iOS 10
  // absichtlich, damit niemand das Hineinzoomen aussperren kann. Zweitens ist
  // es NICHT das Mittel gegen den Sprung beim Antippen eines Eingabefelds:
  // dagegen hilft allein, dass jedes Feld mindestens 16px groß schreibt (siehe
  // components/ui/input.tsx und components/training/number-field.tsx). Wer das
  // hier später wieder herausnimmt, verliert also nur das Wischen — nicht die
  // ruhigen Eingabefelder.
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/* Cloudflare-Worker-Build bundelt den Server-Code mit esbuilds
            keepNames-Option. next-themes serialisiert sein Anti-Flacker-Skript
            per Function.toString() ins HTML — dabei landet ein __name-Aufruf
            im Text, der nur im Worker-Scope existiert, nicht im Browser. Ohne
            diesen Polyfill bricht das Skript vor dem eigentlichen Theme-Setzen
            ab (ReferenceError), das Skript unten steht immer vor next-themes'
            eigenem Skript, weil <head> vor <body> ausgeführt wird. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "window.__name=window.__name||function(f){return f};",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Nav />
          {/* pb-28 reicht als fester Abstand nicht mehr: die untere Navigation
              wächst um die Safe-Area-Höhe des Geräts nach unten, sonst würde
              der letzte Inhalt darunter verschwinden. */}
          <main className="px-edge mx-auto w-full max-w-4xl flex-1 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:[--edge:1.5rem] sm:pb-9 sm:pt-6">
            {children}
          </main>
          <BottomNav />
          <Toaster />
          <ServiceWorkerRegistration />
          <SyncRunner />
        </ThemeProvider>
      </body>
    </html>
  );
}
