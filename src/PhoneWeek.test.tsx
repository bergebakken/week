import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { DAY_NAMES } from './model'
import { todayIndex } from './store'

declare global { var IS_REACT_ACT_ENVIRONMENT: boolean }
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
const original = window.matchMedia

/** Force the phone breakpoint on, since happy-dom has no real viewport. */
function pretendPhone() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (media: string) => ({
      media, matches: true, onchange: null,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, dispatchEvent: () => false,
    }),
  })
}

beforeEach(() => {
  window.localStorage.clear()
  pretendPhone()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  if (host?.isConnected) {
    await act(async () => { root.unmount() })
    host.remove()
  }
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: original })
})

const render = async () => { await act(async () => { root.render(<App />) }) }
const shown = () => host.querySelector('.phone-dayname')?.textContent
const nameOf = (day: number) => DAY_NAMES[((day % 7) + 7) % 7]

async function click(selector: string, index = 0) {
  const el = host.querySelectorAll<HTMLElement>(selector)[index]
  if (!el) throw new Error(`no ${selector}[${index}]`)
  await act(async () => { el.click() })
}

/** happy-dom has no TouchEvent, so hand React an event carrying the fields it reads. */
async function swipe(fromX: number, toX: number, dy = 0) {
  const area = host.querySelector('.phone')
  if (!area) throw new Error('no phone view')
  const send = (type: string, x: number, y: number) => {
    const event = new Event(type, { bubbles: true }) as Event & { changedTouches: unknown[] }
    event.changedTouches = [{ clientX: x, clientY: y }]
    area.dispatchEvent(event)
  }
  await act(async () => {
    send('touchstart', fromX, 0)
    send('touchend', toX, dy)
  })
}

async function type(value: string) {
  const area = host.querySelector('textarea')
  if (!area) throw new Error('no prompt input')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(area, value)
  await act(async () => { area.dispatchEvent(new Event('input', { bubbles: true })) })
  return area
}

describe('the phone view', () => {
  it('shows one day rather than the seven-column grid', async () => {
    await render()
    expect(host.querySelector('.week')).toBeNull()
    expect(shown()).toBe(DAY_NAMES[todayIndex()])
    expect(host.querySelectorAll('.phone-dot')).toHaveLength(7)
    expect(host.querySelector('.phone-dot[aria-selected="true"]')?.getAttribute('aria-label'))
      .toBe(DAY_NAMES[todayIndex()])
  })

  it('moves a day with the arrows and wraps around the week', async () => {
    await render()
    const today = todayIndex()
    await click('.phone-arrow', 1)
    expect(shown()).toBe(nameOf(today + 1))
    await click('.phone-arrow', 0)
    await click('.phone-arrow', 0)
    expect(shown()).toBe(nameOf(today - 1))
  })

  it('never falls off either end of the week', async () => {
    await render()
    for (let i = 0; i < 9; i++) await click('.phone-arrow', 1)
    expect(DAY_NAMES).toContain(shown())
  })

  it('swipes left for the next day and right for the previous', async () => {
    await render()
    const today = todayIndex()
    await swipe(300, 200)
    expect(shown()).toBe(nameOf(today + 1))
    await swipe(200, 300)
    expect(shown()).toBe(nameOf(today))
  })

  it('ignores a short drag and a mostly-vertical one', async () => {
    await render()
    const today = todayIndex()
    await swipe(300, 275)          // too short
    expect(shown()).toBe(nameOf(today))
    await swipe(300, 240, 200)     // mostly a scroll
    expect(shown()).toBe(nameOf(today))
  })

  it('jumps to a day from the dots', async () => {
    await render()
    await click('.phone-dot', 5)
    expect(shown()).toBe(DAY_NAMES[5])
  })

  it('files an undated line on the day being viewed, not today', async () => {
    await render()
    await click('.phone-dot', 5)          // Saturday
    const area = await type('long ride 4h from 9')
    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(host.querySelector('.blk:not(.ghost)')?.textContent).toContain('long ride')
    await click('.phone-dot', (5 + 1) % 7)
    expect(host.querySelector('.blk:not(.ghost)')).toBeNull()
  })

  it('keeps the todos reachable below the day', async () => {
    await render()
    const area = await type('#todo book dentist')
    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(host.querySelector('.rail')?.textContent).toContain('book dentist')
  })

  it('gives short blocks a thumb-sized target', async () => {
    await render()
    const area = await type('standup at 9')
    await act(async () => {
      area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    const blk = host.querySelector<HTMLElement>('.blk:not(.ghost)')
    expect(Number.parseInt(blk?.style.height ?? '0', 10)).toBeGreaterThanOrEqual(44)
    expect(blk?.textContent).toContain('standup')
  })
})
