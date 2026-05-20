import { useCallback, useState } from 'preact/compat';
import { s } from '../styles';
import { CopyButton } from '../CopyButton';
import type { SessionInfo } from '../../types';

interface Props {
  session: SessionInfo | null;
}

function ValueCell({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);

  if (value === null) return <span style={{ color: s.textMuted, fontStyle: 'italic' }}>null</span>;
  if (value === undefined)
    return <span style={{ color: s.textMuted, fontStyle: 'italic' }}>undefined</span>;
  if (typeof value === 'boolean')
    return <span style={{ color: s.purple, fontFamily: 'monospace' }}>{String(value)}</span>;
  if (typeof value === 'number')
    return <span style={{ color: s.blue, fontFamily: 'monospace' }}>{String(value)}</span>;

  if (typeof value === 'object') {
    const json = JSON.stringify(value, null, 2);
    const preview = JSON.stringify(value);
    const isLong = preview.length > 60;

    return (
      <span>
        <button
          onClick={() => setOpen(!open)}
          style={{
            fontSize: 11,
            color: s.blue,
            background: s.surface,
            border: `1px solid ${s.border}`,
            borderRadius: 3,
            padding: '1px 6px',
            cursor: 'pointer',
            marginRight: 6,
          }}
        >
          {open ? '▾' : '▸'}{' '}
          {!Array.isArray(value)
            ? `{${Object.keys(value as object).length}}`
            : `[${(value as unknown[]).length}]`}
        </button>
        {!open && isLong && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: s.textSecondary }}>
            {preview.slice(0, 60)}…
          </span>
        )}
        {!open && !isLong && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: s.textSecondary }}>
            {preview}
          </span>
        )}
        {open && (
          <pre
            style={{
              marginTop: 6,
              fontFamily: 'monospace',
              fontSize: 11,
              background: s.codeBg,
              padding: '8px 10px',
              borderRadius: 6,
              border: `1px solid ${s.border}`,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: s.codeColor,
              lineHeight: 1.5,
            }}
          >
            {json}
          </pre>
        )}
      </span>
    );
  }

  const str = String(value);
  if (str.length > 80) {
    return (
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.textPrimary }}>
        {str.slice(0, 80)}
        <span style={{ color: s.textMuted }}>…({str.length} chars)</span>
      </span>
    );
  }
  return <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.textPrimary }}>{str}</span>;
}

function MetaChip({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: s.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontFamily: mono ? 'monospace' : 'inherit',
          color: s.textPrimary,
          background: s.codeBg,
          padding: '1px 6px',
          borderRadius: 3,
          border: `1px solid ${s.border}`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const AUTH_KEYS = new Set(['auth_web', 'auth', 'user', 'userId', 'user_id']);
const FLASH_KEYS = new Set(['_flash', 'flash', '__flash']);

function keyBadge(key: string): React.ReactNode | null {
  if (AUTH_KEYS.has(key)) return <Badge color={s.blue}>auth</Badge>;
  if (FLASH_KEYS.has(key)) return <Badge color={s.orange}>flash</Badge>;
  if (key.startsWith('_')) return <Badge color={s.textMuted}>internal</Badge>;
  return null;
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        marginLeft: 6,
        padding: '1px 6px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
        background: color + '1a',
        color,
        verticalAlign: 'middle',
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}

export function SessionPanel({ session }: Props) {
  const getJson = useCallback(() => JSON.stringify(session, null, 2), [session]);

  if (!session) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}>
        No session data available for this request.
      </div>
    );
  }

  const { id, initiated, fresh, data } = session;
  const entries = Object.entries(data);

  return (
    <div>
      {/* Metadata header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          padding: '8px 16px',
          background: s.surface,
          borderBottom: `1px solid ${s.border}`,
        }}
      >
        {id && <MetaChip label="Session ID" value={id} mono />}
        <MetaChip label="Initiated" value={String(initiated)} />
        <MetaChip label="Fresh" value={String(fresh)} />
        <span style={{ fontSize: 12, color: s.textSecondary }}>
          <strong style={{ color: s.textPrimary }}>{entries.length}</strong> keys
        </span>
        <span style={{ flex: 1 }} />
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>

      {entries.length === 0 ? (
        <div
          style={{ padding: '24px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}
        >
          Session initiated but no data stored.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: s.surface, borderBottom: `1px solid ${s.border}` }}>
              <th style={thStyle}>Key</th>
              <th style={thStyle}>Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v], i) => (
              <tr
                key={k}
                style={{
                  borderBottom: `1px solid ${s.border}`,
                  background: i % 2 === 0 ? s.bg : s.surface,
                }}
              >
                <td
                  style={{
                    ...tdStyle,
                    fontFamily: 'monospace',
                    color: s.green,
                    whiteSpace: 'nowrap',
                    width: '35%',
                    verticalAlign: 'top',
                  }}
                >
                  {k}
                  {keyBadge(k)}
                </td>
                <td style={{ ...tdStyle, verticalAlign: 'top' }}>
                  <ValueCell value={v} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: s.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
};
const tdStyle: React.CSSProperties = { padding: '8px 16px' };
