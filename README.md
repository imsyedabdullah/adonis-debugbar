# adonis-debugbar

Per-request debug bar for AdonisJS 6 / 7. Captures timing, SQL queries, route info, session data, log messages, exceptions, views, and custom timeline markers — all scoped to the current HTTP request via `AsyncLocalStorage`. Zero overhead when disabled.

Works with **any** AdonisJS frontend: Edge templates, Inertia + React, Inertia + Vue, or API-only apps that render HTML.

![adonis-debugbar screenshot](https://raw.githubusercontent.com/imsyedabdullah/adonis-debugbar/master/public/images/adonis-debugbar-queries.png)

## Features

- **Timeline** — Request received → Response sent with high-resolution timing, custom markers, and named measures
- **SQL queries** — every query with SQL, bindings, duration, and one-click EXPLAIN ANALYZE (PostgreSQL, MySQL, SQLite)
- **Route info** — matched pattern, handler class, and full middleware chain
- **Session** — session ID and stored key-value snapshot
- **Request** — headers, query string, and parsed body
- **Views** — Inertia component name and props for every render in the request
- **Console** — `console.log`, `warn`, and `error` calls captured automatically with file/line location
- **Messages** — manual logging via `Debugbar.log(...)`, `.warn(...)`, `.error(...)`
- **Exceptions** — caught exceptions recorded via `Debugbar.addException(e)`
- **Markers** — `Debugbar.addMarker(label)` pins a named point on the timeline ruler
- **Measures** — `Debugbar.startMeasure(label)` / `Debugbar.stopMeasure(label)` spans shown as offset bars

## Requirements

| Dependency | Version |
|---|---|
| Node.js | ≥ 20 |
| `@adonisjs/core` | `^6.0.0 \|\| ^7.0.0` |
| `@adonisjs/lucid` | optional — enables SQL query collection |
| `@adonisjs/session` | optional — enables session snapshot |

No React, no Vue, no other frontend framework required.

## Installation

```bash
npm install --save-dev adonis-debugbar
```

> Install as a dev dependency — the debugbar is a development tool and should not run in production.

## Setup

### 1 — Register the provider

In `adonisrc.ts`, add the provider to the `providers` array:

```ts
providers: [
  // ...existing providers
  () => import('adonis-debugbar/provider'),
]
```

The provider exits immediately when `DEBUG_BAR` is not `'true'`, so it is safe to register unconditionally.

### 2 — Register the middleware

Add `DebugbarMiddleware` as the **first** entry in `server.use(...)` so it wraps the entire request — including other middleware timing.

```ts
// start/kernel.ts
server.use([
  () => import('adonis-debugbar/middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  // ...rest of your server middleware
])
```

### 3 — Enable via environment variable

```env
# .env
DEBUG_BAR=true
```

The middleware and provider both check `process.env.DEBUG_BAR`. When absent or any value other than `'true'`, all instrumentation is bypassed — no allocations, no listeners, no routes registered.

> **Never set `DEBUG_BAR=true` in production.** The ring buffer holds the last 100 requests in memory and the `/__debugbar/*` routes have no authentication.

### 4 — Add the script tag

Add this script anywhere in your HTML layout (Edge template, Inertia root template, etc.):

```html
  @if(process.env.DEBUG_BAR === 'true')
  <script src="/__debugbar/static/debugbar.js"></script>
  @end
```

The route is only registered when `DEBUG_BAR=true`. When disabled, the request 404s silently — safe to leave unconditional in any environment.

That's it. The debugbar will appear at the bottom of every page.

---

## Debugbar API

Import `Debugbar` in any controller, service, or middleware:

```ts
import { Debugbar } from 'adonis-debugbar'
```

### Messages

```ts
Debugbar.log('Loaded user', user)
Debugbar.warn('Cache miss', { key })
Debugbar.error('Charge failed', { orderId, code: err.code })
```

Accepts any number of arguments of any type. Strings are shown inline; objects and arrays render as expandable JSON blocks in the **Messages** tab.

### Exceptions

For caught exceptions, record them manually:

```ts
try {
  await riskyOperation()
} catch (e) {
  Debugbar.addException(e)
  // handle gracefully — the request continues
}
```

To capture all unhandled exceptions, add to `app/exceptions/handler.ts`:

```ts
async report(error: unknown, ctx: HttpContext) {
  Debugbar.addException(error)
  return super.report(error, ctx)
}
```

### Timeline markers

Pin a named point in time relative to the start of the request:

```ts
Debugbar.addMarker('Auth complete')
Debugbar.addMarker('Cache warm')
```

### Timeline measures

Measure a named span:

```ts
Debugbar.startMeasure('pdf')
await generatePdf(data)
Debugbar.stopMeasure('pdf')
```

Measures appear as labelled bars below the main timeline, offset from the request start. Unclosed measures display an **OPEN** badge.

### View recording

Inertia responses are detected automatically from the response body. For Edge templates or other renderers, record manually:

```ts
Debugbar.addView('Dashboard/Index', props, ctx.request.url(true))
```

---

## How it works

1. `DebugbarMiddleware` creates a `RequestData` entry per request, stores it in `AsyncLocalStorage`, and attaches `X-Debugbar-Id` to the response header
2. The Lucid `db:query` event listener appends query records to the current request's store — no polling, no global state
3. On response, the middleware finalises timing, resolves route info and session, then pushes the entry to an in-memory ring buffer (last 100 requests, FIFO eviction)
4. `DebugbarProvider` registers routes consumed by the UI:
   - `GET /__debugbar/static/debugbar.js` — the self-contained UI bundle (Preact, ~85kb)
   - `GET /__debugbar/requests/:id` — full detail for one request
   - `POST /__debugbar/explain` — run EXPLAIN on a single recorded query
   - `POST /__debugbar/explain-all` — run EXPLAIN on every query in a request
5. The UI bundle patches `fetch` and `XMLHttpRequest` at load time to intercept `X-Debugbar-Id` response headers and load the corresponding request data automatically

---

## TypeScript

All types are exported from the main entry point:

```ts
import type {
  RequestData,
  QueryRecord,
  TimelineEntry,
  TimelineMarker,
  MeasureRecord,
  RouteInfo,
  SessionInfo,
  RequestInfo,
  QueriesInfo,
  TimelineInfo,
  MessageRecord,
  ExceptionRecord,
  ViewRecord,
  LogLevel,
  DbClient,
  ExplainTimings,
  ExplainResult,
} from 'adonis-debugbar'
```

---

## Development (this package)

```bash
# Build the UI bundle + backend
pnpm build

# Watch mode for the UI bundle (run alongside pnpm dev in the host app)
pnpm dev:ui

# Type check backend only
pnpm typecheck

# Tests
pnpm test
```
