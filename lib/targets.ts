/**
 * Calcul des objectifs nutritionnels quotidiens.
 *
 * Chaque chiffre vient d'une référence publiée (voir SOURCES en bas du fichier).
 * Ce module est volontairement « pur » (aucun accès réseau ni base) pour être
 * testé facilement : voir scripts/test-targets.ts.
 */

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain_muscle'
export type SourceId = keyof typeof SOURCES

// ── Niveaux d'activité (PAL) — EFSA 2013 ─────────────────────────────────────

export const PAL: Record<ActivityLevel, number> = {
  sedentary: 1.4,
  moderate: 1.6,
  active: 1.8,
  very_active: 2.0,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary:   { label: 'Peu actif',        hint: 'Travail assis, peu de marche, pas ou peu de sport' },
  moderate:    { label: 'Modérément actif', hint: 'Travail assis mais marche quotidienne, ou sport 1 à 2 fois par semaine' },
  active:      { label: 'Actif',            hint: 'Travail debout, ou sport 3 à 5 fois par semaine' },
  very_active: { label: 'Très actif',       hint: 'Travail physique, ou sport intense presque tous les jours' },
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Perdre du poids',
  maintain: 'Garder mon poids',
  gain_muscle: 'Prendre du muscle',
}

export const LOSS_RATES = [0.25, 0.5, 0.75] as const

/** Approximation classique : ~7 700 kcal par kg de masse perdue (Hall 2008). */
const KCAL_PER_KG = 7700

// ── Entrées / sorties ─────────────────────────────────────────────────────────

export interface TargetInput {
  sex: Sex
  ageYears: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: Goal
  /** kg par semaine, seulement pour goal = 'lose' */
  lossRateKgWeek?: number | null
}

export interface Explanation {
  key: string
  title: string
  value: string
  how: string
  sources: SourceId[]
}

export interface DailyTargets {
  bmr: number
  tdee: number
  energyKcal: number
  proteinsG: number
  fatG: number
  carbsG: number
  /** Limites hautes (à ne pas dépasser) */
  saturatedFatMaxG: number
  sugarsMaxG: number
  saltMaxG: number
  /** Minimum conseillé */
  fiberMinG: number
  /** Fourchettes ANSES en grammes, pour l'affichage */
  ranges: {
    fatG: [number, number]
    carbsG: [number, number]
  }
  bmi: number
  /** Calories des séances du jour ajoutées à l'objectif */
  exerciseKcal: number
  effectiveGoal: Goal
  explanations: Explanation[]
  warnings: string[]
}

// ── Formules ──────────────────────────────────────────────────────────────────

/** Métabolisme de base, équation de Mifflin-St Jeor (1990), en kcal/j. */
export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, ageYears: number) {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'male' ? 5 : -161)
}

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100
  return weightKg / (m * m)
}

