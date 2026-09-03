import { Check } from './Icons'
import { DAY_NAMES, fmtClock, fmtDuration, type Block, type Plan, type Todo } from './model'

interface Props {
  plan: Plan
  onToggle: (id: string) => void
}

export function TodoRail({ plan, onToggle }: Props) {
  const byId = new Map<string, Block>(plan.blocks.map((b) => [b.id, b]))
  const loose = plan.todos.filter((t) => !t.blockId)
  const scheduled = plan.todos.filter((t) => t.blockId && byId.has(t.blockId))
  const open = plan.todos.filter((t) => !t.done).length

  return (
    <aside className="rail">
      <div className="rail-head">
        <h2>Todos</h2>
        <span className="label">{open} OPEN</span>
      </div>

      {plan.todos.length === 0 && (
        <p className="empty">Write <code>#todo</code> in the prompt to add one. Give it a time and it lands in the week too.</p>
      )}

      {loose.length > 0 && (
        <div className="rail-list">
          {loose.map((t) => <TodoRow key={t.id} todo={t} onToggle={onToggle} />)}
        </div>
      )}

      {scheduled.length > 0 && (
        <>
          <div className="rail-divider">
            <span className="label" style={{ flex: '0 0 auto' }}>SCHEDULED</span>
            <span />
          </div>
          <div className="rail-list">
            {scheduled.map((t) => (
              <TodoRow key={t.id} todo={t} onToggle={onToggle} block={byId.get(t.blockId!)} />
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

function TodoRow({ todo, onToggle, block }: { todo: Todo; onToggle: (id: string) => void; block?: Block }) {
  return (
    <button className={todo.done ? 'todo done' : 'todo'} onClick={() => onToggle(todo.id)}>
      <Check done={todo.done} color={todo.done ? '#453f38' : block ? '#ac9bb8' : '#5e594f'} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span className="todo-text">{todo.text}</span>
        {block && (
          <span className="todo-when">
            {DAY_NAMES[block.day]?.slice(0, 3).toUpperCase()} {fmtClock(block.start)} ·{' '}
            {fmtDuration(block.end - block.start).toUpperCase()}
          </span>
        )}
      </span>
    </button>
  )
}
