import { useEffect, useMemo, useRef, useState } from 'react'
import { factOfDay, numberOfDay, quoteOfDay, randomFact } from './almanac'

/** One quote, the same all day, a different one tomorrow. */
export function DailyQuote() {
  const quote = useMemo(() => quoteOfDay(new Date()), [])
  return (
    <div className="quote" title={`${quote.text} — ${quote.author}`}>
      <span className="quote-text">“{quote.text}”</span>
      <span className="quote-author">{quote.author}</span>
    </div>
  )
}

export function FactButton() {
  const [open, setOpen] = useState(false)
  const [fact, setFact] = useState(() => factOfDay(new Date()))
  const number = useMemo(() => numberOfDay(new Date()), [])
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="fact" ref={box}>
      <button
        className="fact-btn"
        aria-expanded={open}
        aria-label="Fact of the day"
        onClick={() => setOpen((was) => !was)}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2.4a5.1 5.1 0 0 0-3.1 9.1c.5.4.8 1 .8 1.6v.4h4.6v-.4c0-.6.3-1.2.8-1.6A5.1 5.1 0 0 0 10 2.4Z" />
          <path d="M8.2 16.1h3.6M8.9 17.9h2.2" />
        </svg>
      </button>

      {open && (
        <div className="fact-card" role="dialog" aria-label="Fact of the day">
          <div className="fact-number">
            <span className="fact-n">{number.number}</span>
            <span className="fact-note">{number.note}</span>
          </div>
          <p className="fact-text">{fact}</p>
          <button className="ghost-btn" onClick={() => setFact((current) => randomFact(current))}>
            Another
          </button>
        </div>
      )}
    </div>
  )
}
