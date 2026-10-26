import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { AppNav } from "@/components/nav/app-nav";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6EEE3" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1713" },
  ],
};

/**
 * Applique le thème (clair / sombre / auto) AVANT l'affichage, pour éviter un flash.
 * Le choix est gardé dans le cookie « theme » (voir components/theme/theme-switcher.tsx).
 */
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark|system)/);var t=m?m[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppNav />
        <div className="flex-1 md:pt-14 pb-20 md:pb-0">
          {children}
        </div>
      </body>
    </html>
  );
}
