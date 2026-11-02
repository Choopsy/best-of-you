import type { Metadata, Viewport } from "next";
import { Epilogue, Karla } from "next/font/google";
import { AppNav } from "@/components/nav/app-nav";
import { Splash, SPLASH_SCRIPT } from "@/components/brand/splash";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

// Titres : Epilogue (caractère, chaleur) ; texte : Karla (lisible en petit). Voir design/DESIGN.md
const display = Epilogue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Karla({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FFF8F5",
};

/**
 * Applique le thème (clair / sombre / auto) AVANT l'affichage, pour éviter un flash.
 * Par défaut : clair.
 * Le choix est gardé dans le cookie « theme » (voir components/theme/theme-switcher.tsx).
 */
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark|system)/);var t=m?m[1]:'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})()`;

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
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Splash />
        <AppNav />
        <div className="flex-1 md:pt-14 pb-20 md:pb-0">
          {children}
        </div>
      </body>
    </html>
  );
}
