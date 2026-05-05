/**
 * @file absence-streaks.ts
 * @description Computes the longest consecutive absence streak for a senator
 * within a given year. Iterates all weekdays (Mon–Fri) and tracks runs of
 * days without attendance, flagging extended weekend patterns (streaks that
 * start on Thursday/Friday or end on Monday).
 *
 * Identical algorithm to the Câmara port at
 * `apps/web/app/camara/[id]/presenca/absence-streaks.ts` — the streak math is
 * institution-agnostic and only the input set of attended dates differs.
 */

/** A consecutive absence streak on weekdays. */
export interface AbsenceStreak {
  /** ISO date (YYYY-MM-DD) of the first absent weekday. */
  startDate: string
  /** ISO date (YYYY-MM-DD) of the last absent weekday. */
  endDate: string
  /** Number of consecutive absent weekdays. */
  days: number
  /**
   * Whether the streak suggests an extended weekend pattern: starts on
   * Thursday or Friday, or ends on Monday.
   */
  isExtendedWeekend: boolean
}

/**
 * Finds the longest streak of consecutive weekdays without attendance.
 *
 * Iterates every weekday (Monday through Friday) in the given year and
 * checks whether the date appears in the `attendedDates` set. Streaks
 * shorter than 3 days are ignored (returns null).
 *
 * @param attendedDates - ISO date strings (YYYY-MM-DD) the senator was present
 * @param year          - Calendar year to analyze
 * @returns The longest absence streak, or null if no streak of 3+ days exists
 */
export function computeLongestAbsenceStreak(
  attendedDates: Set<string>,
  year: number,
): AbsenceStreak | null {
  const today = new Date()
  const endOfYear = new Date(year, 11, 31)
  const upperBound = today < endOfYear ? today : endOfYear

  let longestStreak: AbsenceStreak | null = null
  let currentStart: string | null = null
  let currentDays = 0

  const date = new Date(year, 0, 1)

  while (date <= upperBound) {
    const dayOfWeek = date.getDay()

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      date.setDate(date.getDate() + 1)
      continue
    }

    const iso = formatDate(date)

    if (!attendedDates.has(iso)) {
      if (currentStart === null) {
        currentStart = iso
        currentDays = 1
      } else {
        currentDays++
      }
    } else {
      if (currentStart !== null && currentDays >= 3) {
        const streak = buildStreak(currentStart, getPreviousWeekday(date), currentDays)
        if (!longestStreak || streak.days > longestStreak.days) {
          longestStreak = streak
        }
      }
      currentStart = null
      currentDays = 0
    }

    date.setDate(date.getDate() + 1)
  }

  if (currentStart !== null && currentDays >= 3) {
    const lastWeekday = getPreviousWeekdayFrom(upperBound)
    const streak = buildStreak(currentStart, lastWeekday, currentDays)
    if (!longestStreak || streak.days > longestStreak.days) {
      longestStreak = streak
    }
  }

  return longestStreak
}

function buildStreak(startDate: string, endDate: string, days: number): AbsenceStreak {
  const startDay = new Date(startDate + "T12:00:00").getDay()
  const endDay = new Date(endDate + "T12:00:00").getDay()
  // Thursday = 4, Friday = 5, Monday = 1
  const isExtendedWeekend = startDay === 4 || startDay === 5 || endDay === 1
  return { startDate, endDate, days, isExtendedWeekend }
}

function getPreviousWeekday(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1)
  }
  return formatDate(d)
}

function getPreviousWeekdayFrom(date: Date): string {
  const d = new Date(date)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1)
  }
  return formatDate(d)
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}
