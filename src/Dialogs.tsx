import { useState } from 'react'
import { Check, Close } from './Icons'
import { DAY_NAMES, fmtClock, fmtDuration, type Block, type Category, type Plan } from './model'

const CATEGORIES: Category[] = ['movement', 'study', 'food', 'rest', 'admin', 'other']
const LABELS: Record<Category, string> = {
  movement: 'Movement', study: 'Study', food: 'Food', rest: 'Rest', admin: 'Admin', other: 'Other',
}

function toMinutes(value: string): number | null {
  const m = /^(\d{1,2})[:.]?(\d{2})?$/.exec(value.trim())
  if (!m?.[1]) return null
  const h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

interface DetailProps {
  block: Block
  plan: Plan
  onChange: (patch: Partial<Omit<Block, 'id'>>) => void
  onDelete: () => void
  onToggleTodo: (todoId: string) => void
  onClose: () => void
}

export function BlockDetail({ block, plan, onChange, onDelete, onToggleTodo, onClose }: DetailProps) {
  const [start, setStart] = useState(fmtClock(block.start))
  const [end, setEnd] = useState(fmtClock(block.end))
  const todo = block.todoId ? plan.todos.find((t) => t.id === block.todoId) : undefined

  function commitTime(which: 'start' | 'end', value: string, reset: (s: string) => void) {
    const minutes = toMinutes(value)
    if (minutes === null) { reset(fmtClock(which === 'start' ? block.start : block.end)); return }
    const next = which === 'start'
      ? { start: minutes, end: Math.max(minutes + 5, block.end) }
      : { end: Math.max(block.start + 5, minutes) }
    onChange(next)
    reset(fmtClock(which === 'start' ? next.start! : next.end!))
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="card" style={{ maxWidth: 404 }} data-cat={block.category} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
            <span className="label">{DAY_NAMES[block.day]?.toUpperCase()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {todo && (
                <button style={{ background: 'none', border: 0, padding: 0, display: 'flex' }}
                        onClick={() => onToggleTodo(todo.id)} title="Mark done">
                  <Check done={todo.done} color="var(--ink)" size={15} />
                </button>
              )}
              <input
                className="detail-title"
                value={block.title}
                onChange={(e) => onChange({ title: e.target.value })}
                style={{
                  font: '400 26px/1.05 var(--serif)', color: 'var(--text)', background: 'transparent',
                  border: 0, outline: 0, padding: 0, width: '100%',
                }}
              />
            </div>
          </div>
          <button className="ghost-btn" style={{ padding: 6 }} onClick={onClose} aria-label="Close"><Close /></button>
        </div>

        <div className="row">
          <label className="field"><span className="label">STARTS</span>
            <input value={start} onChange={(e) => setStart(e.target.value)}
                   onBlur={(e) => commitTime('start', e.target.value, setStart)} />
          </label>
          <label className="field"><span className="label">ENDS</span>
            <input value={end} onChange={(e) => setEnd(e.target.value)}
                   onBlur={(e) => commitTime('end', e.target.value, setEnd)} />
          </label>
          <div className="field"><span className="label">LENGTH</span>
            <input value={fmtDuration(block.end - block.start)} readOnly style={{ color: 'var(--dim)' }} />
          </div>
        </div>

        <div className="field">
          <span className="label">CATEGORY</span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} className="chip" data-cat={c} aria-pressed={block.category === c}
                      onClick={() => onChange({ category: c })}>
                {LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="label">NOTES</span>
          <textarea value={block.note ?? ''} placeholder="Anything worth remembering"
                    onChange={(e) => onChange({ note: e.target.value || undefined })} />
        </label>

        <div className="card-foot">
          <button style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 0, padding: 0, color: 'var(--dim)', fontSize: 12 }}
                  onClick={() => onChange({ recurring: !block.recurring })}>
            <Check done={!!block.recurring} color={block.recurring ? 'var(--accent)' : 'var(--faint)'} />
            Repeat every week
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost-btn" onClick={onDelete}>Delete</button>
            <button className="primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NewWeekDialog({ plan, onConfirm, onClose }: { plan: Plan; onConfirm: () => void; onClose: () => void }) {
  const kept = plan.blocks.filter((b) => b.recurring)
  const cleared = plan.blocks.filter((b) => !b.recurring)
  const clearedMinutes = cleared.reduce((s, b) => s + (b.end - b.start), 0)
  const carried = plan.todos.filter((t) => !t.done).length
  const archived = plan.todos.length - carried

  return (
    <div className="scrim" onClick={onClose}>
      <div className="card" style={{ maxWidth: 568 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <h2>Start a new week</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--dim)', lineHeight: 1.5 }}>
            Anything marked <span style={{ color: 'var(--text-2)' }}>repeat every week</span> stays.
            Everything else clears, and open todos carry over.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 22 }}>
          <div className="field">
            <span className="label" style={{ color: '#7e8f76' }}>KEPT · {kept.length} BLOCKS</span>
            {kept.length === 0
              ? <p className="empty">Nothing is marked as repeating yet. Open a block and switch on “repeat every week”.</p>
              : <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {kept.map((b) => (
                    <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{b.title}</span>
                      <span className="todo-when" style={{ color: 'var(--faint)' }}>
                        {DAY_NAMES[b.day]?.slice(0, 3).toUpperCase()} {fmtClock(b.start)}
                      </span>
                    </li>
                  ))}
                </ul>}
          </div>
          <div className="field">
            <span className="label">CLEARED · {cleared.length} BLOCKS</span>
            <p className="empty">
              {clearedMinutes > 0 ? `${fmtDuration(clearedMinutes)} of planned time.` : 'Nothing to clear.'}
              {' '}{carried} open {carried === 1 ? 'todo' : 'todos'} carry over
              {archived > 0 && `, ${archived} completed archived`}.
            </p>
          </div>
        </div>

        <div className="card-foot">
          <span className="label">THIS CANNOT BE UNDONE</span>
          <div style={{ display: 'flex', gap: 9 }}>
            <button className="ghost-btn" onClick={onClose}>Cancel</button>
            <button className="primary" onClick={onConfirm}>Start new week</button>
          </div>
        </div>
      </div>
    </div>
  )
}
