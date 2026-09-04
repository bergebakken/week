import { useEffect, useMemo, useRef, useState } from 'react'
import { interpret, type Context } from './ai'
import { Spark } from './Icons'
import { fmtClock, type Category, type Day } from './model'
import { parse, type DraftBlock, type ParseResult } from './parse'
import type { SyncConfig } from './sync'

const INK: Record<Category, string> = {
  movement: '#9cb292', study: '#93a7c0', food: '#c8ac7c',
  rest: '#c79c9c', admin: '#ac9bb8', other: '#a39c90',
}

interface Props {
  day: Day
  onPreview: (result: ParseResult | null) => void
  onCommit: (blocks: DraftBlock[], todos: { text: string; note?: string }[]) => void
  /** Present only once sync is configured; the key lives on that same server. */
  ai: { config: SyncConfig; existing: Context['existing'] } | null
}

export function PromptBar({ day, onPreview, onCommit, ai }: Props) {
  const [text, setText] = useState('')
  const [asking, setAsking] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  const result = useMemo(() => (text.trim() ? parse(text, { day }) : null), [text, day])

  useEffect(() => { onPreview(result) }, [result, onPreview])

  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  async function submit() {
    if (!result || asking) return
    const unread = result.unparsed.map((u) => u.raw)
    const parsed = result.blocks.length > 0 || result.todos.length > 0
    if (!parsed && unread.length === 0) return

    if (parsed) onCommit(result.blocks, result.todos)
    setText('')
    setProblem(null)

    if (unread.length === 0) return

    // Nothing to ask with: hand the text back rather than dropping it.
    if (!ai) {
      setText(unread.join('\n'))
      setProblem('could not read that — turn on sync to have Claude try')
      return
    }

    setAsking(true)
    try {
      const extra = await interpret(ai.config, unread, { day, existing: ai.existing })
      onCommit(extra.blocks, extra.todos)
      if (extra.unreadable.length > 0) {
        setText(extra.unreadable.join('\n'))
        setProblem('Claude could not place that either')
      }
    } catch (error) {
      setText(unread.join('\n'))
      setProblem(error instanceof Error ? error.message : 'could not reach Claude')
    } finally {
      setAsking(false)
    }
  }

  const unread = result?.unparsed.length ?? 0
  const ready = (result?.blocks.length ?? 0) + (result?.todos.length ?? 0)

  return (
    <div className="prompt">
      <div className="prompt-row">
        <span className="chev">&rsaquo;</span>
        <textarea
          ref={area}
          value={text}
          rows={1}
          spellCheck
          autoCorrect="on"
          autoCapitalize="none"
          autoComplete="off"
          placeholder="Monday 8 bike ride 2h, intervals 5x10"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() }
            if (e.key === 'Escape') { setText(''); setProblem(null) }
          }}
        />
        {result && (
          <div className="readout">
            {result.segments.map((s, i) => (
              <div key={i}>
                {s.kind === 'block' && s.blocks[0] && (
                  <span className="res" style={{ color: INK[s.blocks[0].category] }}>
                    → {fmtClock(s.blocks[0].start)}–{fmtClock(s.blocks[0].end)}&nbsp;&nbsp;{s.blocks[0].title}
                    {s.blocks.length > 1 && ` · ${s.blocks.length} days`}
                  </span>
                )}
                {s.kind === 'day' && (
                  <span className="res" style={{ color: 'var(--fainter)' }}>
                    {s.days.length > 1 ? `${s.days.length} days set` : 'day set'}
                  </span>
                )}
                {s.kind === 'todo' && <span className="res" style={{ color: INK.admin }}>→ todo</span>}
                {s.kind === 'unparsed' && (
                  <span className="res" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Spark /> {ai ? 'Claude will place this' : s.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hints">
        {problem ? (
          <span className="problem">{problem}</span>
        ) : result && result.corrections.length > 0 ? (
          <span className="fixes">
            {result.corrections.slice(0, 3).map((c) => `${c.from} → ${c.to}`).join('   ')}
            {result.corrections.length > 3 && `   +${result.corrections.length - 3}`}
          </span>
        ) : (
          <span>RETURN TO ADD · SHIFT+RETURN FOR A NEW LINE · #TODO FOR A TASK</span>
        )}

        <span>
          {asking ? (
            <em className="asking"><Spark /> ASKING CLAUDE</em>
          ) : (
            <>
              {ready > 0 && `${ready} READY`}
              {ready > 0 && unread > 0 && ' · '}
              {unread > 0 && (
                <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>
                  {unread} FOR CLAUDE
                </em>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
