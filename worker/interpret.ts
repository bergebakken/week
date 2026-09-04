import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

const CATEGORIES = ['movement', 'study', 'food', 'rest', 'admin', 'other'] as const

const Interpretation = z.object({
  blocks: z.array(
    z.object({
      day: z.number().describe('0 is Monday, 6 is Sunday'),
      start: z.string().describe('24-hour clock, HH:MM'),
      end: z.string().describe('24-hour clock, HH:MM'),
      title: z.string().describe('a few words, as the person would label it themselves'),
      note: z.string().describe('any extra detail, or an empty string'),
      category: z.enum(CATEGORIES),
      isTodo: z.boolean().describe('true when this is a task to tick off, not just an appointment'),
    }),
  ),
  todos: z.array(
    z.object({
      text: z.string(),
      note: z.string().describe('extra detail, or an empty string'),
    }),
  ).describe('tasks with no sensible time; they go on a list instead of the week'),
  unreadable: z.array(z.string()).describe('lines you could not place; better to return them than to invent a time'),
})

export type Interpretation = z.infer<typeof Interpretation>

export interface Context {
  /** Day the person is looking at. 0 = Monday. */
  day: number
  /** What is already planned, so "after lunch" and "before school" resolve. */
  existing: { day: number; start: string; end: string; title: string }[]
}

const SYSTEM = `You turn everyday sentences into blocks on a weekly planner.

The planner has no dates. A week is Monday (0) to Sunday (6), and times are a
24-hour clock. Someone types how they want a day to go, in whatever words come
naturally, and you place it.

Rules:
- A bare hour is 24-hour: "8" is 08:00, "17" is 17:00. Never guess am/pm.
- Anchor relative wording against what is already planned. "after lunch" starts
  when the existing lunch block ends; "before school" ends when school begins.
- With no length given, use a sensible one for the activity rather than a fixed
  default: a shower is 15 minutes, a gym session an hour, a film two.
- Keep the person's own words in the title. Do not tidy "gym" into "Gymnasium".
- Split one sentence into several blocks when it describes several things.
- If a line genuinely has nothing to place it by, put it in unreadable. Do not
  invent a time. Being told you could not read it is far better than a block
  landing at a time nobody chose.
- A task with no sensible time goes in todos rather than on the week.`

function describe(context: Context, dayNames: string[]): string {
  if (context.existing.length === 0) return 'Nothing is planned yet this week.'
  const lines = context.existing
    .slice()
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((b) => `  ${dayNames[b.day]} ${b.start}-${b.end} ${b.title}`)
  return `Already planned:\n${lines.join('\n')}`
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export async function interpret(
  apiKey: string,
  lines: string[],
  context: Context,
): Promise<Interpretation> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 4000,
    system: SYSTEM,
    // A short extraction where the answer is waiting on someone mid-sentence:
    // low effort is the right trade, and thinking stays on by default.
    output_config: {
      effort: 'low',
      format: zodOutputFormat(Interpretation),
    },
    messages: [
      {
        role: 'user',
        content: [
          `The person is looking at ${DAY_NAMES[context.day] ?? 'Monday'}, so an undated line belongs there.`,
          describe(context, DAY_NAMES),
          'Place these lines:',
          ...lines.map((line) => `  ${line}`),
        ].join('\n\n'),
      },
    ],
  })

  if (response.parsed_output === null) {
    throw new Error('could not read the reply')
  }
  return response.parsed_output
}
