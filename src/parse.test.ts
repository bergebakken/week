import { describe, expect, it } from 'vitest'
import { correctTypos, parse } from './parse'
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

describe('one line, many days', () => {
  const daysOf = (input: string, day: Day = 0) => parse(input, { day }).blocks.map((b) => b.day)

  it('spreads "everyday except sunday" across the other six', () => {
    const r = parse('wake up everyday except sunday at 8')
    expect(r.blocks.map((b) => b.day)).toEqual([0, 1, 2, 3, 4, 5])
    expect(r.blocks[0]).toMatchObject({ title: 'wake up', start: 8 * 60, end: 8 * 60 + 30 })
    expect(new Set(r.blocks.map((b) => `${b.start}-${b.end}-${b.title}`)).size).toBe(1)
  })

  it('reads a list', () => {
    expect(daysOf('school 8-11 on mon, wed and fri')).toEqual([0, 2, 4])
  })

  it('reads a range', () => {
    expect(daysOf('swim 1h at 9 mon-fri')).toEqual([0, 1, 2, 3, 4])
  })

  it('reads weekdays and weekends', () => {
    expect(daysOf('gym 1h at 17 on weekdays')).toEqual([0, 1, 2, 3, 4])
    expect(daysOf('long ride 4h from 9 on weekends')).toEqual([5, 6])
  })

  it('subtracts a group, not just a single day', () => {
    expect(daysOf('breakfast 30 min at 8 every day except weekends')).toEqual([0, 1, 2, 3, 4])
  })

  it('carries the set through a chained "then"', () => {
    const r = parse('every day wake up at 7 then breakfast 30 min')
    expect(r.blocks.filter((b) => b.title === 'breakfast')).toHaveLength(7)
  })

  it('leaves a single-day line alone', () => {
    expect(daysOf('gym 1h at 17', 3)).toEqual([3])
  })
})

describe('one line, several things', () => {
  it('splits on "thereafter"', () => {
    expect(at('20 theater thereafter the birthday party at 22:00')).toEqual([
      { day: 0, time: '20:00-20:30', title: 'theater', category: 'other' },
      { day: 0, time: '22:00-22:30', title: 'the birthday party', category: 'rest' },
    ])
  })

  it('splits on a comma when both halves carry a time', () => {
    expect(at('tennis at 10:30, lunch at 12:00').map((b) => b.time))
      .toEqual(['10:30-11:00', '12:00-12:30'])
  })

  it('splits on a full stop the same way', () => {
    expect(at('gym 1h at 17. read from 20 to 21').map((b) => b.time))
      .toEqual(['17:00-18:00', '20:00-21:00'])
  })

  it('leaves a decimal alone', () => {
    expect(at('bike 1.5h from 8, hard')[0]).toMatchObject({ time: '08:00-09:30', note: 'hard' })
    expect(at('sykkel 1,5t fra 8')[0]?.time).toBe('08:00-09:30')
  })

  it('keeps "afterwards" as a modifier when nothing follows it but a length', () => {
    expect(at('bike 2h from 8\nshower afterwards 15 min').map((b) => b.time))
      .toEqual(['08:00-10:00', '10:00-10:15'])
  })

  it('treats "afterwards" as a separator when a whole item follows', () => {
    expect(at('theatre at 20 afterwards the party at 22').map((b) => b.title))
      .toEqual(['theatre', 'the party'])
  })

  it('handles the long run-on', () => {
    const times = at('tennis at 10:30, lunch at 12:00 and before that i am doing my rehabilitation exercises. After lunch read for an 1h from 13 to 14')
    expect(times.map((b) => b.time)).toEqual(['10:30-11:00', '12:00-12:30', '13:00-14:00'])
    expect(times[2]?.title).toBe('After lunch read')
  })
})

