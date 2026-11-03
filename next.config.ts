import type { NextConfig } from "next";

// Supabase : base, comptes, photos des recettes (adresse figée au build, comme dans l'appli)
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co')
const https = supabase.protocol === 'https:'

/**
 * Politique de contenu (CSP) : le navigateur ne charge et ne contacte que le site, Supabase et
 * Open Food Facts (scan depuis le téléphone, images des produits). Les scripts en ligne restent
 * permis : Next.js en injecte à chaque page et les nonces demandent un rendu par requête dans
 * proxy.ts (étape suivante, voir l'audit de sécurité).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase.origin} https://images.openfoodfacts.org https://static.openfoodfacts.org`,
  "font-src 'self'",
  `connect-src 'self' ${supabase.origin} ${supabase.origin.replace(/^http/, 'ws')} https://world.openfoodfacts.org`,
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Personne ne peut afficher l'appli dans un cadre (clickjacking)
  "frame-ancestors 'none'",
  // En ligne seulement : en local (tests), tout est en http
  ...(https ? ['upgrade-insecure-requests'] : []),
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Caméra pour le scan et la photo du repas, sur le site seulement ; le reste fermé
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
]

const nextConfig: NextConfig = {
  // Ne pas annoncer la technologie du serveur
  poweredByHeader: false,
  // Les tests dans le navigateur construisent l'appli à part (.next-e2e), sans toucher au .next du dev
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [{
      source: '/:path*',
      headers: SECURITY_HEADERS,
    }, {
      // Le service worker doit toujours être relu (jamais gardé en cache)
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    }]
  },
  experimental: {
    // Cache des pages côté navigateur :
    // - dynamic : pages déjà visitées, gardées 30 s (retour arrière instantané) ;
    // - static : onglets préchargés en entier depuis la barre de navigation, gardés 2 min.
    // Les actions (ajout au journal, etc.) vident ce cache via revalidatePath.
    staleTimes: { dynamic: 30, static: 120 },
  },
};

export default nextConfig;
