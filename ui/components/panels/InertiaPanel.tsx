import { useCallback, useState } from 'preact/compat';
import { s } from '../styles';
import { CopyButton } from '../CopyButton';
import type { InertiaPageSnapshot } from '../../types';

function PropNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);

  if (value === null) return <span style={{ color: s.textMuted, fontStyle: 'italic' }}>null</span>;
  if (value === undefined)
    return <span style={{ color: s.textMuted, fontStyle: 'italic' }}>undefined</span>;
  if (typeof value === 'boolean') return <span style={{ color: s.purple }}>{String(value)}</span>;
  if (typeof value === 'number') return <span style={{ color: s.blue }}>{String(value)}</span>;
  if (typeof value === 'string')
    return (
      <span style={{ color: s.codeString, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        "{value}"
      </span>
    );

  const isArr = Array.isArray(value);
  const entries = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const bracket = isArr ? ['[', ']'] : ['{', '}'];
  const label = isArr ? `Array(${entries.length})` : `{${entries.length} keys}`;

  if (entries.length === 0)
    return (
      <span style={{ color: s.textMuted }}>
        {bracket[0]}
        {bracket[1]}
      </span>
    );

  return (
    <span style={{ display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: 11,
          color: s.blue,
          background: 'transparent',
          border: 'none',
          padding: '0 2px',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        {open ? '▾' : '▸'} {label}
      </button>
      {open && (
        <div style={{ marginLeft: 16, borderLeft: `1px solid ${s.border}`, paddingLeft: 8 }}>
          {entries.map(([k, v]) => (
            <div
              key={k}
              style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '1px 0' }}
            >
              <span
                style={{
                  color: s.textSecondary,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {isArr ? k : `"${k}"`}:
              </span>
              <PropNode value={v} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

interface Props {
  snapshot: InertiaPageSnapshot | null;
}

export function InertiaPanel({ snapshot }: Props) {
  const getJson = useCallback(
    () =>
      JSON.stringify(
        snapshot
          ? {
              component: snapshot.component,
              url: snapshot.url,
              version: snapshot.version,
              props: snapshot.props,
            }
          : null,
        null,
        2,
      ),
    [snapshot],
  );

  if (!snapshot) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}>
        No Inertia page data detected.
        <span style={{ display: 'block', marginTop: 8, fontSize: 11 }}>
          Props are read from the{' '}
          <code
            style={{
              fontFamily: 'monospace',
              background: s.codeBg,
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            data-page
          </code>{' '}
          attribute and updated on each Inertia navigation.
        </span>
      </div>
    );
  }

  const { component, url, version, props } = snapshot;
  const propCount = Object.keys(props).length;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: s.surface,
          borderBottom: `1px solid ${s.border}`,
          fontSize: 12,
          color: s.textSecondary,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: s.blue }}>
              {component}
            </span>
          </span>
          <span style={{ fontFamily: 'monospace', color: s.textPrimary }}>{url}</span>
          {version && (
            <span>
              v<span style={{ fontFamily: 'monospace', color: s.textSecondary }}>{version}</span>
            </span>
          )}
          <span>
            <strong style={{ color: s.textPrimary }}>{propCount}</strong> prop
            {propCount !== 1 ? 's' : ''}
          </span>
        </span>
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>

      {/* Props tree */}
      <div style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}>
        {Object.entries(props).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              padding: '4px 0',
              borderBottom: `1px solid ${s.border + '88'}`,
            }}
          >
            <span
              style={{
                color: s.textSecondary,
                fontWeight: 600,
                flexShrink: 0,
                minWidth: 160,
                paddingTop: 1,
              }}
            >
              {key}
            </span>
            <PropNode value={value} depth={0} />
          </div>
        ))}
      </div>
    </div>
  );
}
