import { BlockRows } from './Blocks'
import { layoutDay } from './layout'
import {
  DAY_NAMES, blocksForDay, committedMinutes, fmtDuration,
  type Block, type Day, type Plan,
} from './model'

export { GHOST_PREFIX } from './Blocks'

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
        const rows = layoutDay([...blocksForDay(plan, day), ...ghosts.filter((g) => g.day === day)])
        const committed = committedMinutes(plan, day)
        const isToday = today === day

        return (
          <div className={isToday ? 'col today' : 'col'} key={name}>
            <div className="dayhead">
              <span className="dayname">{name}</span>
              <span className="daytotal">
                {isToday ? 'TODAY · ' : ''}
                {committed ? fmtDuration(committed).toUpperCase() : 'NOTHING PLANNED'}
              </span>
            </div>
            <BlockRows rows={rows} isToday={isToday} now={now} onSelect={onSelect} isTodoDone={isTodoDone} />
            {rows.length === 0 && <span className="empty">Nothing here yet.</span>}
          </div>
        )
      })}
    </div>
  )
}
