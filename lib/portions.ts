/**
 * Quantités en grammes ou en portions pour les aliments enregistrés.
 *
 * Deux façons d'enregistrer un aliment :
 * - valeurs pour 100 g (étiquette, Ciqual) ; un poids de portion facultatif permet
 *   de noter « 1 pot » (125 g) au lieu de grammes ;
 * - valeurs pour 1 portion (fast-food, restaurant : on connaît rarement le poids) ;
 *   un poids de portion, s'il est connu, permet quand même de noter en grammes.
 */
export interface PortionInfo {
  /** Valeurs enregistrées pour 1 portion (sinon pour 100 g) */
  perPortion: boolean
  /** Poids d'une portion en grammes, si connu */
  portionGrams: number | null
}

export type QtyUnit = 'g' | 'portion'

export const MAX_GRAMS = 5000
export const MAX_PORTIONS = 20

export const canUseGrams = (p: PortionInfo) => !p.perPortion || !!p.portionGrams
export const canUsePortions = (p: PortionInfo) => p.perPortion || !!p.portionGrams

/** Unité proposée d'abord : la portion dès qu'elle a un sens (un burger, un pot de yaourt). */
export const defaultUnit = (p: PortionInfo): QtyUnit => (canUsePortions(p) ? 'portion' : 'g')

/** Coefficient à appliquer aux valeurs enregistrées ; null si l'unité n'est pas possible pour cet aliment. */
export function nutrientFactor(p: PortionInfo, unit: QtyUnit, amount: number): number | null {
  if (!(amount > 0)) return null
  if (unit === 'portion') {
    if (p.perPortion) return amount
    return p.portionGrams ? (amount * p.portionGrams) / 100 : null
  }
  if (p.perPortion) return p.portionGrams ? amount / p.portionGrams : null
  return amount / 100
}

/** Poids mangé en grammes, quand on peut le connaître. */
export function eatenGrams(p: PortionInfo, unit: QtyUnit, amount: number): number | null {
  if (unit === 'g') return amount
  return p.portionGrams ? Math.round(amount * p.portionGrams * 10) / 10 : null
}

/** Message d'erreur sur la quantité, ou null si elle est valable. */
export function checkQuantity(p: PortionInfo, unit: QtyUnit, amount: number): string | null {
  if (unit === 'portion') {
    if (!canUsePortions(p)) return 'Cet aliment se compte en grammes : indique son poids de portion pour le noter en portions.'
    if (!(amount > 0 && amount <= MAX_PORTIONS)) return `Entre 0,5 et ${MAX_PORTIONS} portions.`
    return null
  }
  if (!canUseGrams(p)) return 'Cet aliment se compte en portions (son poids n\'est pas connu).'
  if (!(amount > 0 && amount <= MAX_GRAMS)) return 'Quantité entre 1 et 5 000 g.'
  return null
}

/** « 1 portion », « 1,5 portion », « 2 portions » */
export function portionText(n: number) {
  return `${n.toLocaleString('fr-FR')} portion${n >= 2 ? 's' : ''}`
}
