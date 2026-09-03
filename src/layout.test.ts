import { describe, expect, it } from 'vitest'
import { GAP_THRESHOLD, MIN_BLOCK_HEIGHT, blockHeight, fitBlock, layoutDay } from './layout'
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

describe('fitting text to a block', () => {
  it('goes compact when a stacked title would be cut off', () => {
    expect(fitBlock(blockHeight(block(600, 615)))).toMatchObject({ compact: true })  // 15m
    expect(fitBlock(blockHeight(block(660, 690)))).toMatchObject({ compact: true })  // 30m
    expect(fitBlock(blockHeight(block(660, 705)))).toMatchObject({ compact: true })  // 45m
  })

  it('stacks from an hour up', () => {
    expect(fitBlock(blockHeight(block(540, 600)))).toMatchObject({ compact: false, titleLines: 1 })
  })

  it('never lets a title run past two lines', () => {
    expect(fitBlock(blockHeight(block(480, 720))).titleLines).toBe(2)   // 4h
    expect(fitBlock(1000).titleLines).toBe(2)
  })

  it('only shows a note when there is room left after the title', () => {
    expect(fitBlock(blockHeight(block(540, 600))).showNote).toBe(false) // 1h
    expect(fitBlock(blockHeight(block(480, 600))).showNote).toBe(true)  // 2h
  })

  it('leaves every part inside the box it was given', () => {
    for (let minutes = 5; minutes <= 300; minutes += 5) {
      const height = blockHeight(block(0, minutes))
      const fit = fitBlock(height)
      const used = fit.compact
        ? 13 + 16
        : 13 + 13 + 2 + fit.titleLines * 16 + (fit.showNote ? 2 + 15 : 0)
      expect(used, `${minutes}m in ${height}px`).toBeLessThanOrEqual(height)
    }
  })
})
