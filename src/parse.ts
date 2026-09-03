import { clockToMinutes, type Category, type Day } from './model'

/** A block the parser produced but that has not been given an id or committed yet. */
export interface DraftBlock {
  day: Day
  start: number
  end: number
  title: string
  note?: string
  category: Category
  /** Line carried a #todo tag, so it becomes a todo as well as a block. */
  isTodo: boolean
}

export type ParsedSegment =
  | { kind: 'day'; raw: string; day: Day }
  | { kind: 'block'; raw: string; block: DraftBlock }
  | { kind: 'todo'; raw: string; text: string; note?: string }
  | { kind: 'unparsed'; raw: string; reason: string }

export interface ParseResult {
  segments: ParsedSegment[]
  blocks: DraftBlock[]
  /** Todos with no time attached; they live in the rail until scheduled. */
  todos: { text: string; note?: string }[]
  unparsed: { raw: string; reason: string }[]
  /** Day the next line would land on, so the caller can show it. */
  day: Day
}

/** A start time with no stated length gets this many minutes. */
export const DEFAULT_DURATION = 30

const DAY_WORDS: Record<string, Day> = {
  monday: 0, mon: 0, mandag: 0, man: 0,
  tuesday: 1, tue: 1, tues: 1, tirsdag: 1, tir: 1,
  wednesday: 2, wed: 2, onsdag: 2, ons: 2,
  thursday: 3, thu: 3, thur: 3, thurs: 3, torsdag: 3, tor: 3,
  friday: 4, fri: 4, fredag: 4, fre: 4,
  saturday: 5, sat: 5, lordag: 5, 'lørdag': 5, lor: 5,
  sunday: 6, sun: 6, sondag: 6, 'søndag': 6, son: 6,
}

const CATEGORIES: [Category, RegExp][] = [
  ['movement', /\b(bike|biking|bicycle|cycl\w*|sykkel\w*|sykl\w*|ride|run|running|jog\w*|løp\w*|gym|train\w*|trening|workout|swim|svømm\w*|yoga|walk|hike|tur|stretch|interval\w*|climb\w*|ski|football|fotball)\b/],
  ['study',    /\b(math|matte|school|skole|study|studying|les(?:e|ing)?\s+p(?:e|å)|lecture|forelesning|class|homework|lekser|exam|eksamen|revis\w*|physics|fysikk|chem\w*|kjemi|biology|biologi|history|historie|essay|thesis|oppgave|lab|course|kurs)\b/],
  ['food',     /\b(eat|eating|food|mat|lunch|lunsj|dinner|middag|breakfast|frokost|brunch|snack|supper|kveldsmat|cook\w*|lage\s+mat|coffee|kaffe)\b/],
  ['rest',     /\b(sleep|sov\w*|nap|hvil\w*|rest|shower|dusj|bath|bad|movie|film|read|reading|les\w*|relax|chill|game|gaming|spill|party|fest|pub|beer|øl|friends|venner|date|music|musikk|guitar|gitar|tv|series|serie)\b/],
  ['admin',    /\b(email|e-?post|mail|call|ring|apply|application|søknad|søke|send|book|bestill|appointment|time\s+hos|clean\w*|vask\w*|laundry|klæsvask|grocer\w*|handle|shop\w*|plan\w*|admin|pay|betal\w*|bank|tax|skatt|invoice|faktura|cv|errand|ærend|fix|repair|reparer)\b/],
]

function categorise(title: string): Category {
  const t = title.toLowerCase()
  for (const [cat, re] of CATEGORIES) if (re.test(t)) return cat
  return 'other'
}

/**
 * Removes matched time expressions from a line so whatever is left is the title.
 * Matching runs on a lowercased copy; cuts are applied to the original text.
 */
class Scanner {
  private readonly lower: string
  private readonly cuts: { from: number; to: number }[] = []

  constructor(private readonly original: string) {
    this.lower = original.toLowerCase()
  }

  /**
   * Finds the first match that does not overlap an earlier cut and that `accept`
   * approves, records its span, and returns the value `accept` produced.
   */
  take<T>(source: string, accept: (m: RegExpExecArray) => T | null): T | null {
    const re = new RegExp(source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(this.lower))) {
      if (m[0].length === 0) { re.lastIndex++; continue }
      const from = m.index
      const to = m.index + m[0].length
      if (!this.overlaps(from, to)) {
        const value = accept(m)
        if (value !== null) {
          this.cuts.push({ from, to })
          return value
        }
      }
      re.lastIndex = m.index + 1
    }
    return null
  }

  private overlaps(from: number, to: number): boolean {
    return this.cuts.some((c) => from < c.to && to > c.from)
  }

  /** The original text with every matched span removed. */
  remainder(): string {
    const sorted = [...this.cuts].sort((a, b) => a.from - b.from)
    let out = ''
    let pos = 0
    for (const c of sorted) {
      if (c.from > pos) out += this.original.slice(pos, c.from)
      pos = Math.max(pos, c.to)
    }
    out += this.original.slice(pos)
    return tidy(out)
  }
}

