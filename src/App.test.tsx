import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

declare global { var IS_REACT_ACT_ENVIRONMENT: boolean }
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  window.localStorage.clear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  if (host?.isConnected) {
    await act(async () => { root.unmount() })
    host.remove()
  }
})

const render = async () => { await act(async () => { root.render(<App />) }) }

/** React tracks the value internally, so set it through the native setter. */
async function type(value: string) {
  const area = host.querySelector('textarea')
  if (!area) throw new Error('no prompt input')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(area, value)
  await act(async () => { area.dispatchEvent(new Event('input', { bubbles: true })) })
  return area
}

describe('the app', () => {
  it('renders all seven days, the rail and the prompt', async () => {
    await render()
    const text = host.textContent ?? ''
    for (const day of ['Monday', 'Wednesday', 'Sunday']) expect(text).toContain(day)
    expect(text).toContain('Todos')
    expect(text).toContain('NOTHING PLANNED YET')
    expect(host.querySelector('textarea')).toBeTruthy()
  })

  it('ghosts blocks into the week as you type, before committing', async () => {
    await render()
    await type('monday bike ride 2h from 8, intervals 5x10')

    expect(host.textContent).toContain('08:00–10:00')
    const ghost = host.querySelector('.blk.ghost')
    expect(ghost).toBeTruthy()
    expect(ghost?.textContent).toContain('bike ride')
    expect(ghost?.getAttribute('data-cat')).toBe('movement')
    // Nothing is stored until Return.
    expect(window.localStorage.getItem('week.plan.v1')).not.toContain('bike ride')
  })

  it('commits on Return, keeps it, and drops the ghost', async () => {
    await render()
    const area = await type('monday bike ride 2h from 8')
    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(host.querySelector('.blk.ghost')).toBeNull()
    const real = host.querySelector('.blk:not(.ghost)')
    expect(real?.textContent).toContain('bike ride')
    expect(area.value).toBe('')
    expect(host.textContent).toContain('2H PLANNED')
    expect(window.localStorage.getItem('week.plan.v1')).toContain('bike ride')
  })

  it('files a timed #todo in the rail and the grid at once', async () => {
    await render()
    const area = await type('thursday #todo send application 1h from 19')
    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(host.textContent).toContain('SCHEDULED')
    expect(host.textContent).toContain('THU 19:00')
    expect(host.querySelector('.blk:not(.ghost)')?.getAttribute('data-cat')).toBe('admin')
    expect(host.textContent).toContain('1 OPEN')
  })

  it('reloads the plan from storage', async () => {
    await render()
    const area = await type('monday swim 1h at 9')
    await act(async () => { area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    await act(async () => { root.unmount() })

    root = createRoot(host)  // afterEach unmounts this one
    await render()
    expect(host.textContent).toContain('swim')
  })

  it('shows the clock, the date and the week number', async () => {
    await render()
    expect(host.querySelector('.clock-time')?.textContent).toMatch(/^\d{2}:\d{2}$/)
    expect(host.querySelector('.clock-week')?.textContent).toMatch(/^Week ([1-9]|[1-4]\d|5[0-3])$/)
    expect(host.querySelector('.clock-date')?.textContent).toBeTruthy()
    expect(host.querySelectorAll('.clock svg circle')).toHaveLength(2)
  })

  it('hands the line back, unharmed, when there is no Claude to ask', async () => {
    await render()
    const area = await type('gym sometime after lunch')
    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(area.value).toBe('gym sometime after lunch')
    expect(host.querySelector('.problem')?.textContent).toContain('turn on sync')
  })

  it('sends what it cannot read to Claude, and files what comes back', async () => {
    window.localStorage.setItem('week.sync', JSON.stringify({
      url: 'https://week-sync.example.workers.dev', code: 'b'.repeat(32),
    }))
    const asked: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      const target = String(url)
      if (target.endsWith('/interpret')) {
        asked.push(String(init?.body))
        return Promise.resolve(new Response(JSON.stringify({
          blocks: [{ day: 0, start: '13:00', end: '14:00', title: 'gym', note: '', category: 'movement', isTodo: false }],
          todos: [], unreadable: [],
        })))
      }
      // the sync endpoints
      return Promise.resolve(new Response(init?.method === 'PUT' ? String(init.body) : 'null'))
    }) as unknown as typeof fetch

    try {
      await render()
      const area = await type('gym sometime after lunch')
      expect(host.querySelector('.res')?.textContent).toContain('Claude will place this')

      await act(async () => {
        area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      })
      await act(async () => { await Promise.resolve() })

      expect(asked).toHaveLength(1)
      expect(JSON.parse(asked[0]!).lines).toEqual(['gym sometime after lunch'])
      expect(host.querySelector('.blk:not(.ghost)')?.textContent).toContain('gym')
      expect(area.value).toBe('')
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('picks up sync details from the address bar and clears them away', async () => {
    const realFetch = globalThis.fetch
    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      Promise.resolve(new Response(init?.method === 'PUT' ? String(init.body) : 'null'))) as unknown as typeof fetch
    const code = 'c'.repeat(32)
    window.history.replaceState(null, '', `/week/?sync=https%3A%2F%2Fweek-sync.example.workers.dev&code=${code}`)

    try {
      await render()
      expect(JSON.parse(window.localStorage.getItem('week.sync') ?? '{}')).toEqual({
        url: 'https://week-sync.example.workers.dev', code,
      })
      // the code must not be left sitting in the address bar or in history
      expect(window.location.search).toBe('')
      expect(host.querySelector('.icon-btn')?.getAttribute('data-sync')).not.toBe('off')
    } finally {
      globalThis.fetch = realFetch
      window.history.replaceState(null, '', '/')
    }
  })

  it('ignores a malformed sync link', async () => {
    window.history.replaceState(null, '', '/week/?sync=notaurl&code=short')
    try {
      await render()
      expect(window.localStorage.getItem('week.sync')).toBeNull()
      expect(host.querySelector('.icon-btn')?.getAttribute('data-sync')).toBe('off')
    } finally {
      window.history.replaceState(null, '', '/')
    }
  })

  it('stays off the network entirely until sync is set up', async () => {
    const calls: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((input: unknown) => {
      calls.push(String(input))
      return Promise.reject(new Error('should not be called'))
    }) as typeof fetch
    try {
      await render()
      const area = await type('monday gym 1h at 17')
      await act(async () => {
        area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      })
      expect(calls).toEqual([])
      expect(host.querySelector('.icon-btn')?.getAttribute('data-sync')).toBe('off')
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('will not connect sync without an address and a code', async () => {
    await render()
    await act(async () => { host.querySelector<HTMLElement>('.icon-btn')?.click() })

    const card = host.querySelector('.card')
    expect(card?.textContent).toContain('This plan lives in this browser only')

    const connect = card?.querySelector<HTMLButtonElement>('.primary')
    expect(connect?.disabled).toBe(true)
    expect(connect?.textContent).toBe('Connect')
  })

  it('accepts an address plus a generated code', async () => {
    await render()
    await act(async () => { host.querySelector<HTMLElement>('.icon-btn')?.click() })

    const card = host.querySelector('.card')
    const address = card?.querySelector<HTMLInputElement>('input')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(address, 'https://week-sync.example.workers.dev')
    await act(async () => { address?.dispatchEvent(new Event('input', { bubbles: true })) })

    const makeCode = [...card?.querySelectorAll<HTMLElement>('.ghost-btn') ?? []]
      .find((b) => b.textContent === 'New code')
    await act(async () => { makeCode?.click() })

    const code = card?.querySelectorAll<HTMLInputElement>('input')[1]
    expect(code?.value).toMatch(/^[a-f0-9]{32}$/)
    expect(card?.querySelector<HTMLButtonElement>('.primary')?.disabled).toBe(false)
  })

  it('shows a spelling fix before committing, and files the corrected wording', async () => {
    await render()
    const area = await type('birtday party at 20')
    expect(host.querySelector('.fixes')?.textContent).toContain('birtday → birthday')

    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(host.querySelector('.blk:not(.ghost)')?.textContent).toContain('birthday party')
  })

  it('says nothing when the spelling is already fine', async () => {
    await render()
    await type('gym 1h at 17')
    expect(host.querySelector('.fixes')).toBeNull()
  })

  it('shows a quote of the day with its author', async () => {
    await render()
    const text = host.querySelector('.quote-text')?.textContent ?? ''
    expect(text.length).toBeGreaterThan(12)
    expect(text.startsWith('\u201c') && text.endsWith('\u201d')).toBe(true)
    expect(host.querySelector('.quote-author')?.textContent?.length ?? 0).toBeGreaterThan(2)
  })

  it('opens a fact card with the number of the day, and swaps the fact', async () => {
    await render()
    expect(host.querySelector('.fact-card')).toBeNull()

    const button = host.querySelector<HTMLElement>('.fact-btn')
    await act(async () => { button?.click() })

    const card = host.querySelector('.fact-card')
    expect(card).toBeTruthy()
    expect(host.querySelector('.fact-n')?.textContent).toMatch(/^\d{1,3}$/)
    expect(host.querySelector('.fact-note')?.textContent).toContain('days left in the year')

    const first = host.querySelector('.fact-text')?.textContent
    const another = card?.querySelector<HTMLElement>('.ghost-btn')
    await act(async () => { another?.click() })
    expect(host.querySelector('.fact-text')?.textContent).not.toBe(first)

    await act(async () => { button?.click() })
    expect(host.querySelector('.fact-card')).toBeNull()
  })

  it('keeps a short block readable rather than clipping its title', async () => {
    await render()
    // No end time, so it gets the default 30 minutes and lands on the height floor.
    const area = await type('monday standup at 9')
    await act(async () => { area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })

    const blk = host.querySelector('.blk:not(.ghost)')
    expect(blk?.className).toContain('compact')
    expect(blk?.textContent).toContain('standup')
    expect(blk?.textContent).toContain('09:00')
    expect(blk?.getAttribute('title')).toContain('09:00–09:30')
  })

  it('shows a gap marker between two distant blocks', async () => {
    await render()
    const area = await type('monday swim 1h at 9\nmonday gym 1h at 17')
    await act(async () => { area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(host.textContent).toContain('7H FREE')
  })
})
