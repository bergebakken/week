import { clockToMinutes, type Category, type Day } from './model'
import type { DraftBlock } from './parse'
import type { SyncConfig } from './sync'

const CATEGORIES: Category[] = ['movement', 'study', 'food', 'rest', 'admin', 'other']

export interface Interpreted {
  blocks: DraftBlock[]
  todos: { text: string; note?: string }[]
  unreadable: string[]
}

export interface Context {
  day: Day
  existing: { day: number; start: string; end: string; title: string }[]
}

function readClock(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m?.[1] || !m[2]) return null
  return clockToMinutes(Number.parseInt(m[1], 10), Number.parseInt(m[2], 10))
}

/**
 * The reply is data from a model, not a contract. Anything that does not
 * survive checking is dropped rather than trusted into someone's week.
 */
function readBlocks(raw: unknown): DraftBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: DraftBlock[] = []

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const b = item as Record<string, unknown>

    const day = typeof b.day === 'number' && Number.isInteger(b.day) && b.day >= 0 && b.day <= 6
      ? (b.day as Day)
      : null
    const start = readClock(b.start)
    const end = readClock(b.end)
    const title = typeof b.title === 'string' ? b.title.trim() : ''
    if (day === null || start === null || end === null || end <= start || !title) continue

    const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim() : undefined
    const category = CATEGORIES.includes(b.category as Category) ? (b.category as Category) : 'other'
    blocks.push({ day, start, end, title, note, category, isTodo: b.isTodo === true })
  }

  return blocks
}

function readTodos(raw: unknown): { text: string; note?: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const t = item as Record<string, unknown>
    const text = typeof t.text === 'string' ? t.text.trim() : ''
    if (!text) return []
    const note = typeof t.note === 'string' && t.note.trim() ? t.note.trim() : undefined
    return [{ text, note }]
  })
}

/** Asks Claude to place the lines the local parser could not read. */
export async function interpret(
  config: SyncConfig,
  lines: string[],
  context: Context,
  signal?: AbortSignal,
): Promise<Interpreted> {
  const response = await fetch(`${config.url.replace(/\/+$/, '')}/interpret`, {
    method: 'POST',
    headers: { 'x-week-key': config.code, 'content-type': 'application/json' },
    body: JSON.stringify({ lines, context }),
    signal,
  })

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `failed (${response.status})`
    throw new Error(message)
  }

  const result = (body ?? {}) as Record<string, unknown>
  return {
    blocks: readBlocks(result.blocks),
    todos: readTodos(result.todos),
    unreadable: Array.isArray(result.unreadable)
      ? result.unreadable.filter((l): l is string => typeof l === 'string')
      : [],
  }
}
