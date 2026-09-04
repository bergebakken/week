import { mergePlans, migratePlan } from '../src/sync'
import { DEFAULT_MODEL, interpret, type Context } from './interpret'

export interface Env {
  WEEK: KVNamespace
  /** Set with: npx wrangler secret put ANTHROPIC_API_KEY */
  ANTHROPIC_API_KEY?: string
  /** Optional override, e.g. claude-sonnet-5. Defaults to the small fast model. */
  MODEL?: string
}

/**
 * A day's worth of interpretations per sync code. The code is the only thing
 * guarding this, so a leaked one must not be able to run up a bill.
 */
const INTERPRETATIONS_PER_DAY = 100

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
    'access-control-allow-methods': 'GET, PUT, POST, OPTIONS',
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
    if (url.pathname !== '/plan' && url.pathname !== '/interpret') {
      return json({ error: 'not found' }, 404, origin)
    }

    const code = request.headers.get('x-week-key')
    if (code === null || !CODE.test(code)) return json({ error: 'bad sync code' }, 401, origin)
    const key = `plan:${code.toLowerCase()}`

    if (url.pathname === '/interpret') {
      if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin)

      // Establish who is asking before anything else, so an unknown code learns
      // nothing about how the server is configured.
      if ((await env.WEEK.get(key)) === null) return json({ error: 'unknown sync code' }, 403, origin)

      let body: { lines?: unknown; context?: unknown }
      try {
        body = (await request.json()) as typeof body
      } catch {
        return json({ error: 'invalid json' }, 400, origin)
      }

      const lines = Array.isArray(body.lines)
        ? body.lines.filter((l): l is string => typeof l === 'string' && l.trim().length > 0).slice(0, 20)
        : []
      if (lines.length === 0) return json({ error: 'nothing to interpret' }, 400, origin)

      if (!env.ANTHROPIC_API_KEY) return json({ error: 'no api key configured' }, 503, origin)

      const today = new Date().toISOString().slice(0, 10)
      const counter = `ai:${code.toLowerCase()}:${today}`
      const used = Number.parseInt((await env.WEEK.get(counter)) ?? '0', 10)
      if (used >= INTERPRETATIONS_PER_DAY) {
        return json({ error: 'daily limit reached' }, 429, origin)
      }
      await env.WEEK.put(counter, String(used + 1), { expirationTtl: 172_800 })

      try {
        const result = await interpret(env.ANTHROPIC_API_KEY, lines, body.context as Context, env.MODEL ?? DEFAULT_MODEL)
        return json(result, 200, origin)
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'interpretation failed' }, 502, origin)
      }
    }

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
