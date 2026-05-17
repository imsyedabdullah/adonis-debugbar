import { useState, useEffect, useCallback, useRef } from 'react'
import { subscribeToCaptures, getInitialPageId, registerRequest } from '../interceptors'
import type { CapturedRequest, DebugbarData } from '../types'

const MAX = 50

export function useDebugbarRequests(baseUrl = '') {
  const [requests, setRequests] = useState<CapturedRequest[]>([])
  const initialLoadDone = useRef(false)

  useEffect(() => {
    const unsubscribe = subscribeToCaptures((req) => {
      setRequests((prev) => [req, ...prev].slice(0, MAX))
    })
    return unsubscribe
  }, [])

  // Register the initial page load (browser navigation — not interceptable via fetch/XHR).
  // Reads _debugbarId from the Inertia page data embedded in the DOM, fetches the full
  // request record from the server, and dispatches it into the same capture buffer.
  useEffect(() => {
    if (initialLoadDone.current) return
    const id = getInitialPageId()
    if (!id) return

    initialLoadDone.current = true

    fetch(`${baseUrl}/__debugbar/requests/${id}`)
      .then((r) => (r.ok ? (r.json() as Promise<DebugbarData>) : null))
      .then((data) => {
        if (!data) return
        registerRequest({
          id: data.id,
          method: data.method,
          url: data.url,
          status: data.status,
          duration: data.timeline.total,
          timestamp: data.timestamp,
        })
      })
      .catch(() => {})
  }, [baseUrl])

  const clear = useCallback(() => setRequests([]), [])

  return { requests, clear }
}
