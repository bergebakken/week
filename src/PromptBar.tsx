import { useEffect, useMemo, useRef, useState } from 'react'
import { parse, type ParseResult } from './parse'
import { fmtClock, type Category, type Day } from './model'
import { Spark } from './Icons'

const INK: Record<Category, string> = {
  movement: '#9cb292', study: '#93a7c0', food: '#c8ac7c',
  rest: '#c79c9c', admin: '#ac9bb8', other: '#a39c90',
}

interface Props {
  day: Day
  onPreview: (result: ParseResult | null) => void
  onCommit: (result: ParseResult) => void
}

export function PromptBar({ day, onPreview, onCommit }: Props) {
  const [text, setText] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)

  const result = useMemo(() => (text.trim() ? parse(text, { day }) : null), [text, day])

  useEffect(() => { onPreview(result) }, [result, onPreview])

  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  function submit() {
    if (!result || (!result.blocks.length && !result.todos.length)) return
    onCommit(result)
    setText('')
  }

  const unread = result?.unparsed.length ?? 0
  const added = (result?.blocks.length ?? 0) + (result?.todos.length ?? 0)

  return (
    <div className="prompt">
      <div className="prompt-row">
        <span className="chev">&rsaquo;</span>
        <textarea
          ref={area}
          value={text}
          rows={1}
          spellCheck
          placeholder="Monday 8 bike ride 2h, intervals 5x10"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            if (e.key === 'Escape') setText('')
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
                    <Spark /> {s.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hints">
        <span>RETURN TO ADD · SHIFT+RETURN FOR A NEW LINE · #TODO FOR A TASK</span>
        <span>
          {added > 0 && `${added} READY`}
          {added > 0 && unread > 0 && ' · '}
          {unread > 0 && <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>{unread} NOT UNDERSTOOD</em>}
        </span>
      </div>
    </div>
  )
}
