import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyPlan, type Block, type Day, type Plan, type Todo } from './model'
import type { DraftBlock } from './parse'
import {
  migratePlan, mergePlans, pruneTombstones, pullPlan, pushPlan,
  type SyncConfig, type SyncState,
} from './sync'

const PLAN_KEY = 'week.plan.v1'
const SYNC_KEY = 'week.sync'
/** How long to wait after the last edit before saving to the server. */
const PUSH_DELAY = 1200
const PULL_EVERY = 20_000

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** 0 = Monday, to match Day. */
export function todayIndex(): Day {
  return ((new Date().getDay() + 6) % 7) as Day
}

export function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function read<T>(key: string, fallback: T): T | unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as unknown)
  } catch {
    // A corrupt or unreadable store should not stop the app from opening.
    return fallback
  }
}

function loadPlan(): Plan {
  return migratePlan(read(PLAN_KEY, null))
}

function loadSync(): SyncConfig | null {
  const raw = read(SYNC_KEY, null)
  if (typeof raw !== 'object' || raw === null) return null
  const { url, code } = raw as Partial<SyncConfig>
  return typeof url === 'string' && typeof code === 'string' && url && code ? { url, code } : null
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'could not reach the server'
}

export function usePlan() {
  const [plan, setPlan] = useState<Plan>(loadPlan)
  const [sync, setSync] = useState<SyncConfig | null>(loadSync)
  const [syncState, setSyncState] = useState<SyncState>(() => (loadSync() ? { status: 'syncing' } : { status: 'off' }))

  const planRef = useRef(plan)
  planRef.current = plan
  /** Serialised copy of what the server is known to hold, so we do not push in circles. */
  const confirmed = useRef('')

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
    } catch {
      // Private browsing or a full quota: the week stays in memory for this session.
    }
  }, [plan])

  const configure = useCallback((next: SyncConfig | null) => {
    confirmed.current = ''
    setSync(next)
    setSyncState(next ? { status: 'syncing' } : { status: 'off' })
    try {
      if (next) window.localStorage.setItem(SYNC_KEY, JSON.stringify(next))
      else window.localStorage.removeItem(SYNC_KEY)
    } catch {
      // Non-fatal: sync just will not survive a reload.
    }
  }, [])

  // Send local edits up, once they settle.
  useEffect(() => {
    if (!sync) return
    const body = JSON.stringify(plan)
    if (body === confirmed.current) return

    const timer = setTimeout(() => {
      setSyncState({ status: 'syncing' })
      pushPlan(sync, plan)
        .then((merged) => {
          confirmed.current = JSON.stringify(merged)
          if (confirmed.current !== JSON.stringify(planRef.current)) setPlan(merged)
          setSyncState({ status: 'ok', at: Date.now() })
        })
        .catch((error: unknown) => setSyncState({ status: 'error', message: message(error) }))
    }, PUSH_DELAY)

    return () => clearTimeout(timer)
  }, [plan, sync])

  // Bring other devices' edits down, on a timer and whenever the tab comes back.
  useEffect(() => {
    if (!sync) return
    let live = true

    const pull = () => {
      pullPlan(sync)
        .then((remote) => {
          if (!live || !remote) return
          setPlan((current) => {
            const merged = mergePlans(current, remote)
            return JSON.stringify(merged) === JSON.stringify(current) ? current : merged
          })
          setSyncState({ status: 'ok', at: Date.now() })
        })
        .catch((error: unknown) => { if (live) setSyncState({ status: 'error', message: message(error) }) })
    }

    pull()
    const timer = setInterval(pull, PULL_EVERY)
    const onReturn = () => { if (document.visibilityState === 'visible') pull() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)

    return () => {
      live = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [sync])

  /** Adds parsed blocks and todos in one step, linking any block that carried #todo. */
  const commit = useCallback((drafts: DraftBlock[], loose: { text: string; note?: string }[]) => {
    if (!drafts.length && !loose.length) return
    const at = Date.now()
    setPlan((p) => {
      const blocks = [...p.blocks]
      const todos = [...p.todos]
      for (const d of drafts) {
        const block: Block = {
          id: newId(), day: d.day, start: d.start, end: d.end,
          title: d.title, note: d.note, category: d.category, updatedAt: at,
        }
        if (d.isTodo) {
          const todo: Todo = {
            id: newId(), text: d.title, note: d.note, done: false, blockId: block.id, updatedAt: at,
          }
          block.todoId = todo.id
          todos.push(todo)
        }
        blocks.push(block)
      }
      for (const t of loose) {
        todos.push({ id: newId(), text: t.text, note: t.note, done: false, updatedAt: at })
      }
      return { ...p, blocks, todos }
    })
  }, [])

  const updateBlock = useCallback((id: string, patch: Partial<Omit<Block, 'id' | 'updatedAt'>>) => {
    const at = Date.now()
    setPlan((p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: at } : b)),
      todos: patch.title === undefined
        ? p.todos
        : p.todos.map((t) => (t.blockId === id ? { ...t, text: patch.title!, updatedAt: at } : t)),
    }))
  }, [])

  const removeBlock = useCallback((id: string) => {
    const at = Date.now()
    setPlan((p) => ({
      ...p,
      blocks: p.blocks.filter((b) => b.id !== id),
      // The todo outlives its block; it just goes back to being unscheduled.
      todos: p.todos.map((t) => (t.blockId === id ? { ...t, blockId: undefined, updatedAt: at } : t)),
      tombstones: { ...p.tombstones, [id]: at },
    }))
  }, [])

  const toggleTodo = useCallback((id: string) => {
    const at = Date.now()
    setPlan((p) => ({
      ...p,
      todos: p.todos.map((t) => (t.id === id ? { ...t, done: !t.done, updatedAt: at } : t)),
    }))
  }, [])

  const addTodo = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setPlan((p) => ({
      ...p,
      todos: [...p.todos, { id: newId(), text: trimmed, done: false, updatedAt: Date.now() }],
    }))
  }, [])

  /** Keeps blocks marked recurring and todos still open; clears everything else. */
  const newWeek = useCallback(() => {
    const at = Date.now()
    setPlan((p) => {
      const blocks = p.blocks.filter((b) => b.recurring)
      const kept = new Set(blocks.map((b) => b.id))
      const tombstones = { ...p.tombstones }
      for (const b of p.blocks) if (!kept.has(b.id)) tombstones[b.id] = at
      for (const t of p.todos) if (t.done) tombstones[t.id] = at

      const todos = p.todos
        .filter((t) => !t.done)
        .map((t) => (t.blockId && !kept.has(t.blockId) ? { ...t, blockId: undefined, updatedAt: at } : t))

      return pruneTombstones({ ...p, blocks, todos, tombstones })
    })
  }, [])

  const reset = useCallback(() => setPlan(emptyPlan()), [])

  return {
    plan, commit, updateBlock, removeBlock, toggleTodo, addTodo, newWeek, reset,
    sync, syncState, configure,
  }
}

export type PlanStore = ReturnType<typeof usePlan>
