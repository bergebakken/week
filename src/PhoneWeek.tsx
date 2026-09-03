import { useEffect, useRef, useState } from 'react'
import { BlockRows } from './Blocks'
import { TodoRail } from './TodoRail'
import { PHONE_METRICS, PHONE_SCALE, layoutDay } from './layout'
import {
  DAY_NAMES, blocksForDay, committedMinutes, fmtDuration,
  type Block, type Day, type Plan,
} from './model'

/** How far a finger must travel sideways before it counts as a swipe. */
const SWIPE_THRESHOLD = 45

interface Props {
  plan: Plan
  ghosts: Block[]
  today: Day
  day: Day
  onDayChange: (day: Day) => void
  now: number
  onSelect: (block: Block) => void
  onToggleTodo: (todoId: string) => void
  isTodoDone: (todoId: string) => boolean
}

export function PhoneWeek({
  plan, ghosts, today, day, onDayChange, now, onSelect, onToggleTodo, isTodoDone,
}: Props) {
  const [direction, setDirection] = useState<1 | -1>(1)
  const touch = useRef<{ x: number; y: number } | null>(null)

  function go(to: Day, from: Day = day) {
    setDirection(to === from ? 1 : (to - from + 7) % 7 <= 3 ? 1 : -1)
    onDayChange(to)
  }

  function step(delta: 1 | -1) {
    setDirection(delta)
    onDayChange(((((day as number) + delta) % 7 + 7) % 7) as Day)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target
      if (el instanceof HTMLElement && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rows = layoutDay(
    [...blocksForDay(plan, day), ...ghosts.filter((g) => g.day === day)],
    PHONE_SCALE,
  )
  const committed = committedMinutes(plan, day)
  const isToday = today === day

  return (
    <div
      className="phone"
      onTouchStart={(e) => {
        const t = e.changedTouches[0]
        touch.current = t ? { x: t.clientX, y: t.clientY } : null
      }}
      onTouchEnd={(e) => {
        const from = touch.current
        const t = e.changedTouches[0]
        touch.current = null
        if (!from || !t) return
        const dx = t.clientX - from.x
        const dy = t.clientY - from.y
        // Ignore anything that reads as a scroll rather than a sideways swipe.
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return
        step(dx < 0 ? 1 : -1)
      }}
    >
      <div className="phone-nav">
        <button className="phone-arrow" onClick={() => step(-1)} aria-label="Previous day">
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3.5 5.5 9l5.5 5.5" /></svg>
        </button>
        <div className="phone-day">
          <span className="phone-dayname">{DAY_NAMES[day]}</span>
          <span className="phone-total">
            {isToday ? 'TODAY · ' : ''}
            {committed ? `${fmtDuration(committed).toUpperCase()} PLANNED` : 'NOTHING PLANNED'}
          </span>
        </div>
        <button className="phone-arrow" onClick={() => step(1)} aria-label="Next day">
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3.5 12.5 9 7 14.5" /></svg>
        </button>
      </div>

      <div className="phone-dots" role="tablist">
        {DAY_NAMES.map((name, index) => (
          <button
            key={name}
            className="phone-dot"
            aria-label={name}
            aria-selected={index === day}
            role="tab"
            onClick={() => go(index as Day)}
          >
            <span data-today={index === today ? '' : undefined} />
          </button>
        ))}
      </div>

      <div className="phone-blocks" key={day} data-direction={direction}>
        <BlockRows
          rows={rows}
          isToday={isToday}
          now={now}
          onSelect={onSelect}
          isTodoDone={isTodoDone}
          metrics={PHONE_METRICS}
        />
        {rows.length === 0 && (
          <p className="empty">Nothing planned for {DAY_NAMES[day]}. Write it below.</p>
        )}
      </div>

      <TodoRail plan={plan} onToggle={onToggleTodo} />
    </div>
  )
}
