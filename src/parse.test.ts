import { describe, expect, it } from 'vitest'
import { parse } from './parse'
import { fmtClock, type Day } from './model'

const at = (input: string, day: Day = 0) =>
  parse(input, { day }).blocks.map((b) => ({
    day: b.day,
    time: `${fmtClock(b.start)}-${fmtClock(b.end)}`,
    title: b.title,
    ...(b.note === undefined ? {} : { note: b.note }),
    category: b.category,
    ...(b.isTodo ? { isTodo: true } : {}),
  }))

describe('the shapes Berge actually types', () => {
  it('parses a whole Monday the way he writes it in Excel', () => {
    expect(
      at(`Monday
biking for 2h from 8
shower afterwards 15 min
then eat
lunch 30 min at 11
math until 17
then gym
then movie night`),
    ).toEqual([
      { day: 0, time: '08:00-10:00', title: 'biking', category: 'movement' },
      { day: 0, time: '10:00-10:15', title: 'shower', category: 'rest' },
      { day: 0, time: '10:15-10:45', title: 'eat', category: 'food' },
      { day: 0, time: '11:00-11:30', title: 'lunch', category: 'food' },
      { day: 0, time: '11:30-17:00', title: 'math', category: 'study' },
      { day: 0, time: '17:00-17:30', title: 'gym', category: 'movement' },
      { day: 0, time: '17:30-18:00', title: 'movie night', category: 'rest' },
    ])
  })

  it('handles his run-on prose, splitting on "then"', () => {
    expect(at('Monday, wake up 8 reading and breakfast from 8 to 9, then bike ride 2h intervals 5x10'))
      .toEqual([
        { day: 0, time: '08:00-09:00', title: 'wake up 8 reading and breakfast', category: 'food' },
        { day: 0, time: '09:00-11:00', title: 'bike ride intervals 5x10', category: 'movement' },
      ])
  })

  it('turns #todo with a time into a block that is also a task', () => {
    expect(at('#todo send application 1h from 10')).toEqual([
      { day: 0, time: '10:00-11:00', title: 'send application', category: 'admin', isTodo: true },
    ])
  })

  it('keeps a #todo with no time out of the grid', () => {
    const r = parse('#todo book dentist')
    expect(r.blocks).toEqual([])
    expect(r.todos).toEqual([{ text: 'book dentist', note: undefined }])
  })
})

describe('times', () => {
  it('reads ranges', () => {
    expect(at('8-9 school')[0]?.time).toBe('08:00-09:00')
    expect(at('school 08:00-09:00')[0]?.time).toBe('08:00-09:00')
    expect(at('meeting from 14:30 to 15:15')[0]?.time).toBe('14:30-15:15')
  })

  it('reads durations', () => {
    expect(at('gym 1h30 at 17')[0]?.time).toBe('17:00-18:30')
    expect(at('gym 1.5h at 17')[0]?.time).toBe('17:00-18:30')
    expect(at('nap 45 minutes at 14')[0]?.time).toBe('14:00-14:45')
    expect(at('lunch 30 min at 11')[0]?.time).toBe('11:00-11:30')
  })

  it('treats a bare number as a 24-hour clock, never am/pm', () => {
    expect(at('wake up at 8')[0]?.time).toBe('08:00-08:30')
    expect(at('gym at 17')[0]?.time).toBe('17:00-17:30')
    expect(at('dinner at 20')[0]?.time).toBe('20:00-20:30')
  })

  it('gives a start time with no length the default duration', () => {
    expect(at('standup at 9')[0]?.time).toBe('09:00-09:30')
  })

  it('chains "until" to wherever the last block ended', () => {
    expect(at('school 8-11\nmath until 17')).toEqual([
      { day: 0, time: '08:00-11:00', title: 'school', category: 'study' },
      { day: 0, time: '11:00-17:00', title: 'math', category: 'study' },
    ])
  })
})

