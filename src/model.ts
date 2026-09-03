export const DAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const

/** 0 = Monday ... 6 = Sunday. The plan has no dates on purpose. */
export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Category = 'movement' | 'study' | 'food' | 'rest' | 'admin' | 'other'

/** Times are minutes from midnight, so nothing in this app needs a date or a timezone. */
export interface Block {
  id: string
  day: Day
  start: number
  end: number
  title: string
  note?: string
  category: Category
  /** Set when this block was created from a todo; ticking either side ticks both. */
  todoId?: string
  /** Survives "New week". */
  recurring?: boolean
  /** When this was last changed, so two devices can be merged. */
  updatedAt: number
}

export interface Todo {
  id: string
  text: string
  note?: string
  done: boolean
  /** Set when the todo also occupies time in the grid. */
  blockId?: string
  /** When this was last changed, so two devices can be merged. */
  updatedAt: number
}

export const PLAN_VERSION = 2

export interface Plan {
  version: typeof PLAN_VERSION
  blocks: Block[]
  todos: Todo[]
  /**
   * Ids that have been deleted, and when. Without these a delete on one device
   * looks like a missing item on the other and simply comes back.
   */
  tombstones: Record<string, number>
}

export const emptyPlan = (): Plan => ({ version: PLAN_VERSION, blocks: [], todos: [], tombstones: {} })

export const MINUTES_IN_DAY = 24 * 60

export function clockToMinutes(hours: number, minutes = 0): number | null {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/** Blocks on a day, earliest first. */
export function blocksForDay(plan: Plan, day: Day): Block[] {
  return plan.blocks.filter((b) => b.day === day).sort((a, b) => a.start - b.start || a.end - b.end)
}

export function committedMinutes(plan: Plan, day: Day): number {
  return blocksForDay(plan, day).reduce((sum, b) => sum + (b.end - b.start), 0)
}

/** ISO-8601 week number: weeks start Monday, week 1 holds the first Thursday. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}
