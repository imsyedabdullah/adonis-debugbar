import React, { useCallback, useState } from 'react'
import { s } from '../styles'
import { CopyButton } from '../CopyButton'
import type { ViewRecord } from '../../types'

function PropValue({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false)

  if (value === null) return <span style={{ color: s.textMuted, fontStyle: 'italic' }}>null</span>
  if (value === undefined) return <span style={{ color: s.textMuted, fontStyle: 'italic' }}>undefined</span>
  if (typeof value === 'boolean') return <span style={{ color: s.purple, fontFamily: 'monospace' }}>{String(value)}</span>
  if (typeof value === 'number') return <span style={{ color: s.blue, fontFamily: 'monospace' }}>{String(value)}</span>
  if (typeof value === 'string') {
    if (value.length > 80) return (
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.textPrimary }}>
        "{value.slice(0, 80)}<span style={{ color: s.textMuted }}>…({value.length} chars)"</span>
      </span>
    )
    return <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.green }}>"{value}"</span>
  }

  if (typeof value === 'object') {
    const isArr = Array.isArray(value)
    const count = isArr ? (value as unknown[]).length : Object.keys(value as object).length
    const json = JSON.stringify(value, null, 2)
    const preview = JSON.stringify(value)
    return (
      <span>
        <button onClick={() => setOpen(!open)} style={{
          fontSize: 11, color: s.blue, background: s.surface,
          border: `1px solid ${s.border}`, borderRadius: 3,
          padding: '1px 6px', cursor: 'pointer', marginRight: 6,
        }}>
          {open ? '▾' : '▸'} {isArr ? `[${count}]` : `{${count}}`}
        </button>
        {!open && <span style={{ fontFamily: 'monospace', fontSize: 11, color: s.textSecondary }}>
          {preview.length > 60 ? preview.slice(0, 60) + '…' : preview}
        </span>}
        {open && (
          <pre style={{
            marginTop: 6, fontFamily: 'monospace', fontSize: 11,
            background: s.codeBg, padding: '8px 10px',
            borderRadius: 6, border: `1px solid ${s.border}`,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: s.codeColor, lineHeight: 1.5,
          }}>
            {json}
          </pre>
        )}
      </span>
    )
  }

  return <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(value)}</span>
}

function ViewCard({ view, index }: { view: ViewRecord; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const propEntries = Object.entries(view.props)

  return (
    <div style={{ borderBottom: `1px solid ${s.border}` }}>
      {/* Component header */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', cursor: 'pointer',
          background: open ? s.surface : s.bg,
          userSelect: 'none',
        }}
        onMouseEnter={(e) => !open && (e.currentTarget.style.background = s.surfaceHover)}
        onMouseLeave={(e) => !open && (e.currentTarget.style.background = s.bg)}
      >
        <span style={{ fontSize: 10, color: s.textMuted }}>{open ? '▾' : '▸'}</span>
        <div style={{ flex: 1 }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: s.blue,
          }}>
            {view.component}
          </span>
          {view.url && (
            <span style={{ marginLeft: 10, fontSize: 11, color: s.textMuted, fontFamily: 'monospace' }}>
              {view.url}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 11, color: s.textSecondary, flexShrink: 0,
          background: s.border, padding: '1px 8px', borderRadius: 10,
        }}>
          {propEntries.length} props
        </span>
      </div>

      {/* Props table */}
      {open && (
        propEntries.length === 0 ? (
          <div style={{ padding: '12px 16px', color: s.textMuted, fontSize: 12 }}>No props.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: s.surface, borderBottom: `1px solid ${s.border}` }}>
                <th style={thStyle}>Prop</th>
                <th style={thStyle}>Value</th>
              </tr>
            </thead>
            <tbody>
              {propEntries.map(([key, val], i) => (
                <tr key={key} style={{ borderBottom: `1px solid ${s.border}`, background: i % 2 === 0 ? s.bg : s.surface }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: s.green, whiteSpace: 'nowrap', width: '30%', verticalAlign: 'top' }}>
                    {key}
                  </td>
                  <td style={{ ...tdStyle, verticalAlign: 'top' }}>
                    <PropValue value={val} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}

interface Props { views: ViewRecord[] }

export function ViewsPanel({ views }: Props) {
  const getJson = useCallback(() => JSON.stringify(views, null, 2), [views])

  if (!views.length) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}>
        No views captured for this request.{' '}
        <span style={{ display: 'block', marginTop: 8, fontSize: 11 }}>
          Inertia XHR responses are auto-detected. For full-page loads, call{' '}
          <code style={{ fontFamily: 'monospace', background: s.codeBg, padding: '1px 4px', borderRadius: 3 }}>
            Debugbar.addView(component, props)
          </code>{' '}
          in your controller.
        </span>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: s.surface,
        borderBottom: `1px solid ${s.border}`, fontSize: 12, color: s.textSecondary,
      }}>
        <span><strong style={{ color: s.textPrimary }}>{views.length}</strong> view{views.length !== 1 ? 's' : ''} rendered</span>
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>
      {views.map((v, i) => <ViewCard key={i} view={v} index={i} />)}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 16px', textAlign: 'left',
  fontSize: 11, fontWeight: 600,
  color: s.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6,
}
const tdStyle: React.CSSProperties = { padding: '8px 16px' }
