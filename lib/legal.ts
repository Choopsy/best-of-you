/**
 * Informations affichées dans la politique de confidentialité.
 * À tenir à jour si l'hébergement ou le contact change.
 */
export const LEGAL = {
  /** Responsable du traitement */
  controller: 'Perret Cheun',
  /** Adresse de contact pour exercer ses droits (variable d'environnement, ou null) */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  /** Région du projet Supabase (Project Settings > General), ex. « Union européenne (Francfort) » */
  databaseRegion: process.env.NEXT_PUBLIC_DATABASE_REGION || null,
  /** Date de la dernière mise à jour de la politique */
  updatedOn: '27 octobre 2026',
  /** Version, enregistrée avec l'accord de l'utilisateur */
  version: '2026-10-27',
}
