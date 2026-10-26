/**
 * Informations affichées dans la politique de confidentialité.
 * À tenir à jour si l'hébergement ou le contact change.
 */
export const LEGAL = {
  /** Responsable du traitement */
  controller: 'Perret Cheun',
  /** Adresse de contact pour exercer ses droits (une variable d'environnement peut la remplacer) */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'cheunperret56@gmail.com',
  /** Région du projet Supabase (Project Settings > General), ex. « Irlande (Union européenne) » */
  databaseRegion: process.env.NEXT_PUBLIC_DATABASE_REGION || 'Irlande (Union européenne)',
  /** Date de la dernière mise à jour de la politique */
  updatedOn: '27 octobre 2026',
  /** Version, enregistrée avec l'accord de l'utilisateur */
  version: '2026-10-27',
}
