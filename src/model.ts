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
}

export interface Todo {
  id: string
  text: string
  note?: string
  done: boolean
  /** Set when the todo also occupies time in the grid. */
  blockId?: string
}

export interface Plan {
  version: 1
  blocks: Block[]
  todos: Todo[]
}

export const emptyPlan = (): Plan => ({ version: 1, blocks: [], todos: [] })

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
