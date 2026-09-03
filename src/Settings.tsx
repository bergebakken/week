import { useState } from 'react'
import { Close } from './Icons'
import { newSyncCode, type SyncConfig, type SyncState } from './sync'

function describe(state: SyncState): string {
  switch (state.status) {
    case 'off': return 'Not syncing. This plan lives in this browser only.'
    case 'syncing': return 'Saving…'
    case 'ok': return `Up to date, last checked ${new Date(state.at).toLocaleTimeString()}.`
    case 'error': return `Not syncing: ${state.message}`
  }
}

interface Props {
  sync: SyncConfig | null
  state: SyncState
  onChange: (config: SyncConfig | null) => void
  onClose: () => void
}

export function Settings({ sync, state, onChange, onClose }: Props) {
  const [url, setUrl] = useState(sync?.url ?? '')
  const [code, setCode] = useState(sync?.code ?? '')

  const ready = /^https?:\/\/\S+$/.test(url.trim()) && /^[a-f0-9]{24,128}$/i.test(code.trim())

  return (
    <div className="scrim" onClick={onClose}>
      <div className="card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <h2>Sync</h2>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }} data-sync={state.status}>
              {describe(state)}
            </p>
          </div>
          <button className="ghost-btn" style={{ padding: 6 }} onClick={onClose} aria-label="Close"><Close /></button>
        </div>

        <label className="field">
          <span className="label">SERVER ADDRESS</span>
          <input
            value={url}
            spellCheck={false}
            placeholder="https://week-sync.your-name.workers.dev"
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="label">SYNC CODE</span>
          <div className="row">
            <input
              value={code}
              spellCheck={false}
              placeholder="paste the code from your other device"
              onChange={(e) => setCode(e.target.value.trim())}
              style={{ flex: 1 }}
            />
            <button className="ghost-btn" onClick={() => setCode(newSyncCode())}>New code</button>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>
          Make a code here, then open Week on your phone and enter the same address and code.
          Both devices will keep each other up to date. Anyone with the code can read your plan,
          so treat it like a password.
        </p>

        <div className="card-foot">
          <button
            className="ghost-btn"
            disabled={!sync}
            style={{ opacity: sync ? 1 : 0.4 }}
            onClick={() => { onChange(null); onClose() }}
          >
            Turn off
          </button>
          <button
            className="primary"
            disabled={!ready}
            style={{ opacity: ready ? 1 : 0.4 }}
            onClick={() => { onChange({ url: url.trim().replace(/\/+$/, ''), code: code.trim() }); onClose() }}
          >
            {sync ? 'Update' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
