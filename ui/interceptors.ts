import type { CapturedRequest } from './types'

type Handler = (req: CapturedRequest) => void

let _uid = 0

const handlers = new Set<Handler>()
// Buffer requests that arrive before any subscriber has registered
const buffer: CapturedRequest[] = []
const BUFFER_MAX = 100

function dispatch(req: CapturedRequest): void {
  buffer.push(req)
  if (buffer.length > BUFFER_MAX) buffer.shift()
  handlers.forEach((h) => h(req))
}

/** Subscribe to captured requests. Replays the buffer on first call. */
export function subscribeToCaptures(handler: Handler): () => void {
  buffer.forEach((req) => handler(req))
  handlers.add(handler)
  return () => handlers.delete(handler)
}

/** Register a request that was captured outside the fetch/XHR interceptors (e.g. initial page load). */
export function registerRequest(req: Omit<CapturedRequest, 'uid'>): void {
  dispatch({ uid: ++_uid, ...req })
}

/** Read the debugbar request ID embedded in the Inertia page data for the initial page load. */
export function getInitialPageId(): string | null {
  if (typeof document === 'undefined') return null
  try {
    const appEl = document.getElementById('app')
    const page = JSON.parse(appEl?.dataset.page ?? '{}')
    return typeof page.props?._debugbarId === 'string' ? page.props._debugbarId : null
  } catch {
    return null
  }
}

function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return (input as Request).url
}

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof input === 'object' && 'method' in input) return (input as Request).method.toUpperCase()
  return 'GET'
}

// Install interceptors once at module evaluation time (browser only).
// Module-level installation ensures requests made in child component effects
// are captured before the Debugbar hook's own effect has a chance to subscribe.
if (typeof window !== 'undefined') {
  // --- fetch ---
  const _fetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = extractUrl(input)
    const method = extractMethod(input, init)

    if (url.includes('/__debugbar/')) return _fetch(input, init)

    const start = performance.now()
    const response = await _fetch(input, init)
    const duration = performance.now() - start

    const id = response.headers.get('X-Debugbar-Id')
    if (id) dispatch({ uid: ++_uid, id, method, url, status: response.status, duration, timestamp: Date.now() })

    return response
  }

  // --- XMLHttpRequest (used by Axios) ---
  const OriginalXHR = globalThis.XMLHttpRequest

  class PatchedXHR extends OriginalXHR {
    #start = 0
    #method = 'GET'
    #url = ''

    open(
      method: string,
      url: string,
      async = true,
      user?: string | null,
      password?: string | null
    ): void {
      this.#method = method.toUpperCase()
      this.#url = url
      super.open(method, url, async, user ?? null, password ?? null)
    }

    send(body?: Document | XMLHttpRequestBodyInit | null): void {
      if (!this.#url.includes('/__debugbar/')) {
        this.#start = performance.now()
        this.addEventListener('loadend', () => {
          const duration = performance.now() - this.#start
          const id = this.getResponseHeader('X-Debugbar-Id')
          if (id) {
            dispatch({
              uid: ++_uid,
              id,
              method: this.#method,
              url: this.#url,
              status: this.status,
              duration,
              timestamp: Date.now(),
            })
          }
        })
      }
      super.send(body)
    }
  }

  // @ts-ignore — intentional prototype replacement
  globalThis.XMLHttpRequest = PatchedXHR
}
