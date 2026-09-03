import { PLAN_VERSION, emptyPlan, type Block, type Plan, type Todo } from './model'

/** Anything with an id and a last-changed time can be merged the same way. */
interface Versioned {
  id: string
  updatedAt: number
}

/** Reads whatever is in storage, of whatever vintage, and returns a current plan. */
export function migratePlan(raw: unknown): Plan {
  if (typeof raw !== 'object' || raw === null) return emptyPlan()
  const candidate = raw as Partial<Plan> & { version?: number }
  if (!Array.isArray(candidate.blocks) || !Array.isArray(candidate.todos)) return emptyPlan()

  // v1 had no timestamps. Stamp everything now so nothing is treated as ancient.
  const stamp = Date.now()
  const withTime = <T extends { id: string; updatedAt?: number }>(item: T) =>
    ({ ...item, updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : stamp })

  return {
    version: PLAN_VERSION,
    blocks: candidate.blocks.map(withTime) as Block[],
    todos: candidate.todos.map(withTime) as Todo[],
    tombstones: typeof candidate.tombstones === 'object' && candidate.tombstones !== null
      ? { ...candidate.tombstones }
      : {},
  }
}

function mergeItems<T extends Versioned>(mine: T[], theirs: T[], tombstones: Record<string, number>): T[] {
  const byId = new Map<string, T>()
  for (const item of [...mine, ...theirs]) {
    const existing = byId.get(item.id)
    // Newest edit wins. Ties keep what is already there, which is stable either way.
    if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item)
  }
  return [...byId.values()].filter((item) => {
    const deletedAt = tombstones[item.id]
    return deletedAt === undefined || item.updatedAt > deletedAt
  })
}

/**
 * Combines two versions of the plan without a server deciding a winner.
 * Per item, the newer edit wins; a deletion wins unless the item was edited
 * after it was deleted.
 */
export function mergePlans(mine: Plan, theirs: Plan): Plan {
  const tombstones: Record<string, number> = { ...mine.tombstones }
  for (const [id, at] of Object.entries(theirs.tombstones)) {
    const existing = tombstones[id]
    if (existing === undefined || at > existing) tombstones[id] = at
  }

  return {
    version: PLAN_VERSION,
    blocks: mergeItems(mine.blocks, theirs.blocks, tombstones),
    todos: mergeItems(mine.todos, theirs.todos, tombstones),
    tombstones,
  }
}

/** Drops tombstones that no longer protect anything, so the document stays small. */
export function pruneTombstones(plan: Plan, olderThanMs = 30 * 86_400_000, now = Date.now()): Plan {
  const tombstones: Record<string, number> = {}
  for (const [id, at] of Object.entries(plan.tombstones)) {
    if (now - at < olderThanMs) tombstones[id] = at
  }
  return { ...plan, tombstones }
}

/** Long enough that it cannot be guessed; it is the only thing guarding the plan. */
export function newSyncCode(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SyncConfig {
  url: string
  code: string
}

export type SyncState =
  | { status: 'off' }
  | { status: 'syncing' }
  | { status: 'ok'; at: number }
  | { status: 'error'; message: string }

function endpoint(config: SyncConfig): string {
  return `${config.url.replace(/\/+$/, '')}/plan`
}

export async function pullPlan(config: SyncConfig, signal?: AbortSignal): Promise<Plan | null> {
  const response = await fetch(endpoint(config), {
    headers: { 'x-week-key': config.code },
    signal,
  })
  if (!response.ok) throw new Error(`pull failed (${response.status})`)
  const body: unknown = await response.json()
  return body === null ? null : migratePlan(body)
}

export async function pushPlan(config: SyncConfig, plan: Plan, signal?: AbortSignal): Promise<Plan> {
  const response = await fetch(endpoint(config), {
    method: 'PUT',
    headers: { 'x-week-key': config.code, 'content-type': 'application/json' },
    body: JSON.stringify(plan),
    signal,
  })
  if (!response.ok) throw new Error(`save failed (${response.status})`)
  // The server merges too, and hands back the result, so both sides agree.
  const body: unknown = await response.json()
  return migratePlan(body)
}
