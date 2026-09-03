import { useCallback, useEffect, useState } from 'react'
import { emptyPlan, type Block, type Day, type Plan, type Todo } from './model'
import type { DraftBlock } from './parse'

const KEY = 'week.plan.v1'

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

function load(): Plan {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyPlan()
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' && parsed !== null &&
      (parsed as Plan).version === 1 &&
      Array.isArray((parsed as Plan).blocks) && Array.isArray((parsed as Plan).todos)
    ) {
      return parsed as Plan
    }
  } catch {
    // A corrupt or unreadable store should not stop the app from opening.
  }
  return emptyPlan()
}

export function usePlan() {
  const [plan, setPlan] = useState<Plan>(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(plan))
    } catch {
      // Private browsing or a full quota: the week stays in memory for this session.
    }
  }, [plan])

  /** Adds parsed blocks and todos in one step, linking any block that carried #todo. */
  const commit = useCallback((drafts: DraftBlock[], loose: { text: string; note?: string }[]) => {
    if (!drafts.length && !loose.length) return
    setPlan((p) => {
      const blocks = [...p.blocks]
      const todos = [...p.todos]
      for (const d of drafts) {
        const block: Block = {
          id: newId(), day: d.day, start: d.start, end: d.end,
          title: d.title, note: d.note, category: d.category,
        }
        if (d.isTodo) {
          const todo: Todo = { id: newId(), text: d.title, note: d.note, done: false, blockId: block.id }
          block.todoId = todo.id
          todos.push(todo)
        }
        blocks.push(block)
      }
      for (const t of loose) todos.push({ id: newId(), text: t.text, note: t.note, done: false })
      return { ...p, blocks, todos }
    })
  }, [])

  const updateBlock = useCallback((id: string, patch: Partial<Omit<Block, 'id'>>) => {
    setPlan((p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      todos: patch.title === undefined
        ? p.todos
        : p.todos.map((t) => (t.blockId === id ? { ...t, text: patch.title! } : t)),
    }))
  }, [])

  const removeBlock = useCallback((id: string) => {
    setPlan((p) => ({
      ...p,
      blocks: p.blocks.filter((b) => b.id !== id),
      // The todo outlives its block; it just goes back to being unscheduled.
      todos: p.todos.map((t) => (t.blockId === id ? { ...t, blockId: undefined } : t)),
    }))
  }, [])

  const toggleTodo = useCallback((id: string) => {
    setPlan((p) => ({ ...p, todos: p.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }))
  }, [])

  const addTodo = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setPlan((p) => ({ ...p, todos: [...p.todos, { id: newId(), text: trimmed, done: false }] }))
  }, [])

  /** Keeps blocks marked recurring and todos still open; clears everything else. */
  const newWeek = useCallback(() => {
    setPlan((p) => {
      const blocks = p.blocks.filter((b) => b.recurring)
      const kept = new Set(blocks.map((b) => b.id))
      const todos = p.todos
        .filter((t) => !t.done)
        .map((t) => (t.blockId && !kept.has(t.blockId) ? { ...t, blockId: undefined } : t))
      return { ...p, blocks, todos }
    })
  }, [])

  return { plan, commit, updateBlock, removeBlock, toggleTodo, addTodo, newWeek }
}

export type PlanStore = ReturnType<typeof usePlan>
