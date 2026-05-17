import React, { useCallback } from 'react'
import type { RouteInfo } from '../../types'
import { s, methodColor } from '../styles'
import { CopyButton } from '../CopyButton'

interface Props { route: RouteInfo | null }

export function RoutePanel({ route }: Props) {
  const getJson = useCallback(() => JSON.stringify(route, null, 2), [route])

  if (!route) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}>
        No route info available.
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
        <span>
          <span style={{
            padding: '1px 6px', borderRadius: 4, fontSize: 11,
            background: methodColor(route.method) + '18',
            color: methodColor(route.method), fontWeight: 700, fontFamily: 'monospace',
            marginRight: 8,
          }}>
            {route.method}
          </span>
          <span style={{ fontFamily: 'monospace', color: s.textPrimary }}>{route.pattern}</span>
          &nbsp;·&nbsp;
          <strong style={{ color: s.textPrimary }}>{route.middleware.length}</strong> middleware
        </span>
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>
      <InfoRow label="Pattern">
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: s.textPrimary }}>{route.pattern}</span>
      </InfoRow>
      <InfoRow label="Method">
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 12,
          background: methodColor(route.method) + '18',
          color: methodColor(route.method), fontWeight: 700, fontFamily: 'monospace',
        }}>
          {route.method}
        </span>
      </InfoRow>
      <InfoRow label="Handler">
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.purple }}>{route.handler || '—'}</span>
      </InfoRow>
      <InfoRow label="Middleware" last>
        {route.middleware.length === 0 ? (
          <span style={{ color: s.textMuted, fontSize: 12 }}>None</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {route.middleware.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 20, height: 20, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: '50%',
                  background: s.surface, border: `1px solid ${s.border}`,
                  fontSize: 10, color: s.textSecondary, flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.blue }}>{m}</span>
              </div>
            ))}
          </div>
        )}
      </InfoRow>
    </div>
  )
}

function InfoRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: 16, padding: '10px 16px',
      borderBottom: last ? 'none' : `1px solid ${s.border}`,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 100, flexShrink: 0,
        fontSize: 11, fontWeight: 600, color: s.textSecondary,
        textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: 3,
      }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13 }}>{children}</div>
    </div>
  )
}
