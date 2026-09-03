import { mergePlans, migratePlan } from '../src/sync'

export interface Env {
  WEEK: KVNamespace
}

/** Only these origins may call the sync API. */
const ALLOWED_ORIGINS = [
  'https://bergebakken.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

/** The sync code is the only thing guarding a plan, so insist it is long. */
const CODE = /^[a-f0-9]{24,128}$/i
const MAX_BODY = 512 * 1024

function headers(origin: string | null): Record<string, string> {
  const allowed = origin !== null && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type, x-week-key',
    'access-control-max-age': '86400',
    'cache-control': 'no-store',
    vary: 'origin',
  }
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), 'content-type': 'application/json' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin')
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) })

    const url = new URL(request.url)
    if (url.pathname !== '/plan') return json({ error: 'not found' }, 404, origin)

    const code = request.headers.get('x-week-key')
    if (code === null || !CODE.test(code)) return json({ error: 'bad sync code' }, 401, origin)
    const key = `plan:${code.toLowerCase()}`

    if (request.method === 'GET') {
      const stored = await env.WEEK.get(key)
      return new Response(stored ?? 'null', {
        headers: { ...headers(origin), 'content-type': 'application/json' },
      })
    }

    if (request.method === 'PUT') {
      const body = await request.text()
      if (body.length > MAX_BODY) return json({ error: 'plan too large' }, 413, origin)

      let incoming: unknown
      try {
        incoming = JSON.parse(body)
      } catch {
        return json({ error: 'invalid json' }, 400, origin)
      }

      // Merge rather than overwrite, so two devices saving at once cannot lose an edit.
      const stored = await env.WEEK.get(key)
      const merged = stored === null
        ? migratePlan(incoming)
        : mergePlans(migratePlan(JSON.parse(stored)), migratePlan(incoming))

      await env.WEEK.put(key, JSON.stringify(merged))
      return json(merged, 200, origin)
    }

    return json({ error: 'method not allowed' }, 405, origin)
  },
}
