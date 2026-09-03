import { useCallback, useEffect, useMemo, useState } from 'react'
import { BlockDetail, NewWeekDialog } from './Dialogs'
import { PromptBar } from './PromptBar'
import { TodoRail } from './TodoRail'
import { GHOST_PREFIX, Week } from './Week'
import { fmtDuration, type Block } from './model'
import type { ParseResult } from './parse'
import { nowMinutes, todayIndex, usePlan } from './store'

export default function App() {
  const { plan, commit, updateBlock, removeBlock, toggleTodo, newWeek } = usePlan()
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(nowMinutes)

  const today = todayIndex()

  useEffect(() => {
    const tick = setInterval(() => setNow(nowMinutes()), 30_000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(null); setConfirming(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** Un-committed blocks from whatever is being typed, drawn into the week as ghosts. */
  const ghosts = useMemo<Block[]>(
    () => (preview?.blocks ?? []).map((d, i) => ({
      id: `${GHOST_PREFIX}${i}`,
      day: d.day, start: d.start, end: d.end,
      title: d.title, note: d.note, category: d.category,
    })),
    [preview],
  )

  const planned = plan.blocks.reduce((sum, b) => sum + (b.end - b.start), 0)
  const selected = selectedId ? plan.blocks.find((b) => b.id === selectedId) ?? null : null

  const handleCommit = useCallback((r: ParseResult) => commit(r.blocks, r.todos), [commit])
  const isTodoDone = useCallback(
    (id: string) => plan.todos.find((t) => t.id === id)?.done ?? false,
    [plan.todos],
  )

  return (
    <div className="app">
      <header className="head">
        <div className="wordmark">
          <h1>Week</h1>
          <span className="dot" />
          <span className="meta">
            {planned > 0 ? `${fmtDuration(planned).toUpperCase()} PLANNED` : 'NOTHING PLANNED YET'}
          </span>
        </div>
        <button className="ghost-btn" onClick={() => setConfirming(true)}>New week</button>
      </header>

      <div className="body">
        <Week
          plan={plan}
          ghosts={ghosts}
          today={today}
          now={now}
          onSelect={(b) => setSelectedId(b.id)}
          isTodoDone={isTodoDone}
        />
        <TodoRail plan={plan} onToggle={toggleTodo} />
      </div>

      <PromptBar day={today} onPreview={setPreview} onCommit={handleCommit} />

      {selected && (
        <BlockDetail
          block={selected}
          plan={plan}
          onChange={(patch) => updateBlock(selected.id, patch)}
          onDelete={() => { removeBlock(selected.id); setSelectedId(null) }}
          onToggleTodo={toggleTodo}
          onClose={() => setSelectedId(null)}
        />
      )}

      {confirming && (
        <NewWeekDialog
          plan={plan}
          onConfirm={() => { newWeek(); setConfirming(false) }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
