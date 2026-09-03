import { useEffect, useState } from 'react'
import { isoWeek } from './model'

const RADIUS = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Live clock, date and ISO week. The ring fills as the day goes by, so the
 * header carries a quiet sense of how much of today is already gone.
 */
export function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const throughDay = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86_400
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    .format(now)
    .toUpperCase()

  return (
    <div className="clock">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="1.5" />
        <circle
          cx="10" cy="10" r={RADIUS} fill="none"
          stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - throughDay)}
          transform="rotate(-90 10 10)"
        />
      </svg>

      <time className="clock-time" dateTime={now.toISOString()}>
        {String(now.getHours()).padStart(2, '0')}
        <span className="tick">:</span>
        {String(now.getMinutes()).padStart(2, '0')}
      </time>

      <span className="clock-sep" />
      <span className="clock-date">{date}</span>
      <span className="clock-sep" />
      <span className="clock-week">Week {isoWeek(now)}</span>
    </div>
  )
}
