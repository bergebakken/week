/**
 * Runs the same lines through several models so the choice is made on evidence.
 * Uses the worker's real prompt and schema, so what you measure is what ships.
 *
 *   ANTHROPIC_API_KEY=sk-... node scripts/compare-models.ts
 */
import { interpret } from '../worker/interpret.ts'

const MODELS = ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-5']

/** Lines the local parser gives up on - the only ones that ever reach a model. */
const CASES: { line: string; want: string }[] = [
  { line: 'gym sometime after lunch', want: 'starts at or after 12:30' },
  { line: 'squeeze in a run before dinner', want: 'ends by 18:30' },
  { line: 'busy morning with school then a long ride in the afternoon', want: 'two blocks' },
  { line: 'dentist tuesday morning', want: 'tuesday, a sensible morning hour' },
  { line: 'read a bit before bed', want: 'late evening, ~30-60 min' },
  { line: 'call mum at some point this evening', want: 'evening' },
  { line: 'laundry and groceries saturday', want: 'saturday, two blocks or one' },
  { line: 'wake up early and swim before school', want: 'ends by 08:00' },
  { line: 'asdfgh qwerty', want: 'unreadable - must NOT invent a time' },
]

const CONTEXT = {
  day: 0,
  existing: [
    { day: 0, start: '08:00', end: '11:00', title: 'school' },
    { day: 0, start: '12:00', end: '12:30', title: 'lunch' },
    { day: 0, start: '18:30', end: '19:15', title: 'dinner' },
  ],
}

const key = process.env.ANTHROPIC_API_KEY
if (!key) {
  console.error('Set ANTHROPIC_API_KEY first. The worker keeps its own copy; this script needs a local one.')
  process.exit(1)
}

for (const model of MODELS) {
  console.log(`\n${'='.repeat(64)}\n${model}\n${'='.repeat(64)}`)
  let total = 0
  let invented = 0

  for (const { line, want } of CASES) {
    const started = Date.now()
    try {
      const result = await interpret(key, [line], CONTEXT, model)
      const took = Date.now() - started
      total += took

      const placed = result.blocks.map((b) => `${b.start}-${b.end} ${b.title}`).join(', ')
      const unread = result.unreadable.length > 0 ? `unreadable(${result.unreadable.length})` : ''
      const todos = result.todos.map((t) => `todo:${t.text}`).join(', ')
      if (line.startsWith('asdfgh') && result.blocks.length > 0) invented++

      console.log(`\n  "${line}"`)
      console.log(`    want: ${want}`)
      console.log(`    got : ${[placed, todos, unread].filter(Boolean).join('  |  ') || '(nothing)'}   ${took}ms`)
    } catch (error) {
      console.log(`\n  "${line}"\n    FAILED: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`\n  average ${Math.round(total / CASES.length)}ms per line`)
  if (invented > 0) console.log(`  WARNING: invented a time for nonsense input`)
}