export function ageFromBirthDate(birthDate: string, today: Date = new Date()) {
  const b = new Date(birthDate + 'T00:00:00')
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

const round10 = (v: number) => Math.round(v / 10) * 10
const round1 = (v: number) => Math.round(v)
const fr = (v: number, digits = 0) =>
  v.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

export function validateInput(i: TargetInput): string | null {
  if (i.ageYears < 18) return 'Les repères utilisés concernent les adultes (18 ans et plus).'
  if (i.ageYears > 100) return 'Âge hors des plages couvertes par les équations.'
  if (i.heightCm < 120 || i.heightCm > 230) return 'Taille hors des plages couvertes par les équations.'
  if (i.weightKg < 35 || i.weightKg > 250) return 'Poids hors des plages couvertes par les équations.'
  return null
}

/**
 * Calcule les objectifs du jour.
 * Lève une erreur si l'entrée sort des plages de validité (voir validateInput).
 */
export function computeTargets(input: TargetInput, opts: { exerciseKcal?: number } = {}): DailyTargets {
  const invalid = validateInput(input)
  if (invalid) throw new Error(invalid)

  const { sex, ageYears, heightCm, weightKg, activity } = input
  const warnings: string[] = []
  const explanations: Explanation[] = []

  const imc = bmi(weightKg, heightCm)
  let goal = input.goal
  if (goal === 'lose' && imc < 18.5) {
    goal = 'maintain'
    warnings.push(
      "Ton IMC est inférieur à 18,5 : l'appli ne propose pas d'objectif de perte de poids. " +
      "Les objectifs sont calculés pour garder ton poids. Si tu as un doute, parles-en à un médecin ou un diététicien.",
    )
  }

  // 1. Énergie ---------------------------------------------------------------
  const bmr = bmrMifflin(sex, weightKg, heightCm, ageYears)
  const pal = PAL[activity]
  const tdee = bmr * pal

  let energy = tdee
  let energyHow =
    `Métabolisme de base (Mifflin-St Jeor) : ${fr(bmr)} kcal, ` +
    `× niveau d'activité ${fr(pal, 1)} (EFSA) = ${fr(tdee)} kcal pour garder ton poids.`
  const energySources: SourceId[] = ['mifflin', 'efsa_energy']

  if (goal === 'lose') {
    const rate = LOSS_RATES.find((r) => r === Number(input.lossRateKgWeek)) ?? 0.5
    const deficit = (rate * KCAL_PER_KG) / 7
    const floor = Math.max(bmr, sex === 'female' ? 1200 : 1500)
    energy = tdee - deficit
    energyHow += ` Déficit pour perdre ${fr(rate, 2)} kg/semaine : −${fr(deficit)} kcal/j (≈ 7 700 kcal par kg).`
    energySources.push('hall_7700')
    if (energy < floor) {
      energy = floor
      warnings.push(
        `Le déficit demandé ferait descendre tes apports sous ${fr(floor)} kcal/j ` +
        `(ton métabolisme de base, ou 1 200 kcal pour une femme / 1 500 kcal pour un homme). ` +
        `L'objectif est bloqué à ce plancher : ta perte sera plus lente que prévu.`,
      )
      energyHow += ` Plancher appliqué : ${fr(floor)} kcal.`
    }
  } else if (goal === 'gain_muscle') {
    energy = tdee * 1.1
    energyHow += ' Surplus de +10 % pour la prise de muscle (bas de la fourchette 10–20 %).'
    energySources.push('iraki')
  }
  const exercise = Math.max(0, Math.round(opts.exerciseKcal ?? 0))
  if (exercise > 0) {
    energy += exercise
    energyHow += ` Séances du jour : +${fr(exercise)} kcal (dépense nette estimée avec le Compendium 2024).`
    energySources.push('compendium')
  }
  energy = round10(energy)

  explanations.push({
    key: 'energy',
    title: 'Énergie',
    value: `${fr(energy)} kcal`,
    how: energyHow,
    sources: energySources,
  })

  // 2. Protéines -------------------------------------------------------------
  // Au-delà d'un IMC de 25, on calcule sur le poids correspondant à un IMC de 25
  // pour ne pas surestimer les besoins (la masse grasse a peu de besoins en protéines).
  const refWeight = imc > 25 ? 25 * (heightCm / 100) ** 2 : weightKg
  let gPerKg = 0.83
  let proteinWhy = '0,83 g/kg : apport de référence de la population adulte (EFSA).'
  const proteinSources: SourceId[] = ['efsa_drv']
  if (goal === 'gain_muscle') {
    gPerKg = 1.6
    proteinWhy = '1,6 g/kg : seuil au-delà duquel les gains de muscle n\'augmentent plus en moyenne (méta-analyse de Morton, 2018).'
    proteinSources.splice(0, 1, 'morton', 'iraki')
  } else if (goal === 'lose') {
    gPerKg = 1.2
    proteinWhy = '1,2 g/kg : bas de la fourchette 1,2–1,6 g/kg qui aide à préserver la masse musculaire pendant une perte de poids (Leidy, 2015).'
    proteinSources.splice(0, 1, 'leidy')
  } else if (pal >= 1.8) {
    gPerKg = 1.2
    proteinWhy = '1,2 g/kg : bas de la fourchette 1,2–2,0 g/kg recommandée aux personnes sportives (AND/DC/ACSM, 2016).'
    proteinSources.splice(0, 1, 'acsm')
  }

  // Plancher en % de l'énergie (ANSES 2016)
  let minPct = 10
  if (ageYears > 70) minPct = 15
  else if (activity === 'sedentary' && ((sex === 'female' && ageYears > 50) || (sex === 'male' && ageYears > 60))) minPct = 12

  const fromKg = gPerKg * refWeight
  const fromPct = (minPct / 100) * energy / 4
  const protein = round1(Math.max(fromKg, fromPct))
  let proteinHow =
    `${proteinWhy} × ${fr(refWeight)} kg` +
    (refWeight !== weightKg ? ' (poids correspondant à un IMC de 25, car ton IMC est au-dessus)' : '') +
    ` = ${fr(fromKg)} g.`
  if (fromPct > fromKg) {
    proteinHow += ` Relevé à ${minPct} % de l'énergie, minimum ANSES pour ton profil.`
  }
  proteinSources.push('anses_macro')
  explanations.push({ key: 'protein', title: 'Protéines', value: `${protein} g`, how: proteinHow, sources: proteinSources })

  // 3. Lipides : 35 % de l'énergie (fourchette ANSES 35–40 %) --------------
  let fatPct = 35
  const proteinPct = (protein * 4 * 100) / energy
  // Si les glucides dépassaient 55 %, on monte les lipides (dans la limite de 40 %).
  if (100 - proteinPct - fatPct > 55) fatPct = Math.min(40, 100 - proteinPct - 55)
  const fat = round1((fatPct / 100) * energy / 9)
  explanations.push({
    key: 'fat',
    title: 'Lipides',
    value: `${fat} g`,
    how: `${fr(fatPct)} % de l'énergie (fourchette ANSES : 35 à 40 %), à 9 kcal par gramme.`,
    sources: ['anses_macro'],
  })

  // 4. Glucides : le reste de l'énergie --------------------------------------
  const carbsKcal = energy - protein * 4 - fat * 9
  const carbs = round1(Math.max(0, carbsKcal) / 4)
  const carbsPct = (carbs * 4 * 100) / energy
  let carbsHow = `Le reste de l'énergie, à 4 kcal par gramme : ${fr(carbsPct)} % (fourchette ANSES : 40 à 55 %).`
  if (carbsPct < 40) {
    carbsHow += ' C\'est sous la fourchette, à cause d\'un objectif de protéines élevé : rien d\'anormal pour une prise de muscle ou une perte de poids.'
  }
  explanations.push({ key: 'carbs', title: 'Glucides', value: `${carbs} g`, how: carbsHow, sources: ['anses_macro'] })

  // 5. Repères fixes ---------------------------------------------------------
  const satMax = round1((12 / 100) * energy / 9)
  explanations.push({
    key: 'satfat', title: 'Acides gras saturés (maximum)', value: `${satMax} g`,
    how: 'Moins de 12 % de l\'énergie (ANSES).', sources: ['anses_macro'],
  })
  explanations.push({
    key: 'sugars', title: 'Sucres (maximum)', value: '100 g',
    how: 'Moins de 100 g de sucres par jour, hors lactose (ANSES). Les valeurs Ciqual comptent aussi le lactose des produits laitiers : ton total affiché peut donc être un peu au-dessus de la réalité.',
    sources: ['anses_macro'],
  })
  explanations.push({
    key: 'fiber', title: 'Fibres (minimum)', value: '30 g',
    how: 'Apport satisfaisant de 30 g par jour pour un adulte (ANSES).', sources: ['anses_macro'],
  })
  explanations.push({
    key: 'salt', title: 'Sel (maximum)', value: '5 g',
    how: 'Moins de 5 g de sel par jour (OMS).', sources: ['who_salt'],
  })

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    energyKcal: energy,
    proteinsG: protein,
    fatG: fat,
    carbsG: carbs,
    saturatedFatMaxG: satMax,
    sugarsMaxG: 100,
    saltMaxG: 5,
    fiberMinG: 30,
    ranges: {
      fatG: [round1(0.35 * energy / 9), round1(0.40 * energy / 9)],
      carbsG: [round1(0.40 * energy / 4), round1(0.55 * energy / 4)],
    },
    bmi: Math.round(imc * 10) / 10,
    exerciseKcal: exercise,
    effectiveGoal: goal,
    explanations,
    warnings,
  }
}

