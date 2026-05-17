export interface CapturedRequest {
  uid: number
  id: string
  method: string
  url: string
  status: number
  duration: number
  timestamp: number
}

export interface QueryRecord {
  sql: string
  bindings: unknown[]
  duration: number
  timestamp: number
  error?: boolean
}

export interface TimelineEntry {
  label: string
  ms: number
}

export interface TimelineMarker {
  label: string
  ms: number
}

export interface MeasureRecord {
  label: string
  startMs: number
  endMs: number | null
}

export interface RouteInfo {
  pattern: string
  method: string
  handler: string
  middleware: string[]
}

export interface SessionInfo {
  id: string | null
  initiated: boolean
  fresh: boolean
  data: Record<string, unknown>
}

export type LogLevel = 'info' | 'warn' | 'error'

export interface MessageRecord {
  level: LogLevel
  args: unknown[]
  timestamp: number
  location?: string | null
}

export interface ExceptionRecord {
  name: string
  message: string
  stack: string | null
  timestamp: number
}

export interface ConsoleRecord {
  level: LogLevel
  args: unknown[]
  timestamp: number
  source: 'backend' | 'frontend'
  location?: string | null
}

export interface InertiaPageSnapshot {
  component: string
  props: Record<string, unknown>
  url: string
  version: string | null
}

export interface QueriesInfo {
  count: number
  totalDuration: number
  entries: QueryRecord[]
}

export interface TimelineInfo {
  total: number
  entries: TimelineEntry[]
  markers: TimelineMarker[]
  measures: MeasureRecord[]
}

export interface RequestInfo {
  headers: Record<string, string>
  query: Record<string, unknown>
  body: unknown
}

export type DbClient = 'pg' | 'mysql' | 'mysql2' | 'sqlite3' | 'better-sqlite3' | 'mssql' | 'oracledb' | 'unknown'

export interface ExplainTimings {
  driverMs: number
  executionMs: number | null
  planningMs: number | null
  overheadMs: number | null
}

export interface ExplainResult {
  dbClient: DbClient
  plan: string | Record<string, unknown>[]
  supported: boolean
  note?: string
  timings: ExplainTimings
}

export interface DebugbarData {
  // Quick-access (used by request selector)
  id: string
  method: string
  url: string
  status: number
  timestamp: number

  // Tab-grouped
  messages: MessageRecord[]
  consoleLogs: ConsoleRecord[]
  timeline: TimelineInfo
  queries: QueriesInfo
  exceptions: ExceptionRecord[]
  request: RequestInfo
  route: RouteInfo | null
  session: SessionInfo | null
}
