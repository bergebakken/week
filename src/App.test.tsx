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

  it('shows a gap marker between two distant blocks', async () => {
    await render()
    const area = await type('monday swim 1h at 9\nmonday gym 1h at 17')
    await act(async () => { area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(host.textContent).toContain('7H FREE')
  })
})