// ── Sources ───────────────────────────────────────────────────────────────────

export const SOURCES = {
  mifflin: {
    label: 'Mifflin MD, St Jeor ST et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr, 1990',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  efsa_energy: {
    label: 'EFSA. Scientific Opinion on Dietary Reference Values for energy (niveaux d\'activité 1,4 / 1,6 / 1,8 / 2,0), 2013',
    url: 'https://www.efsa.europa.eu/en/efsajournal/pub/3005',
  },
  efsa_drv: {
    label: 'EFSA. Dietary Reference Values — tableaux de synthèse (protéines : 0,83 g/kg/j)',
    url: 'https://www.efsa.europa.eu/sites/default/files/assets/DRV_Summary_tables_jan_17.pdf',
  },
  anses_macro: {
    label: 'ANSES. Actualisation des repères du PNNS : élaboration des références nutritionnelles, 2016',
    url: 'https://www.anses.fr/fr/system/files/NUT2012SA0103Ra-1.pdf',
  },
  hall_7700: {
    label: 'Hall KD. What is the required energy deficit per unit weight loss? Int J Obes, 2008',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17848938/',
  },
  leidy: {
    label: 'Leidy HJ et al. The role of protein in weight loss and maintenance. Am J Clin Nutr, 2015',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25926512/',
  },
  morton: {
    label: 'Morton RW et al. Protein supplementation and resistance training-induced gains in muscle mass and strength (méta-analyse). Br J Sports Med, 2018',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/',
  },
  iraki: {
    label: 'Iraki J et al. Nutrition Recommendations for Bodybuilders in the Off-Season. Sports, 2019',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31247944/',
  },
  acsm: {
    label: 'Thomas DT, Erdman KA, Burke LM. Position of the AND, DC and ACSM: Nutrition and Athletic Performance. J Acad Nutr Diet, 2016',
    url: 'https://doi.org/10.1016/j.jand.2015.12.006',
  },
  who_salt: {
    label: 'OMS. Réduire la consommation de sodium (moins de 5 g de sel par jour)',
    url: 'https://www.who.int/fr/news-room/fact-sheets/detail/salt-reduction',
  },
  compendium: {
    label: 'Herrmann SD et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci, 2024',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/',
  },
  who_activity: {
    label: 'OMS. Lignes directrices sur l\'activité physique et la sédentarité, 2020',
    url: 'https://www.who.int/europe/fr/publications/i/item/9789240014886',
  },
} as const
