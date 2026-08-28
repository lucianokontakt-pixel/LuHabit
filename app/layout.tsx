import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SyncRunner } from "@/components/sync-runner";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { Toaster } from "@/components/ui/sonner";

// Die Fließtextschrift. Sie trägt alles außer den Überschriften — vor allem
// die Satztabellen im Training, in denen Zahlen dicht nebeneinander stehen und
// eine geometrische Grotesk merklich schlechter liest.
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Die Anzeigeschrift: geometrische Grotesk, fett gesetzt. Sie trägt
// Überschriften und große Kennzahlen — nicht den Fließtext. Die Vorlage nutzt
// durchgehend eine Schrift, kommt dabei aber mit sehr wenig Text aus; hier
// stehen Satztabellen, Gewichte und Zahlenkolonnen, in denen Inter deutlich
// besser liest. Deshalb zwei Schriften statt einer.
const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
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
    { media: "(prefers-color-scheme: dark)", color: "#0d101b" },
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
      className={`${sans.variable} ${display.variable} ${mono.variable} h-dvh antialiased`}
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
      {/* min-h-full statt min-h-dvh reichte nicht: "100%" hängt an der
          Layout-Viewport-Höhe, die iOS Safari auf einer kurzen Seite (nichts
          zu scrollen) instabil hält, während sich Adressleiste und
          Wisch-Zone ein- und ausblenden. Die untere Navigation ist fest am
          Bildschirmrand verankert (siehe components/bottom-nav.tsx) und
          wanderte dabei sichtbar nach oben, mit einer Lücke darunter. dvh
          verfolgt die tatsächlich sichtbare Höhe, nicht die maximal mögliche. */}
      <body className="min-h-dvh flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Navigation und Inhaltsrahmen sitzen in app/(app)/layout.tsx, nicht
              hier: der Start-Knopf in der unteren Leiste muss den aktiven Plan
              kennen, und der kommt aus dem TrainingProvider. Die Anmeldeseite
              bringt ihren eigenen Rahmen mit und braucht beides nicht. */}
          {children}
          <Toaster />
          <ServiceWorkerRegistration />
          <SyncRunner />
        </ThemeProvider>
      </body>
    </html>
  );
}
