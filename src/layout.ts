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

export interface Scale {
  pxPerMin: number
  minHeight: number
}

export const DESKTOP_SCALE: Scale = { pxPerMin: PX_PER_MIN, minHeight: MIN_BLOCK_HEIGHT }
/** Roomier, and never below the 44px a thumb needs. */
export const PHONE_SCALE: Scale = { pxPerMin: 0.9, minHeight: 48 }

export function blockHeight(block: Block, scale: Scale = DESKTOP_SCALE): number {
  return Math.max(scale.minHeight, Math.round((block.end - block.start) * scale.pxPerMin))
}

/**
 * Turns a day's blocks into the rows the column renders: blocks sized by
 * duration, with everything empty between them collapsed to one gap marker.
 */
export function layoutDay(blocks: Block[], scale: Scale = DESKTOP_SCALE): Row[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end)
  const rows: Row[] = []
  let previousEnd: number | null = null

  for (const block of sorted) {
    const overlapsPrevious = previousEnd !== null && block.start < previousEnd
    if (previousEnd !== null && block.start - previousEnd >= GAP_THRESHOLD) {
      rows.push({ kind: 'gap', from: previousEnd, to: block.start })
    }
    rows.push({ kind: 'block', block, height: blockHeight(block, scale), overlapsPrevious })
    previousEnd = previousEnd === null ? block.end : Math.max(previousEnd, block.end)
  }

  return rows
}

/* --- fitting text into a block whose height is fixed by its duration --- */

/** Measured against the stylesheet: padding, and the line box of each part. */
export interface Metrics {
  padY: number
  timeLine: number
  titleLine: number
  noteLine: number
  gap: number
}

export const DESKTOP_METRICS: Metrics = { padY: 13, timeLine: 13, titleLine: 16, noteLine: 15, gap: 2 }
export const PHONE_METRICS: Metrics = { padY: 20, timeLine: 14, titleLine: 19, noteLine: 16, gap: 3 }
/** A title is never allowed to run longer than this; it is clamped instead. */
const MAX_TITLE_LINES = 2

export interface BlockFit {
  /** Too short to stack: the time and title share one row. */
  compact: boolean
  titleLines: number
  showNote: boolean
}

/**
 * Works out what actually fits in a block of this height, so nothing is ever
 * silently clipped. Priority is time, then title, then note.
 */
export function fitBlock(height: number, m: Metrics = DESKTOP_METRICS): BlockFit {
  const inner = height - m.padY
  const stacked = m.timeLine + m.gap + m.titleLine

  if (inner < stacked) return { compact: true, titleLines: 1, showNote: false }

  const titleLines = Math.max(1, Math.min(MAX_TITLE_LINES, Math.floor((inner - m.timeLine - m.gap) / m.titleLine)))
  // Budget for the title at its full allowance, so a wrapped title cannot push
  // the note out of the box.
  const used = m.timeLine + m.gap + titleLines * m.titleLine
  const showNote = inner - used >= m.gap + m.noteLine
  return { compact: false, titleLines, showNote }
}
