import { describe, expect, it } from 'vitest'
import { withoutEcho } from '../worker/interpret'

const block = (day: number, start: string, end: string, title: string) =>
  ({ day, start, end, title, note: '', category: 'other' as const, isTodo: false })

const context = {
  day: 0,
  existing: [
    { day: 0, start: '08:00', end: '11:00', title: 'school' },
    { day: 0, start: '12:00', end: '12:30', title: 'lunch' },
  ],
}

describe('refusing an echoed plan', () => {
  it('drops blocks that are already in the week', () => {
    const result = withoutEcho({
      blocks: [
        block(0, '08:00', '11:00', 'school'),
        block(0, '12:00', '12:30', 'lunch'),
        block(0, '13:00', '14:00', 'gym'),
      ],
      todos: [], unreadable: [],
    }, context)

    expect(result.blocks.map((b) => b.title)).toEqual(['gym'])
  })

  it('ignores capitalisation and stray spacing when comparing', () => {
    const result = withoutEcho({ blocks: [block(0, '08:00', '11:00', '  School ')], todos: [], unreadable: [] }, context)
    expect(result.blocks).toEqual([])
  })

  it('keeps a block that only looks similar', () => {
    const result = withoutEcho({
      blocks: [
        block(1, '08:00', '11:00', 'school'),      // different day
        block(0, '09:00', '11:00', 'school'),      // different time
        block(0, '08:00', '11:00', 'school run'),  // different thing
      ],
      todos: [], unreadable: [],
    }, context)
    expect(result.blocks).toHaveLength(3)
  })

  it('leaves todos and unreadable lines untouched', () => {
    const result = withoutEcho(
      { blocks: [], todos: [{ text: 'call mum', note: '' }], unreadable: ['?'] },
      context,
    )
    expect(result.todos).toHaveLength(1)
    expect(result.unreadable).toEqual(['?'])
  })
})
