import { layoutDay } from './layout'
import { Check } from './Icons'
import {
  DAY_NAMES, blocksForDay, committedMinutes, fmtClock, fmtDuration,
  type Block, type Day, type Plan,
} from './model'

export const GHOST_PREFIX = 'ghost:'

function timeLabel(b: Block): string {
  const length = b.end - b.start
  return length >= 120
    ? `${fmtClock(b.start)} → ${fmtClock(b.end)}`
    : `${fmtClock(b.start)} · ${fmtDuration(length)}`
}

interface WeekProps {
  plan: Plan
  ghosts: Block[]
  today: Day | null
  now: number
  onSelect: (block: Block) => void
  isTodoDone: (todoId: string) => boolean
}

export function Week({ plan, ghosts, today, now, onSelect, isTodoDone }: WeekProps) {
  return (
    <div className="week">
      {DAY_NAMES.map((name, index) => {
        const day = index as Day
        return (
          <DayColumn
            key={name}
            name={name}
            blocks={blocksForDay(plan, day)}
            ghosts={ghosts.filter((g) => g.day === day)}
            committed={committedMinutes(plan, day)}
            isToday={today === day}
            now={now}
            onSelect={onSelect}
            isTodoDone={isTodoDone}
          />
        )
      })}
    </div>
  )
}

interface ColumnProps {
  name: string
  blocks: Block[]
  ghosts: Block[]
  committed: number
  isToday: boolean
  now: number
  onSelect: (block: Block) => void
  isTodoDone: (todoId: string) => boolean
}

function DayColumn({ name, blocks, ghosts, committed, isToday, now, onSelect, isTodoDone }: ColumnProps) {
  const rows = layoutDay([...blocks, ...ghosts])

  return (
    <div className={isToday ? 'col today' : 'col'}>
      <div className="dayhead">
        <span className="dayname">{name}</span>
        <span className="daytotal">
          {isToday ? 'TODAY · ' : ''}
          {committed ? fmtDuration(committed).toUpperCase() : 'NOTHING PLANNED'}
        </span>
      </div>

      {rows.map((row, i) => {
        if (row.kind === 'gap') {
          return (
            <div className="gap" key={`gap-${i}`}>
              <span />
              <em>{fmtDuration(row.to - row.from).toUpperCase()} FREE</em>
              <span />
            </div>
          )
        }

        const { block, height, overlapsPrevious } = row
        const isGhost = block.id.startsWith(GHOST_PREFIX)
        const showsNow = isToday && !isGhost && now >= block.start && now < block.end
        const className = [
          'blk',
          height <= 34 ? 'short' : '',
          isGhost ? 'ghost' : '',
          overlapsPrevious ? 'clash' : '',
        ].filter(Boolean).join(' ')

        return (
          <button
            key={block.id}
            className={className}
            data-cat={block.category}
            style={{ height }}
            disabled={isGhost}
            onClick={() => onSelect(block)}
            title={overlapsPrevious ? 'Overlaps the block before it' : undefined}
          >
            <span className="blk-time">{timeLabel(block)}</span>
            <span className="blk-title-row">
              {block.todoId && <Check done={isTodoDone(block.todoId)} color="var(--ink)" size={12} />}
              <span className="blk-title">{block.title}</span>
            </span>
            {block.note && height >= 60 && <span className="blk-note">{block.note}</span>}
            {showsNow && (
              <span className="now" style={{ top: `${((now - block.start) / (block.end - block.start)) * 100}%` }}>
                <b />
                <em>{fmtClock(now)}</em>
              </span>
            )}
          </button>
        )
      })}

      {rows.length === 0 && <span className="empty">Nothing here yet.</span>}
    </div>
  )
}