function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/^[\s,;:.\-–—*•]+|[\s,;:.\-–—]+$/g, '').trim()
}

// A clock reading: 8, 08, 8:30, 08.30
const CLOCK = String.raw`(\d{1,2})(?:[:.](\d{1,2}))?`
const DASH = String.raw`(?:-|–|—|to|til|until|till|fram\s+til|frem\s+til)`

function readClock(h: string | undefined, m: string | undefined): number | null {
  if (h === undefined) return null
  return clockToMinutes(parseInt(h, 10), m === undefined ? 0 : parseInt(m, 10))
}

function readDuration(value: string, unitIsHours: boolean, extraMinutes?: string): number | null {
  const n = parseFloat(value.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  const base = unitIsHours ? n * 60 : n
  const extra = extraMinutes === undefined ? 0 : parseInt(extraMinutes, 10)
  const total = Math.round(base + extra)
  return total > 0 && total <= 24 * 60 ? total : null
}

interface SegmentContext {
  day: Day
  /** End of the previous block on this day, so "then ..." knows where to start. */
  cursor: number | null
  chained: boolean
}

function parseSegment(raw: string, ctx: SegmentContext): ParsedSegment {
  let text = raw.trim()
  if (!text) return { kind: 'unparsed', raw, reason: 'empty' }

  // A leading day name retargets the following lines: "Monday, 8 bike ride".
  const dayMatch = /^([a-zæøå]+)\s*[,:.]?\s*/i.exec(text)
  if (dayMatch?.[1]) {
    const day = DAY_WORDS[dayMatch[1].toLowerCase()]
    if (day !== undefined) {
      const rest = text.slice(dayMatch[0].length).trim()
      if (!rest) return { kind: 'day', raw, day }
      ctx.day = day
      ctx.cursor = null
      ctx.chained = false
      text = rest
    }
  }

  // "afterwards" anywhere means: start where the previous block ended.
  let chained = ctx.chained
  const withoutMarker = text.replace(/\b(?:afterwards?|after\s+that|etterp\u00e5|etter\s+det)\b/gi, ' ')
  if (withoutMarker !== text) { chained = true; text = withoutMarker }

  // #todo anywhere on the line marks it as a task.
  let isTodo = false
  text = text.replace(/(^|\s)#(todo|task|oppgave)\b/gi, (_m, lead: string) => {
    isTodo = true
    return lead
  })

  // Trailing detail goes to the note: after an em dash, in parentheses, or after a comma.
  let note: string | undefined
  const dashNote = /\s+(?:—|–|--)\s+(.+)$/.exec(text)
  const parenNote = /\s*\(([^)]+)\)\s*$/.exec(text)
  const commaNote = /,\s*(.+)$/.exec(text)
  if (dashNote?.[1]) { note = dashNote[1].trim(); text = text.slice(0, dashNote.index) }
  else if (parenNote?.[1]) { note = parenNote[1].trim(); text = text.slice(0, parenNote.index) }
  else if (commaNote?.[1] && /\d/.test(text.slice(0, commaNote.index))) {
    note = commaNote[1].trim(); text = text.slice(0, commaNote.index)
  }

  const sc = new Scanner(text)
  let start: number | null = null
  let end: number | null = null
  let duration: number | null = null

  // "from 8 to 9" / "8-9" / "8 to 9"
  const range =
    sc.take(String.raw`\b(?:from|fra|kl\.?|klokka|klokken)\s*` + CLOCK + String.raw`\s*` + DASH + String.raw`\s*` + CLOCK + String.raw`\b`,
      (m) => { const a = readClock(m[1], m[2]); const b = readClock(m[3], m[4]); return a !== null && b !== null ? [a, b] as const : null }) ??
    sc.take(String.raw`\b` + CLOCK + String.raw`\s*` + DASH + String.raw`\s*` + CLOCK + String.raw`\b`,
      (m) => { const a = readClock(m[1], m[2]); const b = readClock(m[3], m[4]); return a !== null && b !== null ? [a, b] as const : null })
  if (range) { start = range[0]; end = range[1] }

  // "before bed at 23:00" / "before 23:00" — the clock is an end.
  if (end === null) {
    end = sc.take(String.raw`\bbefore\s+(?:[a-zæøå]+\s+){0,1}(?:at|kl\.?|klokka|klokken)?\s*` + CLOCK + String.raw`\b`,
      (m) => readClock(m[1], m[2]))
  }

  // "until 17"
  if (end === null) {
    end = sc.take(String.raw`\b(?:until|till|til|fram\s+til|frem\s+til|to)\s*` + CLOCK + String.raw`\b`,
      (m) => readClock(m[1], m[2]))
  }

  // "2h", "1.5 hours", "1h30", "2t"
  duration = sc.take(String.raw`\b(?:(?:for|i)\s+)?(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hours?|timer|time[rn]?|t)(?![a-zæøå])(?:\s*(\d{1,2})\s*(?:m|min|mins|minutes?|minutt(?:er)?)?\b)?`,
    (m) => (m[1] === undefined ? null : readDuration(m[1], true, m[2])))

  // "30 min", "45 minutes"
  if (duration === null) {
    duration = sc.take(String.raw`\b(?:(?:for|i)\s+)?(\d+)\s*(?:m|min|mins|minute[rs]?|minutes|minutt(?:er)?)\b`,
      (m) => (m[1] === undefined ? null : readDuration(m[1], false)))
  }

  // "at 11", "from 8", "kl 8"
  if (start === null) {
    start = sc.take(String.raw`\b(?:at|from|fra|kl\.?|klokka|klokken)\s*` + CLOCK + String.raw`\b`,
      (m) => readClock(m[1], m[2]))
  }

  // A bare number, only when nothing else supplied a start.
  if (start === null) {
    start = sc.take(String.raw`(?:^|\s)` + CLOCK + String.raw`(?=\s|$)`, (m) => readClock(m[1], m[2]))
  }

  // Resolve whatever combination we ended up with.
  if (start !== null && end === null) {
    end = start + (duration ?? DEFAULT_DURATION)
  } else if (start === null && end !== null) {
    start = duration !== null ? end - duration : (ctx.cursor ?? end - DEFAULT_DURATION)
  } else if (start === null && end === null) {
    if (ctx.cursor === null) {
      if (isTodo) {
        const text2 = tidy(sc.remainder())
        if (!text2) return { kind: 'unparsed', raw, reason: 'nothing to add' }
        return { kind: 'todo', raw, text: text2, note }
      }
      return { kind: 'unparsed', raw, reason: 'no time found' }
    }
    if (duration === null && !chained) {
      if (isTodo) {
        const text2 = tidy(sc.remainder())
        if (!text2) return { kind: 'unparsed', raw, reason: 'nothing to add' }
        return { kind: 'todo', raw, text: text2, note }
      }
      return { kind: 'unparsed', raw, reason: 'no time found' }
    }
    start = ctx.cursor
    end = start + (duration ?? DEFAULT_DURATION)
  }

  if (start === null || end === null) return { kind: 'unparsed', raw, reason: 'no time found' }
  if (start < 0) start = 0
  if (end <= start) end = start + DEFAULT_DURATION
  if (end > 24 * 60) end = 24 * 60

  const title = tidy(sc.remainder())
  if (!title) return { kind: 'unparsed', raw, reason: 'no title' }

  return {
    kind: 'block',
    raw,
    block: { day: ctx.day, start, end, title, note, category: categorise(title), isTodo },
  }
}

