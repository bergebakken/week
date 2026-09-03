import { describe, expect, it } from 'vitest'
import { committedMinutes, fmtClock, fmtDuration, isoWeek } from './model'
import type { Block, Plan } from './model'

describe('ISO week numbers', () => {
  const week = (iso: string) => isoWeek(new Date(`${iso}T12:00:00`))

  it('matches the standard boundary cases', () => {
    expect(week('2005-01-01')).toBe(53)  // Saturday, still 2004's last week
    expect(week('2005-01-03')).toBe(1)   // the Monday that opens week 1
    expect(week('2007-01-01')).toBe(1)   // a year that starts on a Monday
    expect(week('2008-12-29')).toBe(1)   // already 2009's week 1
    expect(week('2010-01-03')).toBe(53)  // Sunday, still 2009
  })

  it('holds across a week', () => {
    expect(week('2026-08-31')).toBe(week('2026-09-06'))       // Monday and Sunday
    expect(week('2026-09-07')).toBe(week('2026-08-31') + 1)   // the next Monday
  })
})

describe('formatting', () => {
  it('writes clock times with a leading zero', () => {
    expect(fmtClock(0)).toBe('00:00')
    expect(fmtClock(8 * 60)).toBe('08:00')
    expect(fmtClock(23 * 60 + 5)).toBe('23:05')
  })

  it('writes durations the short way', () => {
    expect(fmtDuration(15)).toBe('15m')
    expect(fmtDuration(60)).toBe('1h')
    expect(fmtDuration(90)).toBe('1h 30m')
  })
})

describe('committed time', () => {
  it('adds up only the day asked for', () => {
    const block = (day: 0 | 1, start: number, end: number): Block =>
      ({ id: `${day}-${start}`, day, start, end, title: 't', category: 'other' })
    const plan: Plan = {
      version: 1,
      blocks: [block(0, 480, 600), block(0, 660, 690), block(1, 540, 600)],
      todos: [],
    }
    expect(committedMinutes(plan, 0)).toBe(150)
    expect(committedMinutes(plan, 1)).toBe(60)
    expect(committedMinutes(plan, 2)).toBe(0)
  })
})
