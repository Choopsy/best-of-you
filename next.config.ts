import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les tests dans le navigateur construisent l'appli à part (.next-e2e), sans toucher au .next du dev
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Le service worker doit toujours être relu (jamais gardé en cache)
  async headers() {
    return [{
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
