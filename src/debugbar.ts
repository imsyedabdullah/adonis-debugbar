import { storage } from './store.ts'
import { captureCallSite } from './callsite.ts'
import type { LogLevel } from './types.ts'

function nowMs(): number {
  const entry = storage.getStore()
  return entry ? Date.now() - entry.timestamp : 0
}

function logArgs(level: LogLevel, args: unknown[]): void {
  const entry = storage.getStore()
  if (!entry) return
  entry.messages.push({ level, args, timestamp: Date.now(), location: captureCallSite() })
}

export const Debugbar = {
  /** Log any number of values. */
  log: (...args: unknown[]): void => logArgs('info', args),
  /** Log any number of values at warn level. */
  warn: (...args: unknown[]): void => logArgs('warn', args),
  /** Log any number of values at error level. */
  error: (...args: unknown[]): void => logArgs('error', args),

  /** Manually record a caught exception. */
  addException: (err: unknown): void => {
    const entry = storage.getStore()
    if (!entry) return
    const e = err instanceof Error ? err : new Error(String(err))
    entry.exceptions.push({
      name: e.name,
      message: e.message,
      stack: e.stack ?? null,
      timestamp: Date.now(),
    })
  },

  /** Add a named marker pin on the timeline ruler (shown as a vertical tick). */
  addMarker: (label: string): void => {
    const entry = storage.getStore()
    if (!entry) return
    entry.timeline.markers.push({ label, ms: nowMs() })
  },

  /** Start a named measurement block. */
  startMeasure: (label: string): void => {
    const entry = storage.getStore()
    if (!entry) return
    entry.timeline.measures.push({ label, startMs: nowMs(), endMs: null })
  },

  /** Stop a previously started measurement. Matches by label (first open one). */
  stopMeasure: (label: string): void => {
    const entry = storage.getStore()
    if (!entry) return
    const measure = [...entry.timeline.measures].reverse().find((m) => m.label === label && m.endMs === null)
    if (measure) measure.endMs = nowMs()
  },
}