describe('the comma decides between a note and a new item', () => {
  it('is a note when nothing after it has a time', () => {
    expect(at('bike ride 2h from 8, intervals 5x10')[0])
      .toMatchObject({ title: 'bike ride', note: 'intervals 5x10' })
  })

  it('is a note even on a chained line with no time of its own', () => {
    const blocks = at('gym 1h at 17\nthen shower, quick one')
    expect(blocks[1]).toMatchObject({ title: 'shower', note: 'quick one', time: '18:00-18:30' })
  })

  it('is punctuation when only the second half has a time', () => {
    expect(at('Its late, so read 30 min before bed at 23:00')).toHaveLength(1)
    expect(at('meeting with Kari, 2h from 10')[0]).toMatchObject({ title: 'meeting with Kari' })
  })
})

describe('typos in the words the parser reacts to', () => {
  it('still separates two items when "thereafter" is misspelt', () => {
    expect(at('20 theater therater the birtday party at 22:00').map((b) => b.title))
      .toEqual(['theater', 'the birthday party'])
  })

  it('repairs day names and long keywords', () => {
    expect(correctTypos('mondya')).toBe('monday')
    expect(correctTypos('wendesday')).toBe('wednesday')
    expect(correctTypos('beofre')).toBe('before')
    expect(correctTypos('excpet')).toBe('except')
    expect(at('gym 1h at 17 on wendesday')[0]?.day).toBe(2)
  })

  it('repairs everyday misspellings, not just schedule words', () => {
    for (const [wrong, right] of [
      ['rgearidng', 'regarding'], ['freind', 'friend'], ['recieve', 'receive'],
      ['seperate', 'separate'], ['tommorow', 'tomorrow'], ['apointment', 'appointment'],
      ['grocries', 'groceries'], ['rehabilitaton', 'rehabilitation'],
    ]) {
      expect(correctTypos(wrong!), wrong).toBe(right)
    }
  })

  it('leaves Norwegian words where an English one is a single edit away', () => {
    // "reise" is one edit from "raise", "middag" one from "midday".
    for (const word of ['reise', 'middag', 'hytta', 'kaffe', 'trening', 'lunsj', 'fjord', 'frokost', 'venner']) {
      expect(correctTypos(word), word).toBe(word)
    }
  })

  it('never pulls a capitalised word towards an ordinary one', () => {
    for (const name of ['Jonas', 'Marta', 'Kari', 'Ingrid', 'Sondre']) {
      expect(correctTypos(name), name).toBe(name)
    }
    // ...but a misspelt keyword is still repaired, capital or not.
    expect(correctTypos('Mondya')).toBe('Monday')
  })

  it('says nothing rather than guessing between two equally close words', () => {
    // "exercies" is one edit from both "exercise" and "exercises".
    expect(correctTypos('exercies')).toBe('exercies')
  })

  it('leaves ordinary words alone', () => {
    for (const word of ['the', 'than', 'then', 'theater', 'theatre', 'money', 'expect', 'reading', 'before']) {
      expect(correctTypos(word), word).toBe(word)
    }
    expect(correctTypos('call my son about the party')).toBe('call my son about the party')
  })

  it('fixes an ordinary word in a title too', () => {
    expect(at('birtday party at 20')[0]?.title).toBe('birthday party')
    expect(at('rehabilitaton exercises at 9')[0]?.title).toBe('rehabilitation exercises')
  })

  it('reports what it changed', () => {
    expect(parse('birtday party at 20').corrections).toEqual([{ from: 'birtday', to: 'birthday' }])
    expect(parse('gym 1h at 17').corrections).toEqual([])
  })

  it('leaves a name alone even when it is close to a real word', () => {
    expect(at('dinner with Marta at 19')[0]?.title).toBe('dinner with Marta')
    expect(at('call Kari at 15')[0]?.title).toBe('call Kari')
  })
})

describe('what it refuses, so Claude gets asked instead', () => {
  it('gives up on vague input rather than guessing', () => {
    const r = parse('gym sometime after lunch')
    expect(r.blocks).toEqual([])
    expect(r.unparsed).toHaveLength(1)
    expect(r.unparsed[0]?.reason).toBe('no time found')
  })

  it('gives up on a line with no time and nothing to chain from', () => {
    expect(parse('busy morning').unparsed).toHaveLength(1)
  })

  it('does not mistake a title number for a clock', () => {
    expect(at('run 5 km at 18')[0]).toMatchObject({ time: '18:00-18:30', title: 'run 5 km' })
  })
})
