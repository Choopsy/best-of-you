/**
 * Activités physiques et dépense énergétique.
 *
 * Valeurs MET : 2024 Adult Compendium of Physical Activities (Herrmann et al.),
 * code de l'activité entre parenthèses. 1 MET = dépense au repos.
 *
 * Dépense NETTE d'une séance (ce qui s'ajoute à la journée) :
 *   (MET − 1) × métabolisme de base horaire × durée
 * On utilise le métabolisme de base de la personne (Mifflin-St Jeor) plutôt que
 * le « 1 kcal/kg/h » standard : c'est la correction proposée par Kozey et al. (2010)
 * et citée par le Compendium 2024. On retire 1 MET pour ne pas compter deux fois
 * ce qui aurait été dépensé de toute façon au repos.
 */

export type Intensity = 'light' | 'moderate' | 'vigorous'

export interface ActivityType {
  key: string
  label: string
  met: number
  code: string
  /** Renforcement musculaire (repère OMS : au moins 2 jours par semaine) */
  strength?: boolean
}

export const ACTIVITIES: ActivityType[] = [
  { key: 'walk_leisure', label: 'Marche tranquille', met: 3.5, code: '17160' },
  { key: 'walk_brisk', label: 'Marche rapide', met: 4.8, code: '11810' },
  { key: 'hike', label: 'Randonnée', met: 6.0, code: '17080' },
  { key: 'run_8', label: 'Course à pied ~8 km/h', met: 8.5, code: '12030' },
  { key: 'run_10', label: 'Course à pied ~10 km/h', met: 9.3, code: '12050' },
  { key: 'run_12', label: 'Course à pied ~12 km/h', met: 11.8, code: '12080' },
  { key: 'bike_leisure', label: 'Vélo tranquille (16–19 km/h)', met: 6.8, code: '01020' },
  { key: 'bike_moderate', label: 'Vélo soutenu (19–22 km/h)', met: 8.0, code: '01030' },
  { key: 'strength', label: 'Musculation', met: 3.5, code: '02054', strength: true },
  { key: 'strength_vigorous', label: 'Musculation intense', met: 6.0, code: '02050', strength: true },
  { key: 'hiit', label: 'HIIT / fractionné', met: 7.0, code: '02210' },
  { key: 'hiit_vigorous', label: 'HIIT intense', met: 11.0, code: '02214' },
  { key: 'yoga', label: 'Yoga', met: 2.3, code: '02150' },
  { key: 'pilates', label: 'Pilates', met: 2.8, code: '02105' },
  { key: 'elliptical', label: 'Vélo elliptique', met: 5.0, code: '02048' },
  { key: 'rowing', label: 'Rameur', met: 5.0, code: '02071' },
  { key: 'football', label: 'Football (loisir)', met: 7.0, code: '15610' },
  { key: 'basketball', label: 'Basket (loisir)', met: 6.0, code: '15050' },
  { key: 'tennis', label: 'Tennis', met: 6.8, code: '15675' },
  { key: 'badminton', label: 'Badminton', met: 5.5, code: '15030' },
  { key: 'dance', label: 'Danse', met: 6.0, code: '03042' },
  { key: 'climbing', label: 'Escalade', met: 8.0, code: '15533' },
]

export const activityByKey = (key: string) => ACTIVITIES.find((a) => a.key === key)

/** Seuils usuels : < 3 MET léger, 3 à 5,9 modéré, ≥ 6 soutenu (OMS) */
export function intensityOf(met: number): Intensity {
  if (met >= 6) return 'vigorous'
  if (met >= 3) return 'moderate'
  return 'light'
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: 'Légère',
  moderate: 'Modérée',
  vigorous: 'Soutenue',
}

/** Dépense nette d'une séance, en kcal (arrondie à 5). */
export function netKcal(met: number, durationMin: number, bmrKcalPerDay: number): number {
  const kcal = Math.max(0, met - 1) * (bmrKcalPerDay / 24) * (durationMin / 60)
  return Math.round(kcal / 5) * 5
}

export interface WeekActivity {
  done_on: string
  duration_min: number
  met: number
  activity_key: string
}

/**
 * Bilan de la semaine selon l'OMS (2020) : 150 min d'activité modérée,
 * ou l'équivalent en activité soutenue (1 min soutenue = 2 min modérées),
 * et du renforcement musculaire au moins 2 jours.
 */
export function weekSummary(list: WeekActivity[]) {
  let moderateEquivalent = 0
  const strengthDays = new Set<string>()
  for (const a of list) {
    const level = intensityOf(Number(a.met))
    if (level === 'vigorous') moderateEquivalent += 2 * a.duration_min
    else if (level === 'moderate') moderateEquivalent += a.duration_min
    if (activityByKey(a.activity_key)?.strength) strengthDays.add(a.done_on)
  }
  return { sessions: list.length, moderateEquivalent, strengthDays: strengthDays.size }
}

export const WHO_WEEKLY_MINUTES = 150
export const WHO_STRENGTH_DAYS = 2
