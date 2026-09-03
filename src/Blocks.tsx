import { Check } from './Icons'
import { DESKTOP_METRICS, fitBlock, type Metrics, type Row } from './layout'
import { fmtClock, fmtDuration, type Block } from './model'

export const GHOST_PREFIX = 'ghost:'

function timeLabel(b: Block): string {
  const length = b.end - b.start
  return length >= 120
    ? `${fmtClock(b.start)} → ${fmtClock(b.end)}`
    : `${fmtClock(b.start)} · ${fmtDuration(length)}`
}

interface Props {
  rows: Row[]
  isToday: boolean
  now: number
  onSelect: (block: Block) => void
  isTodoDone: (todoId: string) => boolean
  metrics?: Metrics
}

/** Renders a day's rows. Shared by the week grid and the phone view so the two cannot drift. */
export function BlockRows({ rows, isToday, now, onSelect, isTodoDone, metrics = DESKTOP_METRICS }: Props) {
  return (
    <>
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
        const fit = fitBlock(height, metrics)
        const className = [
          'blk',
          fit.compact ? 'compact' : '',
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
            title={[
              `${fmtClock(block.start)}–${fmtClock(block.end)} · ${block.title}`,
              block.note,
              overlapsPrevious ? 'Overlaps the block before it' : undefined,
            ].filter(Boolean).join('\n')}
          >
            {/* A compact block drops the duration to leave room for the title. */}
            <span className="blk-time">{fit.compact ? fmtClock(block.start) : timeLabel(block)}</span>
            <span className="blk-title-row">
              {block.todoId && <Check done={isTodoDone(block.todoId)} color="var(--ink)" size={12} />}
              <span className="blk-title" style={{ WebkitLineClamp: fit.titleLines }}>{block.title}</span>
            </span>
            {block.note && fit.showNote && <span className="blk-note">{block.note}</span>}
            {showsNow && (
              <span className="now" style={{ top: `${((now - block.start) / (block.end - block.start)) * 100}%` }}>
                <b />
                <em>{fmtClock(now)}</em>
              </span>
            )}
          </button>
        )
      })}
    </>
  )
}
