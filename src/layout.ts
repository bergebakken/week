import type { Block } from './model'

/** Pixels per minute. Sub-linear enough that a 4h block does not dwarf the day. */
export const PX_PER_MIN = 0.75
/** A block never gets shorter than this, so a 15-minute shower stays readable. */
export const MIN_BLOCK_HEIGHT = 32
/** Free stretches shorter than this are absorbed rather than shown as a gap. */
export const GAP_THRESHOLD = 30

export type Row =
  | { kind: 'block'; block: Block; height: number; overlapsPrevious: boolean }
  | { kind: 'gap'; from: number; to: number }

export function blockHeight(block: Block): number {
  return Math.max(MIN_BLOCK_HEIGHT, Math.round((block.end - block.start) * PX_PER_MIN))
}

/**
 * Turns a day's blocks into the rows the column renders: blocks sized by
 * duration, with everything empty between them collapsed to one gap marker.
 */
export function layoutDay(blocks: Block[]): Row[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end)
  const rows: Row[] = []
  let previousEnd: number | null = null

  for (const block of sorted) {
    const overlapsPrevious = previousEnd !== null && block.start < previousEnd
    if (previousEnd !== null && block.start - previousEnd >= GAP_THRESHOLD) {
      rows.push({ kind: 'gap', from: previousEnd, to: block.start })
    }
    rows.push({ kind: 'block', block, height: blockHeight(block), overlapsPrevious })
    previousEnd = previousEnd === null ? block.end : Math.max(previousEnd, block.end)
  }

  return rows
}
