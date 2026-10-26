import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Garde les pages déjà visitées 30 s en mémoire côté navigateur :
    // revenir en arrière ou rouvrir un onglet est instantané.
    // Les actions (ajout au journal, etc.) invalident ce cache via revalidatePath.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
