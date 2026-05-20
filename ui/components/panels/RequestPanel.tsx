import { useCallback, useState } from 'preact/compat';
import type { DebugbarData } from '../../types';
import { s, statusColor, methodColor } from '../styles';
import { CopyButton } from '../CopyButton';

interface Props {
  data: DebugbarData;
}

const MASK = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token']);

export function RequestPanel({ data }: Props) {
  const [showBody, setShowBody] = useState(false);
  const { headers, query, body } = data.request;
  const getJson = useCallback(() => JSON.stringify(data.request, null, 2), [data.request]);
  const status = data.status;
  const hasBody = body !== null && body !== undefined && body !== '';

  return (
    <div>
      {/* Summary strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: s.surface,
          borderBottom: `1px solid ${s.border}`,
          fontSize: 13,
        }}
      >
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: methodColor(data.method) + '18',
            color: methodColor(data.method),
            fontWeight: 700,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          {data.method}
        </span>
        <span style={{ fontFamily: 'monospace', color: s.textPrimary, flexShrink: 0 }}>
          {data.url}
        </span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 4,
            background: statusColor(status) + '18',
            color: statusColor(status),
          }}
        >
          {status}
        </span>
        <span style={{ flex: 1 }} />
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>

      <div style={{ padding: '0 0 8px' }}>
        {Object.keys(query).length > 0 && (
          <Section title="Query Parameters">
            <KVTable data={query as Record<string, string>} />
          </Section>
        )}

        {hasBody && (
          <Section title="Request Body">
            <button onClick={() => setShowBody(!showBody)} style={toggleBtn}>
              {showBody ? '▾ Hide' : '▸ Show'} body
            </button>
            {showBody && (
              <pre style={codeBlock}>
                {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
              </pre>
            )}
          </Section>
        )}

        <Section title="Request Headers">
          <KVTable data={headers} mask={MASK} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid ${s.border}` }}>
      <div
        style={{
          padding: '6px 16px',
          background: s.surface,
          fontSize: 11,
          fontWeight: 600,
          color: s.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          borderBottom: `1px solid ${s.border}`,
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function KVTable({ data, mask }: { data: Record<string, unknown>; mask?: Set<string> }) {
  const entries = Object.entries(data);
  if (!entries.length) {
    return <div style={{ padding: '8px 16px', color: s.textMuted, fontSize: 12 }}>-</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} style={{ borderBottom: `1px solid ${s.border}` }}>
            <td
              style={{
                padding: '6px 16px',
                color: s.blue,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                width: '35%',
                verticalAlign: 'top',
              }}
            >
              {k}
            </td>
            <td
              style={{
                padding: '6px 16px',
                color: s.textPrimary,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {mask?.has(k.toLowerCase()) ? (
                <span style={{ color: s.textMuted }}>•••••••</span>
              ) : (
                String(v)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const codeBlock: React.CSSProperties = {
  margin: '8px 16px',
  fontFamily: 'monospace',
  fontSize: 12,
  background: s.codeBg,
  padding: '10px 14px',
  borderRadius: 6,
  border: `1px solid ${s.border}`,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: s.codeColor,
  lineHeight: 1.6,
  maxHeight: 200,
  overflowY: 'auto',
};

const toggleBtn: React.CSSProperties = {
  margin: '8px 16px 4px',
  fontSize: 12,
  color: s.blue,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
};
