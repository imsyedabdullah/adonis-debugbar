import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { randomUUID } from 'node:crypto'
import { storage, ringBuffer } from './store.ts'
import type { RequestData } from './types.ts'

function parseHandler(raw: string): string {
  const match = raw.match(/import\(['"]([^'"]+)['"]\)\s*,\s*(\w+)/)
  if (match) {
    const lastSegment = match[1].split('/').pop() ?? match[1]
    const className = lastSegment
      .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      .replace(/^[a-z]/, (c: string) => c.toUpperCase())
    return `${className}.${match[2]}`
  }
  return raw
}

export default class DebugbarMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (process.env.DEBUG_BAR !== 'true') {
      return next()
    }

    if (ctx.request.url().startsWith('/__debugbar')) {
      return next()
    }

    const id = randomUUID()
    const startHr = process.hrtime.bigint()

    const entry: RequestData = {
      id,
      method: ctx.request.method(),
      url: ctx.request.url(true),
      status: 200,
      timestamp: Date.now(),

      messages: [],
      consoleLogs: [],
      timeline: { total: 0, entries: [], markers: [], measures: [] },
      queries: { count: 0, totalDuration: 0, entries: [] },
      exceptions: [],
      request: {
        headers: Object.fromEntries(
          Object.entries(ctx.request.headers()).map(([k, v]) => [k, String(v ?? '')])
        ),
        query: ctx.request.qs() as Record<string, unknown>,
        body: ctx.request.body(),
      },
      route: null,
      session: { id: null, initiated: false, fresh: false, data: {} },
    }

    entry.timeline.entries.push({ label: 'Request received', ms: 0 })

    ctx.response.header('X-Debugbar-Id', id)

    await storage.run(entry, async () => {
      try {
        await next()
      } finally {
        const durationMs =
          Math.round((Number(process.hrtime.bigint() - startHr) / 1_000_000) * 100) / 100

        entry.status = ctx.response.getStatus()
        entry.timeline.entries.push({ label: 'Response sent', ms: durationMs })
        entry.timeline.total = durationMs
        entry.queries.count = entry.queries.entries.length
        entry.queries.totalDuration =
          Math.round(entry.queries.entries.reduce((sum, q) => sum + q.duration, 0) * 100) / 100

        if (ctx.route) {
          const handler = ctx.route.handler
          const mw = ctx.route.middleware as unknown
          let mwItems: unknown[] = []
          if (Array.isArray(mw)) {
            mwItems = mw
          } else if (mw && typeof (mw as Record<string, unknown>).all === 'function') {
            try {
              mwItems = Array.from((mw as { all: () => Iterable<unknown> }).all())
            } catch {
              /* ignore */
            }
          }

          const rawHandler =
            typeof handler === 'object' && handler !== null && 'reference' in handler
              ? String((handler as Record<string, unknown>).reference)
              : String(handler)

          entry.route = {
            pattern: ctx.route.pattern,
            method: ctx.request.method(),
            handler: parseHandler(rawHandler),
            middleware: mwItems.map((m) => {
              if (m && typeof m === 'object') {
                const obj = m as Record<string, unknown>
                const name = obj.name || obj.type
                if (name) return String(name)
                if (typeof obj.handle === 'function') {
                  return (obj.handle as { name?: string }).name || 'Inline'
                }
                return 'Inline'
              }
              if (typeof m === 'function') return (m as { name?: string }).name || 'Inline'
              return String(m) || 'Inline'
            }),
          }
        }

        try {
          const session = (ctx as unknown as Record<string, unknown>).session as
            | Record<string, unknown>
            | undefined
          if (session && typeof session.all === 'function') {
            const data = (session as { all: () => Record<string, unknown> }).all() ?? {}
            entry.session = {
              id: typeof session.sessionId === 'string' ? session.sessionId : null,
              initiated: typeof session.initiated === 'boolean' ? session.initiated : false,
              fresh: typeof session.fresh === 'boolean' ? session.fresh : false,
              data,
            }
          }
        } catch {
          /* session middleware may not be present on this route */
        }

        ringBuffer.push(entry)
      }
    })
  }
}
