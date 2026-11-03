/**
 * Photo du repas : ce que l'on demande à Claude et comment on relit sa réponse.
 *
 * Claude ne donne QUE des noms d'aliments et des grammes estimés. Les nutriments viennent
 * toujours de Ciqual ou des produits du foyer (recherche habituelle), jamais de l'IA.
 * La photo n'est jamais conservée : ni Storage, ni journaux (voir app/api/meal-photo).
 */
import type { FoodSuggestion } from './types'

/** Photo déjà réduite sur le téléphone (1024 px, JPEG ≈ 0,8) : quelques centaines de Ko */
export const MAX_PHOTO_BYTES = 2_000_000
export const PHOTO_MAX_SIDE = 1024
export const PHOTO_JPEG_QUALITY = 0.8
export const MAX_PHOTO_ITEMS = 20
export const MAX_PHOTO_GRAMS = 2000
export const MAX_FOOD_NAME = 60

export type Confidence = 'haute' | 'moyenne' | 'basse'
const CONFIDENCES: Confidence[] = ['haute', 'moyenne', 'basse']

export interface PhotoFood {
  /** Nom donné par l'IA (court, en français) */
  name: string
  grams: number
  confidence: Confidence
}

/** Proposition renvoyée au téléphone : ce que l'IA a vu, et l'aliment trouvé dans la base */
export interface PhotoProposal extends PhotoFood {
  food: FoodSuggestion | null
}

export type PhotoAnalysis = { ok: true; items: PhotoFood[] } | { ok: false; error: string }

/** Sortie JSON imposée à Claude (structured outputs) */
export const PHOTO_SCHEMA = {
  type: 'object',
  properties: {
    aliments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nom: { type: 'string' },
          grammes: { type: 'number' },
          confiance: { type: 'string', enum: CONFIDENCES },
        },
        required: ['nom', 'grammes', 'confiance'],
        additionalProperties: false,
      },
    },
  },
  required: ['aliments'],
  additionalProperties: false,
} as const

export const PHOTO_PROMPT = `Tu regardes la photo d'un repas pour aider une personne à le noter dans son journal alimentaire.

Liste chaque aliment visible séparément (un plat composé peut être découpé en ses éléments visibles : « riz blanc cuit », « poulet rôti », « haricots verts cuits »), avec une estimation de son poids en grammes tel qu'il est servi.

- « nom » : nom simple et court en français, comme dans une table de composition des aliments (« pomme », « pâtes cuites », « sauce tomate »), sans marque ni quantité.
- « grammes » : poids estimé de la portion visible, entre 1 et 2000.
- « confiance » : « haute », « moyenne » ou « basse » selon ta certitude sur l'aliment et sa quantité.
- Ne donne aucune valeur nutritionnelle.
- Si la photo ne montre pas de nourriture, renvoie une liste vide.`

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Nom lisible : sans caractères de contrôle, espaces resserrés */
function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim()
  if (s.length < 2 || s.length > MAX_FOOD_NAME) return null
  return s
}

/**
 * Relit la réponse de Claude (texte JSON). Ne lève jamais d'exception.
 * Une ligne invalide (nom trop long, poids impossible) est écartée ; au-delà de 20 aliments,
 * on garde les 20 premiers. Une réponse illisible est une erreur (l'analyse sera rendue).
 */
export function parsePhotoAnalysis(text: string): PhotoAnalysis {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Réponse illisible.' }
  }
  // Tolère une liste directe, au cas où le modèle ignorerait l'enveloppe { aliments }
  const list = Array.isArray(data) ? data : isObject(data) && Array.isArray(data.aliments) ? data.aliments : null
  if (!list) return { ok: false, error: 'Réponse sans liste d\'aliments.' }

  const items: PhotoFood[] = []
  for (const raw of list) {
    if (items.length >= MAX_PHOTO_ITEMS) break
    if (!isObject(raw)) continue
    const name = cleanName(raw.nom)
    const g = typeof raw.grammes === 'string' ? Number(raw.grammes.replace(',', '.')) : raw.grammes
    if (!name || typeof g !== 'number' || !Number.isFinite(g)) continue
    const grams = Math.round(g)
    if (grams < 1 || grams > MAX_PHOTO_GRAMS) continue
    const confidence = CONFIDENCES.includes(raw.confiance as Confidence) ? raw.confiance as Confidence : 'moyenne'
    items.push({ name, grams, confidence })
  }
  return { ok: true, items }
}

/** Type réel de l'image d'après ses premiers octets (on ne croit pas l'en-tête envoyé) */
export function sniffImageType(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

/** « Encore 2 photos aujourd'hui », « Encore 1 photo aujourd'hui » */
export function remainingText(n: number): string {
  if (n <= 0) return 'Plus de photo aujourd\'hui : rendez-vous demain.'
  return `Encore ${n} photo${n > 1 ? 's' : ''} aujourd'hui`
}
