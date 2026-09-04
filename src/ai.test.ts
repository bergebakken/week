import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { interpret } from './ai'
import type { SyncConfig } from './sync'

const config: SyncConfig = { url: 'https://week-sync.example.workers.dev', code: 'a'.repeat(32) }
const context = { day: 0 as const, existing: [] }

let sent: { url: string; init: RequestInit }[] = []
const realFetch = globalThis.fetch

function reply(body: unknown, status = 200) {
  globalThis.fetch = ((url: string, init: RequestInit) => {
    sent.push({ url, init })
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  }) as unknown as typeof fetch
}

beforeEach(() => { sent = [] })
afterEach(() => { globalThis.fetch = realFetch })

describe('asking Claude', () => {
  it('sends the lines and the sync code to the right endpoint', async () => {
    reply({ blocks: [], todos: [], unreadable: [] })
    await interpret(config, ['gym sometime after lunch'], context)

    expect(sent[0]?.url).toBe('https://week-sync.example.workers.dev/interpret')
    expect(sent[0]?.init.method).toBe('POST')
    expect((sent[0]?.init.headers as Record<string, string>)['x-week-key']).toBe(config.code)
    expect(JSON.parse(String(sent[0]?.init.body)).lines).toEqual(['gym sometime after lunch'])
  })

  it('converts a well-formed reply into blocks', async () => {
    reply({
      blocks: [{ day: 2, start: '13:00', end: '14:00', title: 'gym', note: '', category: 'movement', isTodo: false }],
      todos: [{ text: 'book dentist', note: '' }],
      unreadable: ['no idea'],
    })
    const result = await interpret(config, ['x'], context)

    expect(result.blocks).toEqual([
      { day: 2, start: 780, end: 840, title: 'gym', note: undefined, category: 'movement', isTodo: false },
    ])
    expect(result.todos).toEqual([{ text: 'book dentist', note: undefined }])
    expect(result.unreadable).toEqual(['no idea'])
  })

  it('throws away anything malformed rather than trusting it into the week', async () => {
    reply({
      blocks: [
        { day: 9, start: '10:00', end: '11:00', title: 'bad day', category: 'other', isTodo: false },
        { day: 0, start: '25:00', end: '26:00', title: 'bad clock', category: 'other', isTodo: false },
        { day: 0, start: '14:00', end: '13:00', title: 'ends before it starts', category: 'other', isTodo: false },
        { day: 0, start: '10:00', end: '11:00', title: '   ', category: 'other', isTodo: false },
        { day: 0, start: '10:00', end: '11:00', title: 'fine', category: 'nonsense', isTodo: false },
        'not even an object',
      ],
      todos: [{ text: '' }, { text: 'keep me' }, 42],
      unreadable: ['a', 7],
    })
    const result = await interpret(config, ['x'], context)

    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0]).toMatchObject({ title: 'fine', category: 'other' })  // unknown category falls back
    expect(result.todos).toEqual([{ text: 'keep me', note: undefined }])
    expect(result.unreadable).toEqual(['a'])
  })

  it('surfaces the server’s reason for refusing', async () => {
    reply({ error: 'daily limit reached' }, 429)
    await expect(interpret(config, ['x'], context)).rejects.toThrow('daily limit reached')
  })

  it('still fails clearly when the body is not json', async () => {
    globalThis.fetch = (() => Promise.resolve(new Response('nope', { status: 502 }))) as unknown as typeof fetch
    await expect(interpret(config, ['x'], context)).rejects.toThrow(/502/)
  })

  it('keeps a note when there is one', async () => {
    reply({ blocks: [{ day: 0, start: '09:00', end: '10:00', title: 'run', note: 'easy pace', category: 'movement', isTodo: true }], todos: [], unreadable: [] })
    const result = await interpret(config, ['x'], context)
    expect(result.blocks[0]).toMatchObject({ note: 'easy pace', isTodo: true })
  })
})
