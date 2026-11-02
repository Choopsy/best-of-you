/**
 * Fonctions réservées à certains comptes (côté serveur uniquement : jamais de NEXT_PUBLIC_ ici).
 *
 * MEAL_IMPORT_USERS : identifiants des comptes (séparés par des virgules) qui peuvent importer
 * un repas en JSON. Réglée dans Vercel, pas dans le dépôt (public). Absente = personne.
 */
const list = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

export const canImportMeals = (userId: string | null | undefined) =>
  !!userId && list(process.env.MEAL_IMPORT_USERS).includes(userId)
