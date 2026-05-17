import React, { useCallback, useState } from 'react'
import type { QueryRecord, ExplainResult, ExplainTimings } from '../../types'
import { s, durationColor } from '../styles'
import { CopyButton } from '../CopyButton'

interface Props {
  queries: QueryRecord[]
  requestId: string
  baseUrl: string
}

const SQL_KW = /\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|RETURNING|WITH|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|UNION|ALL|EXCEPT|INTERSECT)\b/gi

function SqlHighlight({ sql }: { sql: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  const re = new RegExp(SQL_KW.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(sql)) !== null) {
    if (m.index > last) parts.push(sql.slice(last, m.index))
    parts.push(
      <span key={m.index} style={{ color: s.codeKw, fontWeight: 600 }}>
        {m[0].toUpperCase()}
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < sql.length) parts.push(sql.slice(last))
  return <>{parts}</>
}

function formatSql(sql: string): string {
  return sql
    .replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|AND|OR|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|RETURNING|WITH|UNION)\b/gi,
      (m) => `\n${m.toUpperCase()}`)
    .trim()
}

function TimingStat({ label, value, color, hint }: { label: string; value: string; color: string; hint: string }) {
  return (
    <div style={{ padding: '7px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 9, color: s.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: 9, color: s.textMuted, marginTop: 1 }}>{hint}</div>
    </div>
  )
}

// PostgreSQL-specific rendering

const SCAN_COLORS: [RegExp, string][] = [
  [/Index Only Scan/i,  '#1a7f37'],
  [/Index Scan/i,       '#0969da'],
  [/Bitmap Heap Scan/i, '#8250df'],
  [/Bitmap Index Scan/i,'#8250df'],
  [/Seq Scan/i,         '#cf222e'],
]

function classifyLine(line: string): { bg: string; scanColor: string | null } {
  for (const [re, color] of SCAN_COLORS) {
    if (re.test(line)) return { bg: color + '10', scanColor: color }
  }
  if (/Execution Time:/i.test(line) || /Planning Time:/i.test(line))
    return { bg: s.blue + '10', scanColor: null }
  if (/Buffers:/i.test(line))
    return { bg: s.purple + '08', scanColor: null }
  return { bg: 'transparent', scanColor: null }
}

function PlanLineContent({ line }: { line: string }) {
  for (const [re, color] of SCAN_COLORS) {
    if (re.test(line)) {
      const parts: React.ReactNode[] = []
      let pos = 0
      const g = new RegExp(re.source, 'gi')
      let m: RegExpExecArray | null
      while ((m = g.exec(line)) !== null) {
        if (m.index > pos) parts.push(line.slice(pos, m.index))
        parts.push(<span key={m.index} style={{ color, fontWeight: 700 }}>{m[0]}</span>)
        pos = m.index + m[0].length
      }
      if (pos < line.length) parts.push(line.slice(pos))
      return <>{parts}</>
    }
  }
  const NUM = /((?:cost|actual time|rows|width|Execution Time|Planning Time)\s*=?\s*)([\d.]+(?:\.\.\d+)?)/gi
  const parts: React.ReactNode[] = []
  let pos = 0
  let m: RegExpExecArray | null
  while ((m = NUM.exec(line)) !== null) {
    if (m.index > pos) parts.push(line.slice(pos, m.index))
    parts.push(<span key={m.index} style={{ color: s.textSecondary }}>{m[1]}</span>)
    parts.push(<span key={m.index + 'v'} style={{ color: s.blue, fontWeight: 600 }}>{m[2]}</span>)
    pos = m.index + m[0].length
  }
  if (pos < line.length) parts.push(line.slice(pos))
  return <>{parts}</>
}

function TimingStatDivider() {
  return <div style={{ width: 1, background: s.border, flexShrink: 0 }} />
}

function ExplainTimingStats({ timings }: { timings: ExplainTimings }) {
  return (
    <>
      <TimingStat
        label="Driver (wall clock)"
        value={`${timings.driverMs.toFixed(2)} ms`}
        color={durationColor(timings.driverMs)}
        hint="pool wait + serialization + network + data transfer"
      />
      {timings.executionMs !== null && (
        <>
          <TimingStatDivider />
          <TimingStat
            label="PostgreSQL execution"
            value={`${timings.executionMs.toFixed(3)} ms`}
            color={durationColor(timings.executionMs)}
            hint="server-side only — what EXPLAIN measures"
          />
        </>
      )}
      {timings.planningMs !== null && (
        <>
          <TimingStatDivider />
          <TimingStat
            label="Planning"
            value={`${timings.planningMs.toFixed(3)} ms`}
            color={s.textSecondary}
            hint="time spent by the query planner"
          />
        </>
      )}
      {timings.overheadMs !== null && (
        <>
          <TimingStatDivider />
          <TimingStat
            label="Driver overhead"
            value={`~${timings.overheadMs.toFixed(1)} ms`}
            color={s.textMuted}
            hint="connection pool + Node.js serialization + loopback I/O"
          />
        </>
      )}
    </>
  )
}

function ExplainPlanPg({ plan, timings }: { plan: string; timings: ExplainTimings }) {
  const lines = plan.split('\n')

  return (
    <div style={{
      marginTop: 10, fontFamily: 'monospace', fontSize: 11,
      background: s.codeBg, border: `1px solid ${s.border}`,
      borderRadius: 6, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        background: s.surface, borderBottom: `1px solid ${s.border}`,
      }}>
        <ExplainTimingStats timings={timings} />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>
          <CopyButton getData={() => plan} label="Copy" />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        {lines.map((line, i) => {
          const { bg, scanColor } = classifyLine(line)
          const indent = line.match(/^(\s*)/)?.[1].length ?? 0
          return (
            <div
              key={i}
              style={{
                padding: '2px 10px',
                background: bg,
                borderLeft: scanColor ? `3px solid ${scanColor}` : '3px solid transparent',
                whiteSpace: 'pre',
                lineHeight: 1.6,
                color: s.codeColor,
              }}
            >
              {' '.repeat(indent)}<PlanLineContent line={line.trimStart()} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// MySQL tabular EXPLAIN rendering

const MYSQL_TYPE_COLORS: Record<string, string> = {
  ALL: s.red, index: '#d97706', range: s.blue,
  ref: '#0969da', eq_ref: s.green, const: s.green, system: s.green,
}

function ExplainTableMysql({ rows, timings }: { rows: Record<string, unknown>[]; timings: ExplainTimings }) {
  if (!rows.length) return null
  const cols = Object.keys(rows[0])
  return (
    <div style={{ marginTop: 10, border: `1px solid ${s.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: s.surface, borderBottom: `1px solid ${s.border}`,
      }}>
        <TimingStat
          label="Driver (wall clock)"
          value={`${timings.driverMs.toFixed(2)} ms`}
          color={durationColor(timings.driverMs)}
          hint="wall-clock time including pool + I/O"
        />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>
          <CopyButton getData={() => JSON.stringify(rows, null, 2)} label="Copy" />
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ background: s.surface, borderBottom: `1px solid ${s.border}` }}>
              {cols.map((c) => (
                <th key={c} style={{
                  padding: '5px 10px', textAlign: 'left',
                  color: s.textSecondary, fontWeight: 600,
                  whiteSpace: 'nowrap', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5,
                }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${s.border}`, background: i % 2 === 0 ? s.bg : s.surface }}>
                {cols.map((c) => {
                  const val = row[c] == null ? 'NULL' : String(row[c])
                  const color = c === 'type' ? (MYSQL_TYPE_COLORS[val] ?? s.textPrimary)
                    : c === 'Extra' ? s.textSecondary
                    : s.textPrimary
                  return (
                    <td key={c} style={{ padding: '5px 10px', color, whiteSpace: 'nowrap' }}>
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// SQLite / unknown plain-text rendering

function ExplainTextSimple({ plan, timings, dbClient }: { plan: string; timings: ExplainTimings; dbClient: string }) {
  return (
    <div style={{ marginTop: 10, border: `1px solid ${s.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: s.surface, borderBottom: `1px solid ${s.border}`,
      }}>
        <TimingStat
          label="Driver (wall clock)"
          value={`${timings.driverMs.toFixed(2)} ms`}
          color={durationColor(timings.driverMs)}
          hint="wall-clock time including pool + I/O"
        />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
          <span style={{ fontSize: 10, color: s.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{dbClient}</span>
          <CopyButton getData={() => plan} label="Copy" />
        </div>
      </div>
      <pre style={{
        margin: 0, padding: '10px 14px',
        fontFamily: 'monospace', fontSize: 11,
        background: s.codeBg, color: s.codeColor,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
      }}>
        {plan}
      </pre>
    </div>
  )
}

function ExplainOutput({ result }: { result: ExplainResult }) {
  if (!result.supported) {
    return (
      <div style={{
        marginTop: 10, padding: '12px 14px',
        background: s.yellow + '20', border: `1px solid ${s.yellow}60`,
        borderRadius: 6, fontSize: 12, color: s.textPrimary,
      }}>
        <strong style={{ color: s.yellow }}>EXPLAIN not available for {result.dbClient}</strong>
        {result.note && (
          <div style={{ marginTop: 4, color: s.textSecondary, fontSize: 11 }}>{result.note}</div>
        )}
      </div>
    )
  }

  return (
    <>
      {result.note && (
        <div style={{
          marginTop: 10, marginBottom: -2, padding: '6px 12px',
          background: s.blue + '12', border: `1px solid ${s.blue}40`,
          borderRadius: 6, fontSize: 11, color: s.textSecondary,
        }}>
          {result.note}
        </div>
      )}
      {result.dbClient === 'pg' && typeof result.plan === 'string' && (
        <ExplainPlanPg plan={result.plan} timings={result.timings} />
      )}
      {(result.dbClient === 'mysql' || result.dbClient === 'mysql2') && Array.isArray(result.plan) && (
        <ExplainTableMysql rows={result.plan as Record<string, unknown>[]} timings={result.timings} />
      )}
      {(result.dbClient === 'sqlite3' || result.dbClient === 'better-sqlite3' || result.dbClient === 'unknown') && typeof result.plan === 'string' && (
        <ExplainTextSimple plan={result.plan} timings={result.timings} dbClient={result.dbClient} />
      )}
    </>
  )
}

type ExplainState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: ExplainResult }
  | { status: 'error'; message: string }

type CopyExplainState = 'idle' | 'loading' | 'copied' | 'error'

function queriesToJson(queries: QueryRecord[]): string {
  return JSON.stringify(
    queries.map((q, i) => ({
      index: i + 1,
      query: q.sql,
      bindings: q.bindings,
      time_ms: Number(q.duration.toFixed(2)),
      error: q.error ?? false,
    })),
    null, 2
  )
}

function queriesToJsonWithExplain(
  queries: QueryRecord[],
  explainMap: Record<number, ExplainResult | null>
): string {
  return JSON.stringify(
    queries.map((q, i) => {
      const explain = explainMap[i] ?? null
      return {
        index: i + 1,
        query: q.sql,
        bindings: q.bindings,
        time_ms: Number(q.duration.toFixed(2)),
        error: q.error ?? false,
        explain: explain
          ? {
              supported: explain.supported,
              dbClient: explain.dbClient,
              plan: explain.plan,
              timings: explain.timings,
              ...(explain.note ? { note: explain.note } : {}),
            }
          : null,
      }
    }),
    null, 2
  )
}

export function Queries({ queries, requestId, baseUrl }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [explains, setExplains] = useState<Record<number, ExplainState>>({})
  const [copyExplainState, setCopyExplainState] = useState<CopyExplainState>('idle')
  const getCsv = useCallback(() => queriesToJson(queries), [queries])

  const copyWithExplain = useCallback(async () => {
    try {
      const allCached = queries.every((_, i) => explains[i]?.status === 'done')

      if (allCached) {
        const explainMap: Record<number, ExplainResult | null> = {}
        for (let i = 0; i < queries.length; i++) {
          const st = explains[i]
          explainMap[i] = st?.status === 'done' ? st.result : null
        }
        await navigator.clipboard.writeText(queriesToJsonWithExplain(queries, explainMap))
        setCopyExplainState('copied')
      } else {
        setCopyExplainState('loading')
        const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
        const res = await fetch(`${baseUrl}/__debugbar/explain-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(xsrf),
          },
          body: JSON.stringify({ requestId }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const entries = await res.json() as Array<{ index: number; result?: ExplainResult; error?: string }>

        setExplains((prev) => {
          const next = { ...prev }
          for (const e of entries) {
            if (e.result) next[e.index] = { status: 'done', result: e.result }
            else if (e.error) next[e.index] = { status: 'error', message: e.error }
          }
          return next
        })

        const explainMap: Record<number, ExplainResult | null> = {}
        for (const e of entries) {
          explainMap[e.index] = e.result ?? null
        }
        await navigator.clipboard.writeText(queriesToJsonWithExplain(queries, explainMap))
        setCopyExplainState('copied')
      }
    } catch {
      setCopyExplainState('error')
    }
    setTimeout(() => setCopyExplainState('idle'), 1800)
  }, [queries, explains, requestId, baseUrl])

  const runExplain = useCallback(async (index: number) => {
    setExplains((prev) => ({ ...prev, [index]: { status: 'loading' } }))
    try {
      const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
      const res = await fetch(`${baseUrl}/__debugbar/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(xsrf),
        },
        body: JSON.stringify({ requestId, queryIndex: index }),
      })
      const data = await res.json() as ExplainResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setExplains((prev) => ({ ...prev, [index]: { status: 'done', result: data } }))
    } catch (err) {
      setExplains((prev) => ({ ...prev, [index]: { status: 'error', message: String(err) } }))
    }
  }, [requestId, baseUrl])

  if (!queries.length) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}>
        No queries recorded for this request.
      </div>
    )
  }

  const totalMs = queries.reduce((a, q) => a + q.duration, 0)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: s.surface,
        borderBottom: `1px solid ${s.border}`, fontSize: 12, color: s.textSecondary,
      }}>
        <span>
          <strong style={{ color: s.textPrimary }}>{queries.length}</strong> queries &nbsp;·&nbsp;
          Total: <strong style={{ color: durationColor(totalMs) }}>{totalMs.toFixed(2)} ms</strong>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <CopyButton getData={getCsv} label="Copy JSON" />
          <button
            onClick={copyWithExplain}
            disabled={copyExplainState === 'loading'}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              background: copyExplainState === 'copied' ? s.green + '22'
                : copyExplainState === 'error' ? s.red + '22'
                : s.surface,
              border: `1px solid ${
                copyExplainState === 'copied' ? s.green
                : copyExplainState === 'error' ? s.red
                : s.border
              }`,
              borderRadius: 3,
              cursor: copyExplainState === 'loading' ? 'default' : 'pointer',
              color: copyExplainState === 'copied' ? s.green
                : copyExplainState === 'error' ? s.red
                : copyExplainState === 'loading' ? s.textMuted
                : s.textSecondary,
              fontFamily: 'monospace',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {copyExplainState === 'loading' ? 'Running EXPLAIN…'
              : copyExplainState === 'copied' ? '✓ Copied'
              : copyExplainState === 'error' ? 'Failed'
              : 'Copy with Explain'}
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: s.surface, borderBottom: `1px solid ${s.border}` }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>SQL</th>
            <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>Time (ms)</th>
          </tr>
        </thead>
        <tbody>
          {queries.map((q, i) => {
            const explainState: ExplainState = explains[i] ?? { status: 'idle' }
            return (
              <React.Fragment key={i}>
                <tr
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{
                    borderBottom: `1px solid ${s.border}`,
                    cursor: 'pointer',
                    background: expanded === i ? s.surfaceHover : (i % 2 === 0 ? s.bg : s.surface),
                  }}
                >
                  <td style={{ ...tdStyle, width: 32, color: s.textMuted }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: q.error ? s.red : s.textPrimary }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60vw' }}>
                      <SqlHighlight sql={q.sql} />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: durationColor(q.duration) }}>
                    {q.duration.toFixed(2)}
                  </td>
                </tr>

                {expanded === i && (
                  <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                    <td />
                    <td colSpan={2} style={{ padding: '12px 16px' }}>
                      {/* Formatted SQL */}
                      <pre style={{
                        margin: 0, fontFamily: 'monospace', fontSize: 12,
                        background: s.codeBg, padding: '10px 14px',
                        borderRadius: 6, border: `1px solid ${s.border}`,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        color: s.codeColor, lineHeight: 1.6,
                      }}>
                        <SqlHighlight sql={formatSql(q.sql)} />
                      </pre>

                      {/* Bindings */}
                      {q.bindings.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: s.textSecondary }}>
                          <span style={{ fontWeight: 600 }}>Bindings: </span>
                          <code style={{ fontFamily: 'monospace', color: s.blue }}>
                            {JSON.stringify(q.bindings)}
                          </code>
                        </div>
                      )}

                      {/* Explain button + output */}
                      <div style={{ marginTop: 10 }}>
                        {explainState.status === 'idle' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); runExplain(i) }}
                            style={{
                              fontSize: 11, padding: '3px 10px',
                              background: s.surface, border: `1px solid ${s.border}`,
                              borderRadius: 3, cursor: 'pointer', color: s.blue,
                              fontFamily: 'monospace',
                            }}
                          >
                            ▶ Run EXPLAIN
                          </button>
                        )}

                        {explainState.status === 'loading' && (
                          <span style={{ fontSize: 11, color: s.textMuted, fontFamily: 'monospace' }}>
                            Running EXPLAIN…
                          </span>
                        )}

                        {explainState.status === 'error' && (
                          <div style={{ marginTop: 4, fontSize: 11, color: s.red, fontFamily: 'monospace' }}>
                            {explainState.message}
                            <button
                              onClick={(e) => { e.stopPropagation(); runExplain(i) }}
                              style={{
                                marginLeft: 8, fontSize: 11, padding: '1px 6px',
                                background: 'transparent', border: `1px solid ${s.red}`,
                                borderRadius: 3, cursor: 'pointer', color: s.red,
                              }}
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {explainState.status === 'done' && (
                          <ExplainOutput result={explainState.result} />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 16px', textAlign: 'left',
  fontSize: 11, fontWeight: 600,
  color: s.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6,
}
const tdStyle: React.CSSProperties = { padding: '7px 16px', verticalAlign: 'middle' }
