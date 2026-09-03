import { describe, expect, it } from 'vitest'
import { FACTS, QUOTES, dayOfYear, factOfDay, numberOfDay, quoteOfDay, randomFact } from './almanac'

describe('day of year', () => {
  it('counts from 1 on New Year to the last day', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1)
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365)
    expect(dayOfYear(new Date(2024, 11, 31))).toBe(366)   // leap year
    expect(dayOfYear(new Date(2024, 1, 29))).toBe(60)
  })

  it('is unaffected by the time of day', () => {
    expect(dayOfYear(new Date(2026, 8, 3, 0, 30))).toBe(dayOfYear(new Date(2026, 8, 3, 23, 30)))
  })
})

describe('quote of the day', () => {
  it('holds all day and changes overnight', () => {
    const morning = quoteOfDay(new Date(2026, 8, 3, 7))
    const night = quoteOfDay(new Date(2026, 8, 3, 23))
    expect(morning).toEqual(night)
    expect(quoteOfDay(new Date(2026, 8, 4))).not.toEqual(morning)
  })

  it('works its way through the whole list before repeating', () => {
    const seen = new Set<string>()
    for (let i = 0; i < QUOTES.length; i++) {
      seen.add(quoteOfDay(new Date(2026, 0, 1 + i)).text)
    }
    expect(seen.size).toBe(QUOTES.length)
  })

  it('has a text and an author for every entry, with none repeated', () => {
    for (const quote of QUOTES) {
      expect(quote.text.length).toBeGreaterThan(10)
      expect(quote.author.length).toBeGreaterThan(2)
    }
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length)
  })
})

describe('facts', () => {
  it('picks the same one all day', () => {
    expect(factOfDay(new Date(2026, 8, 3, 6))).toBe(factOfDay(new Date(2026, 8, 3, 22)))
  })

  it('never hands back the one already showing', () => {
    for (const fact of FACTS.slice(0, 8)) {
      for (let i = 0; i < 30; i++) expect(randomFact(fact)).not.toBe(fact)
    }
  })

  it('has no duplicates or stubs', () => {
    expect(new Set(FACTS).size).toBe(FACTS.length)
    for (const fact of FACTS) expect(fact.length).toBeGreaterThan(20)
  })
})

describe('number of the day', () => {
  it('reports the day, the week and what is left of the year', () => {
    const { number, note } = numberOfDay(new Date(2026, 8, 3))
    expect(number).toBe(246)
    expect(note).toContain('Day 246 of 2026')
    expect(note).toContain('119 days left')
    expect(note).not.toContain('prime')
  })

  it('mentions a prime day number', () => {
    expect(numberOfDay(new Date(2026, 7, 29)).note).toContain('It is a prime number.')
  })

  it('handles the last day of the year', () => {
    const { number, note } = numberOfDay(new Date(2026, 11, 31))
    expect(number).toBe(365)
    expect(note).toContain('0 days left')
  })
})
