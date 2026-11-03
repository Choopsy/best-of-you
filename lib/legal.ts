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
  updatedOn: '3 novembre 2026',
  /** Version, enregistrée avec l'accord de l'utilisateur */
  version: '2026-11-03c',
  /** Conditions d'utilisation : version enregistrée à l'inscription */
  termsVersion: '2026-11-03',
  termsUpdatedOn: '3 novembre 2026',
  /** Âge minimum pour créer un compte (les repères nutritionnels sont prévus pour les adultes) */
  minAge: 18,
  /**
   * Hébergeurs (mentions légales, LCEN art. 6), relevés sur leurs pages légales le 3 novembre 2026.
   * Aucun des deux ne publie de numéro de téléphone : on donne leur adresse de contact.
   */
  hosts: [
    { role: 'hébergement du site', name: 'Vercel Inc.', address: '440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis', contact: 'privacy@vercel.com' },
    { role: 'base de données, comptes et photos (serveurs en Irlande)', name: 'Supabase Pte. Ltd.', address: '65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513', contact: 'privacy@supabase.com' },
  ],
}
