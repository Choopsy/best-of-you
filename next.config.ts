import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache des pages côté navigateur :
    // - dynamic : pages déjà visitées, gardées 30 s (retour arrière instantané) ;
    // - static : onglets préchargés en entier depuis la barre de navigation, gardés 2 min.
    // Les actions (ajout au journal, etc.) vident ce cache via revalidatePath.
    staleTimes: { dynamic: 30, static: 120 },
  },
};

export default nextConfig;
