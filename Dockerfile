# Image de développement : Node 22 + dépendances du projet.
# Usage : docker compose up   (voir docker-compose.yml)
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Sans droits root : l'utilisateur « node » de l'image possède le projet et le cache de Next
# (les volumes nommés de docker-compose.yml reprennent ces droits à leur création)
RUN mkdir -p .next && chown -R node:node /app
USER node

ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

# --webpack + polling : la détection des modifications de fichiers fonctionne
# de façon fiable depuis un dossier Windows monté dans le conteneur.
CMD ["npx", "next", "dev", "--webpack", "--hostname", "0.0.0.0", "--port", "3000"]
