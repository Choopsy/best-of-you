import crypto from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth'
import { getHouseholdId } from '@/lib/household'
import { bestFoodMatch } from '@/lib/food-search'
import { MAX_PHOTO_BYTES, PHOTO_PROMPT, PHOTO_SCHEMA, parsePhotoAnalysis, sniffImageType, type PhotoProposal } from '@/lib/meal-photo'

/**
 * Photo du repas : POST multipart (champ « photo »), réservé aux comptes activés (photo_access).
 *
 * 1. réserve une analyse en base (accès + accord + quota de 3 par jour, d'un seul coup) ;
 * 2. envoie la photo à Claude, qui renvoie seulement des noms d'aliments et des grammes ;
 * 3. relie chaque nom à Ciqual / aux produits du foyer ; les nutriments viennent de là.
 * Si l'appel à Claude échoue, l'analyse est rendue (pas décomptée).
 *
 * La photo reste en mémoire le temps de la requête : rien dans Storage, rien dans les journaux
 * (ne jamais journaliser la requête ni l'image).
 */

const DEFAULT_MODEL = 'claude-haiku-5-5'

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  Response.json({ error, ...extra }, { status })

// Codes d'erreur de claim_photo_analysis (migration 010)
const CLAIM_ERRORS: Record<string, { status: number; code: string }> = {
  PH001: { status: 403, code: 'no_access' },
  PH002: { status: 403, code: 'no_consent' },
  PH003: { status: 429, code: 'quota' },
}

export async function POST(request: Request) {
  const { supabase, user } = await getSession()
  if (!user) return fail(401, 'Connecte-toi pour analyser une photo.')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fail(503, 'La photo du repas n\'est pas encore configurée.', { code: 'not_configured' })

  let file: File | null = null
  try {
    const form = await request.formData()
    const v = form.get('photo')
    file = v instanceof File ? v : null
  } catch { /* corps illisible : traité juste après */ }
  if (!file || file.size === 0) return fail(400, 'Aucune photo reçue.')
  if (file.size > MAX_PHOTO_BYTES) return fail(413, 'Photo trop lourde (2 Mo maximum).')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const mediaType = sniffImageType(bytes)
  if (!mediaType) return fail(415, 'Ce fichier n\'est pas une photo (JPEG, PNG ou WebP).')

  // Jeton d'annulation : seule son empreinte va en base, le jeton reste ici
  const token = crypto.randomBytes(32).toString('hex')
  const { data: claim, error: claimError } = await supabase
    .rpc('claim_photo_analysis', { p_release_hash: crypto.createHash('sha256').update(token).digest('hex') })
    .single<{ analysis_id: string; remaining: number }>()
  if (claimError || !claim) {
    const known = claimError?.code ? CLAIM_ERRORS[claimError.code] : undefined
    if (known) return fail(known.status, claimError!.message, { code: known.code, remaining: known.code === 'quota' ? 0 : undefined })
    return fail(500, 'Impossible de lancer l\'analyse pour l\'instant.')
  }
  const release = () => supabase.rpc('release_photo_analysis', { p_id: claim.analysis_id, p_token: token })

  let text = ''
  try {
    // ANTHROPIC_BASE_URL (lue par le SDK) permet aux tests de viser une fausse API
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 })
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: PHOTO_SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: Buffer.from(bytes).toString('base64') } },
          { type: 'text', text: PHOTO_PROMPT },
        ],
      }],
    })
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') throw new Error(`arrêt : ${response.stop_reason}`)
    text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  } catch (e) {
    await release()
    // Seulement le type d'erreur : ni la photo ni la réponse
    console.error('meal-photo : échec de l\'appel à Claude', e instanceof Anthropic.APIError ? e.status : (e as Error)?.message)
    return fail(502, 'L\'analyse n\'a pas marché. Réessaie : cette photo n\'est pas décomptée.', { code: 'api_error' })
  }

  const parsed = parsePhotoAnalysis(text)
  if (!parsed.ok) {
    await release()
    return fail(502, 'L\'analyse n\'a pas marché. Réessaie : cette photo n\'est pas décomptée.', { code: 'bad_response' })
  }

  const householdId = await getHouseholdId(supabase)
  const items: PhotoProposal[] = await Promise.all(
    parsed.items.map(async (it) => ({ ...it, food: await bestFoodMatch(supabase, it.name, householdId) })),
  )
  return Response.json({ items, remaining: claim.remaining })
}
