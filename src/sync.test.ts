import { describe, expect, it } from 'vitest'
import { PLAN_VERSION, type Block, type Plan, type Todo } from './model'
import { mergePlans, migratePlan, newSyncCode, pruneTombstones } from './sync'

const block = (id: string, updatedAt: number, title = id): Block =>
  ({ id, day: 0, start: 480, end: 540, title, category: 'other', updatedAt })
const todo = (id: string, updatedAt: number, done = false): Todo =>
  ({ id, text: id, done, updatedAt })
const plan = (parts: Partial<Plan> = {}): Plan =>
  ({ version: PLAN_VERSION, blocks: [], todos: [], tombstones: {}, ...parts })

describe('merging two devices', () => {
  it('keeps what only one side has', () => {
    const merged = mergePlans(plan({ blocks: [block('a', 1)] }), plan({ blocks: [block('b', 1)] }))
    expect(merged.blocks.map((b) => b.id).sort()).toEqual(['a', 'b'])
  })

  it('takes the newer edit of the same item', () => {
    const merged = mergePlans(
      plan({ blocks: [block('a', 100, 'old title')] }),
      plan({ blocks: [block('a', 200, 'new title')] }),
    )
    expect(merged.blocks).toHaveLength(1)
    expect(merged.blocks[0]?.title).toBe('new title')
  })

  it('does not resurrect something deleted on the other device', () => {
    const merged = mergePlans(
      plan({ blocks: [block('a', 100)] }),
      plan({ tombstones: { a: 200 } }),
    )
    expect(merged.blocks).toEqual([])
    expect(merged.tombstones['a']).toBe(200)
  })

  it('keeps an edit made after the delete', () => {
    const merged = mergePlans(
      plan({ blocks: [block('a', 300, 'edited later')] }),
      plan({ tombstones: { a: 200 } }),
    )
    expect(merged.blocks[0]?.title).toBe('edited later')
  })

  it('merges a ticked todo without losing the other side', () => {
    const merged = mergePlans(
      plan({ todos: [todo('t1', 100, false), todo('t2', 100)] }),
      plan({ todos: [todo('t1', 500, true)] }),
    )
    expect(merged.todos.find((t) => t.id === 't1')?.done).toBe(true)
    expect(merged.todos.find((t) => t.id === 't2')).toBeTruthy()
  })

  it('is order-independent and settles after one round', () => {
    const a = plan({ blocks: [block('a', 100)], todos: [todo('t', 300)], tombstones: { z: 50 } })
    const b = plan({ blocks: [block('a', 200)], tombstones: { z: 90 } })
    const ab = mergePlans(a, b)
    const ba = mergePlans(b, a)
    expect(JSON.stringify(ab)).toBe(JSON.stringify(ba))
    expect(JSON.stringify(mergePlans(ab, b))).toBe(JSON.stringify(ab))
  })

  it('takes the later of two tombstones', () => {
    expect(mergePlans(plan({ tombstones: { a: 10 } }), plan({ tombstones: { a: 40 } })).tombstones['a']).toBe(40)
  })
})

describe('reading older stored plans', () => {
  it('stamps a v1 plan so nothing looks ancient', () => {
    const before = Date.now()
    const migrated = migratePlan({
      version: 1,
      blocks: [{ id: 'a', day: 0, start: 480, end: 540, title: 'bike', category: 'movement' }],
      todos: [{ id: 't', text: 'call', done: false }],
    })
    expect(migrated.version).toBe(PLAN_VERSION)
    expect(migrated.tombstones).toEqual({})
    expect(migrated.blocks[0]?.updatedAt).toBeGreaterThanOrEqual(before)
    expect(migrated.todos[0]?.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('keeps timestamps that are already there', () => {
    expect(migratePlan(plan({ blocks: [block('a', 42)] })).blocks[0]?.updatedAt).toBe(42)
  })

  it('falls back to an empty plan on anything unreadable', () => {
    for (const junk of [null, undefined, 5, 'nope', {}, { blocks: 'no' }]) {
      expect(migratePlan(junk).blocks).toEqual([])
    }
  })
})

describe('housekeeping', () => {
  it('drops tombstones old enough that nothing can still be carrying the item', () => {
    const now = 1_000_000_000
    const pruned = pruneTombstones(
      plan({ tombstones: { recent: now - 1000, ancient: now - 60 * 86_400_000 } }),
      30 * 86_400_000,
      now,
    )
    expect(Object.keys(pruned.tombstones)).toEqual(['recent'])
  })

  it('makes codes long enough not to be guessed, and different every time', () => {
    const codes = new Set(Array.from({ length: 50 }, newSyncCode))
    expect(codes.size).toBe(50)
    for (const code of codes) expect(code).toMatch(/^[a-f0-9]{32}$/)
  })
})
