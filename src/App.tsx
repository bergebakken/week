import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock } from './Clock'
import { DailyQuote, FactButton } from './Daily'
import { Gear } from './Icons'
import { Settings } from './Settings'
import { BlockDetail, NewWeekDialog } from './Dialogs'
import { PhoneWeek } from './PhoneWeek'
import { PromptBar } from './PromptBar'
import { TodoRail } from './TodoRail'
import { GHOST_PREFIX, Week } from './Week'
import { fmtClock, fmtDuration, type Block, type Day } from './model'
import type { ParseResult } from './parse'
import { nowMinutes, todayIndex, usePlan } from './store'
import { useMedia } from './useMedia'

export default function App() {
  const { plan, commit, updateBlock, removeBlock, toggleTodo, newWeek, sync, syncState, configure } = usePlan()
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(nowMinutes)

  const today = todayIndex()
  const isPhone = useMedia('(max-width: 700px)')
  /** Which day the phone view is showing; also where the prompt files an undated line. */
  const [viewDay, setViewDay] = useState<Day>(today)

  useEffect(() => {
    const tick = setInterval(() => setNow(nowMinutes()), 30_000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(null); setConfirming(false); setSettingsOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** Un-committed blocks from whatever is being typed, drawn into the week as ghosts. */
  const ghosts = useMemo<Block[]>(
    () => (preview?.blocks ?? []).map((d, i) => ({
      id: `${GHOST_PREFIX}${i}`,
      day: d.day, start: d.start, end: d.end,
      title: d.title, note: d.note, category: d.category, updatedAt: 0,
    })),
    [preview],
  )

  const planned = plan.blocks.reduce((sum, b) => sum + (b.end - b.start), 0)
  const selected = selectedId ? plan.blocks.find((b) => b.id === selectedId) ?? null : null

  /** What is already planned, so Claude can resolve "after lunch". */
  const existing = useMemo(
    () => plan.blocks.map((b) => ({
      day: b.day, start: fmtClock(b.start), end: fmtClock(b.end), title: b.title,
    })),
    [plan.blocks],
  )
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
        <DailyQuote />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock />
          <FactButton />
          <button
            className="icon-btn"
            data-sync={syncState.status}
            aria-label="Sync settings"
            title={syncState.status === 'error' ? `Sync problem: ${syncState.message}` : `Sync: ${syncState.status}`}
            onClick={() => setSettingsOpen(true)}
          >
            <Gear />
          </button>
          <button className="ghost-btn" onClick={() => setConfirming(true)}>New week</button>
        </div>
      </header>

      <div className={isPhone ? 'body is-phone' : 'body'}>
        {isPhone ? (
          <PhoneWeek
            plan={plan}
            ghosts={ghosts}
            today={today}
            day={viewDay}
            onDayChange={setViewDay}
            now={now}
            onSelect={(b) => setSelectedId(b.id)}
            onToggleTodo={toggleTodo}
            isTodoDone={isTodoDone}
          />
        ) : (
          <>
            <Week
              plan={plan}
              ghosts={ghosts}
              today={today}
              now={now}
              onSelect={(b) => setSelectedId(b.id)}
              isTodoDone={isTodoDone}
            />
            <TodoRail plan={plan} onToggle={toggleTodo} />
          </>
        )}
      </div>

      <PromptBar
        day={isPhone ? viewDay : today}
        onPreview={setPreview}
        onCommit={commit}
        ai={sync ? { config: sync, existing } : null}
      />

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

      {settingsOpen && (
        <Settings
          sync={sync}
          state={syncState}
          onChange={configure}
          onClose={() => setSettingsOpen(false)}
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
