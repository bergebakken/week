const BASE = `${process.argv[2] ?? process.env.SYNC_URL ?? 'https://week-sync.bergealpint.workers.dev'}/plan`
const ORIGIN = 'https://bergebakken.github.io'
const code = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('')

async function call(method, body, { key = code, origin = ORIGIN } = {}) {
  const headers = { origin }
  if (key) headers['x-week-key'] = key
  if (body !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(BASE, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: res.status, body: parsed, headers: res.headers }
}

const plan = (blocks = [], tombstones = {}) => ({ version: 2, blocks, todos: [], tombstones })
const block = (id, updatedAt, title = id) =>
  ({ id, day: 0, start: 480, end: 540, title, category: 'other', updatedAt })

let ok = true
const check = (label, got, want) => {
  const good = JSON.stringify(got) === JSON.stringify(want)
  ok &&= good
  console.log(`${good ? '  PASS  ' : '  FAIL  '}${label}${good ? '' : `   got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

check('rejects a request with no sync code', (await call('GET', undefined, { key: null })).status, 401)
check('rejects a code that is too short', (await call('GET', undefined, { key: 'short' })).status, 401)

let r = await call('GET')
check('unknown code reads back as empty', [r.status, r.body], [200, null])
check('sends the site origin back for CORS', r.headers.get('access-control-allow-origin'), ORIGIN)

r = await call('PUT', plan([block('a', 100, 'bike ride')]))
check('stores a plan', [r.status, r.body.blocks.map(b => b.title)], [200, ['bike ride']])

r = await call('GET')
check('reads it back', r.body.blocks.map(b => b.title), ['bike ride'])

r = await call('PUT', plan([block('b', 100, 'gym')]))
check('merges instead of overwriting', r.body.blocks.map(b => b.id).sort(), ['a', 'b'])

r = await call('PUT', plan([block('a', 500, 'bike ride, longer')]))
check('newer edit of the same block wins', r.body.blocks.find(b => b.id === 'a').title, 'bike ride, longer')

r = await call('PUT', plan([], { b: 600 }))
check('a delete on one device removes it everywhere', r.body.blocks.map(b => b.id), ['a'])

r = await call('PUT', plan([block('b', 100, 'gym')]))
check('a stale device cannot resurrect it', r.body.blocks.map(b => b.id), ['a'])

r = await call('OPTIONS')
check('answers the CORS preflight', r.status, 204)
check('allows the sync header', (r.headers.get('access-control-allow-headers') || '').includes('x-week-key'), true)

r = await call('GET', undefined, { origin: 'https://evil.example' })
check('never grants CORS to another origin', r.headers.get('access-control-allow-origin'), ORIGIN)

r = await call('POST', plan())
check('refuses methods it does not serve', r.status, 405)

console.log(ok ? '\nALL PASS' : '\nSOME CHECKS FAILED')
process.exit(ok ? 0 : 1)
