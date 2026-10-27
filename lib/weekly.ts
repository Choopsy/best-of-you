/**
 * Bilan de la semaine : moyennes sur les jours notés, régularité, sport (repères OMS),
 * tendance du poids et UNE piste concrète. Module pur (testé par scripts/test-weekly.ts).
 *
 * Choix de présentation (bonnes pratiques des applis de suivi) :
 * - un chiffre seul dit peu : on compare à la semaine d'avant ;
 * - les jours non notés ne comptent pas dans les moyennes (sinon un oubli ferait croire à un jeûne) ;
 * - pas de note globale ni de « réussi / raté » : on souligne la régularité.
 */
import { weekSummary, WHO_STRENGTH_DAYS, WHO_WEEKLY_MINUTES, type WeekActivity } from './activities'
import { shiftDate } from './dates'

export interface DayIntake {
  date: string
  kcal: number
  proteins_g: number
  fiber_g: number
  /** Au moins une entrée notée ce jour-là */
  logged: boolean
}

export interface WeekInput {
  /** Lundi de la semaine */
  start: string
  /** Les 7 jours, du lundi au dimanche (jours futurs exclus des calculs) */
  days: DayIntake[]
  /** Dernier jour pris en compte (aujourd'hui pour la semaine en cours) */
  until: string
  /** Objectif calories du jour (peut varier avec le sport noté) */
  kcalTargetFor: (date: string) => number | null
  proteinTarget: number | null
  fiberTarget: number
  activities: WeekActivity[]
  sessionsGoal: number | null
  /** Évolution de la tendance du poids sur la semaine (kg), si assez de pesées */
  weightChange: number | null
}

export interface WeekReview {
  start: string
  end: string
  elapsedDays: number
  loggedDays: number
  avgKcal: number | null
  avgKcalTarget: number | null
  avgProtein: number | null
  avgFiber: number | null
  /** Jours notés à ±10 % de l'objectif calories */
  daysOnTarget: number
  /** Jours notés sous 90 % de l'objectif protéines */
  proteinLowDays: number
  sessions: number
  activeMinutes: number
  strengthDays: number
  sessionsGoal: number | null
  weightChange: number | null
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function reviewWeek(input: WeekInput): WeekReview {
  const end = shiftDate(input.start, 6)
  const days = input.days.filter((d) => d.date <= input.until)
  const logged = days.filter((d) => d.logged)
  const targets = logged.map((d) => input.kcalTargetFor(d.date)).filter((t): t is number => t != null)
  const daysOnTarget = logged.filter((d) => {
    const t = input.kcalTargetFor(d.date)
    return t != null && Math.abs(d.kcal - t) <= t * 0.1
  }).length
  const proteinLowDays = input.proteinTarget != null
    ? logged.filter((d) => d.proteins_g < input.proteinTarget! * 0.9).length
    : 0
  const sport = weekSummary(input.activities.filter((a) => a.done_on >= input.start && a.done_on <= end))
  return {
    start: input.start,
    end,
    elapsedDays: days.length,
    loggedDays: logged.length,
    avgKcal: avg(logged.map((d) => d.kcal)),
    avgKcalTarget: avg(targets),
    avgProtein: avg(logged.map((d) => d.proteins_g)),
    avgFiber: avg(logged.map((d) => d.fiber_g)),
    daysOnTarget,
    proteinLowDays,
    sessions: sport.sessions,
    activeMinutes: sport.moderateEquivalent,
    strengthDays: sport.strengthDays,
    sessionsGoal: input.sessionsGoal,
    weightChange: input.weightChange,
  }
}

export interface Tip { title: string; text: string }

/** Une seule piste, la plus utile, tirée des données ; rien si la semaine est trop peu notée pour conclure. */
export function pickTip(r: WeekReview, proteinTarget: number | null, fiberTarget: number): Tip {
  if (r.loggedDays < 3) {
    return {
      title: 'Noter un peu plus',
      text: r.elapsedDays < 3
        ? 'La semaine commence : note tes repas principaux et le bilan se remplira au fil des jours.'
        : `${r.loggedDays} jour${r.loggedDays > 1 ? 's' : ''} noté${r.loggedDays > 1 ? 's' : ''} : à partir de 4 jours, les moyennes deviennent fiables. « Récents » et « Comme hier » vont vite.`,
    }
  }
  if (proteinTarget && r.proteinLowDays >= Math.ceil(r.loggedDays / 2) && r.avgProtein != null && r.avgProtein < proteinTarget * 0.9) {
    return {
      title: 'Les protéines',
      text: `Sous ton repère ${r.proteinLowDays} jour${r.proteinLowDays > 1 ? 's' : ''} sur ${r.loggedDays}. Une source au petit-déjeuner (œufs, skyr, fromage blanc) comble souvent l'écart.`,
    }
  }
  if (r.avgFiber != null && r.avgFiber < fiberTarget * 0.7) {
    return {
      title: 'Les fibres',
      text: `${Math.round(r.avgFiber)} g par jour en moyenne pour un repère de ${fiberTarget} g. Légumineuses, légumes et pain complet sont les plus efficaces.`,
    }
  }
  if (r.activeMinutes < WHO_WEEKLY_MINUTES) {
    const missing = WHO_WEEKLY_MINUTES - r.activeMinutes
    return {
      title: 'Bouger un peu plus',
      text: `Il manque ${missing} minutes pour le repère de l'OMS. ${Math.ceil(missing / 20)} marche${Math.ceil(missing / 20) > 1 ? 's' : ''} rapide${Math.ceil(missing / 20) > 1 ? 's' : ''} de 20 minutes suffi${Math.ceil(missing / 20) > 1 ? 'sent' : 't'}.`,
    }
  }
  if (r.strengthDays < WHO_STRENGTH_DAYS) {
    return {
      title: 'Le renforcement',
      text: 'Le repère OMS est atteint en minutes ; ajoute 2 séances de renforcement (même 20 minutes au poids du corps).',
    }
  }
  return {
    title: 'Belle semaine',
    text: 'Régularité, protéines, fibres et sport au rendez-vous : garde ce rythme, c\'est lui qui fait la différence.',
  }
}

/** Écart avec la semaine d'avant, arrondi, ou null si une des deux valeurs manque. */
export function delta(cur: number | null, prev: number | null, digits = 0): number | null {
  if (cur == null || prev == null) return null
  const f = 10 ** digits
  return Math.round((cur - prev) * f) / f
}