describe('days', () => {
  it('retargets on a bare day name and on an inline one', () => {
    expect(at('Wednesday\nswim 1h at 9')[0]).toMatchObject({ day: 2, time: '09:00-10:00' })
    expect(at('friday gym 1h at 18')[0]).toMatchObject({ day: 4, time: '18:00-19:00' })
  })

  it('resets chaining when the day changes', () => {
    const r = parse('monday school 8-11\ntuesday swim 1h at 9')
    expect(r.blocks.map((b) => [b.day, fmtClock(b.start)])).toEqual([[0, '08:00'], [1, '09:00']])
  })

  it('understands Norwegian', () => {
    expect(at('tirsdag\nsykkeltur 2 timer fra 9')[0])
      .toMatchObject({ day: 1, time: '09:00-11:00', category: 'movement' })
  })
})

describe('notes', () => {
  it('takes detail after a comma, a dash, or in parentheses', () => {
    expect(at('bike ride 2h from 8, intervals 5x10')[0])
      .toMatchObject({ title: 'bike ride', note: 'intervals 5x10' })
    expect(at('math 2h from 13 — chapter 7')[0])
      .toMatchObject({ title: 'math', note: 'chapter 7' })
    expect(at('gym 1h at 17 (leg day)')[0])
      .toMatchObject({ title: 'gym', note: 'leg day' })
  })
})

describe('sentences rather than shorthand', () => {
  it('reads "before" as an end time', () => {
    expect(at('read 30 min before bed at 23:00')[0])
      .toMatchObject({ time: '22:30-23:00', category: 'rest' })
    expect(at('shower 15 min before 8')[0]?.time).toBe('07:45-08:00')
  })

  it('does not mistake a sentence comma for a note', () => {
    const line = at('Its late, so read 30 min before bed at 23:00')[0]
    expect(line).toMatchObject({ time: '22:30-23:00', title: 'Its late, so read' })
    expect(line?.note).toBeUndefined()
    expect(at('meeting with Kari, 2h from 10')[0])
      .toMatchObject({ time: '10:00-12:00', title: 'meeting with Kari' })
  })

  it('still takes a note when the part before the comma is a real item', () => {
    expect(at('bike ride 2h from 8, intervals 5x10')[0])
      .toMatchObject({ title: 'bike ride', note: 'intervals 5x10' })
  })
})

describe('#todo splits the line', () => {
  it('keeps whatever came before the tag out of the task', () => {
    const r = parse('bike ride 2h from 8 #todo call bank')
    expect(r.blocks).toHaveLength(1)
    expect(r.blocks[0]).toMatchObject({ title: 'bike ride', isTodo: false })
    expect(r.todos).toEqual([{ text: 'call bank', note: undefined }])
  })

  it('still schedules a tagged task that carries a time', () => {
    expect(at('#todo send application 1h from 10')[0])
      .toMatchObject({ title: 'send application', isTodo: true, time: '10:00-11:00' })
  })

  it('takes more than one task from a line', () => {
    expect(parse('#todo book dentist #todo reply to Kari').todos.map((t) => t.text))
      .toEqual(['book dentist', 'reply to Kari'])
  })
})

describe('a day named later in the line', () => {
  it('honours "on friday" rather than dropping it on today', () => {
    expect(at('eat dinner 18 on friday', 3)[0]).toMatchObject({ day: 4, time: '18:00-18:30' })
  })

  it('honours a day name at the end', () => {
    expect(at('movie night 20 saturday', 3)[0]).toMatchObject({ day: 5, time: '20:00-20:30' })
  })

  it('still falls back to today when no day is named', () => {
    expect(at('gym 1h at 17', 3)[0]).toMatchObject({ day: 3 })
  })

  it('does not mistake an ordinary word for a day', () => {
    expect(at('1h at 17 call my son', 3)[0]).toMatchObject({ day: 3, title: 'call my son' })
  })
})

describe('what it refuses, so Claude gets asked instead', () => {
  it('gives up on vague input rather than guessing', () => {
    const r = parse('gym sometime after lunch')
    expect(r.blocks).toEqual([])
    expect(r.unparsed).toEqual([{ raw: 'gym sometime after lunch', reason: 'no time found' }])
  })

  it('gives up on a line with no time and nothing to chain from', () => {
    expect(parse('busy morning').unparsed).toHaveLength(1)
  })

  it('does not mistake a title number for a clock', () => {
    expect(at('run 5 km at 18')[0]).toMatchObject({ time: '18:00-18:30', title: 'run 5 km' })
  })
})