/** Splits a line into items on "then", which also chains each item to the previous end. */
const SEPARATOR = /(?:,\s*)?\b(?:then|and\s+then|så|deretter)\b\s*/gi

export function parse(input: string, opts: { day?: Day } = {}): ParseResult {
  const result: ParseResult = { segments: [], blocks: [], todos: [], unparsed: [], day: opts.day ?? 0 }
  const ctx: SegmentContext = { day: opts.day ?? 0, cursor: null, chained: false }

  for (const line of input.split(/\r?\n/)) {
    if (!line.trim()) continue

    SEPARATOR.lastIndex = 0
    const pieces = line.split(SEPARATOR)
    let first = true

    for (const piece of pieces) {
      if (!piece.trim()) { first = false; continue }
      ctx.chained = !first
      first = false

      const seg = parseSegment(piece, ctx)
      result.segments.push(seg)

      if (seg.kind === 'day') {
        ctx.day = seg.day
        ctx.cursor = null
      } else if (seg.kind === 'block') {
        result.blocks.push(seg.block)
        ctx.cursor = seg.block.end
      } else if (seg.kind === 'todo') {
        result.todos.push({ text: seg.text, note: seg.note })
      } else {
        result.unparsed.push({ raw: seg.raw, reason: seg.reason })
      }
    }
  }

  result.day = ctx.day
  return result
}
