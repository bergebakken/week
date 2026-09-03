import { describe, expect, it } from 'vitest'
import { GAP_THRESHOLD, MIN_BLOCK_HEIGHT, blockHeight, layoutDay } from './layout'
import type { Block, Category } from './model'

let n = 0
const block = (start: number, end: number, title = `b${n++}`, category: Category = 'other'): Block =>
  ({ id: String(n), day: 0, start, end, title, category })

const shape = (rows: ReturnType<typeof layoutDay>) =>
  rows.map((r) => (r.kind === 'gap' ? `gap ${r.to - r.from}m` : r.block.title))

describe('gap-collapsed layout', () => {
  it('puts a gap marker between blocks with free time between them', () => {
    expect(shape(layoutDay([block(480, 600, 'bike'), block(780, 1020, 'math')])))
      .toEqual(['bike', 'gap 180m', 'math'])
  })

  it('absorbs gaps too short to be worth showing', () => {
    expect(shape(layoutDay([block(480, 600, 'bike'), block(615, 660, 'shower')])))
      .toEqual(['bike', 'shower'])
    expect(GAP_THRESHOLD).toBe(30)
  })

  it('never opens with a gap, however late the day starts', () => {
    expect(shape(layoutDay([block(1200, 1260, 'movie')]))).toEqual(['movie'])
  })

  it('scales height with duration but keeps short blocks readable', () => {
    expect(blockHeight(block(480, 600))).toBe(90)
    expect(blockHeight(block(780, 1020))).toBe(180)
    expect(blockHeight(block(600, 615))).toBe(MIN_BLOCK_HEIGHT)
    expect(blockHeight(block(660, 690))).toBe(MIN_BLOCK_HEIGHT)
  })

  it('sorts by start time whatever order they arrived in', () => {
    expect(shape(layoutDay([block(1020, 1080, 'gym'), block(480, 540, 'swim')])))
      .toEqual(['swim', 'gap 480m', 'gym'])
  })

  it('flags a double booking instead of hiding it', () => {
    const rows = layoutDay([block(480, 600, 'bike'), block(540, 660, 'call')])
    expect(shape(rows)).toEqual(['bike', 'call'])
    expect(rows[1]).toMatchObject({ kind: 'block', overlapsPrevious: true })
  })

  it('measures the gap from the latest end, not the last block', () => {
    // A long block swallowing a short one must not produce a phantom gap.
    const rows = layoutDay([block(480, 720, 'school'), block(540, 570, 'call'), block(780, 840, 'lunch')])
    expect(shape(rows)).toEqual(['school', 'call', 'gap 60m', 'lunch'])
  })
})
