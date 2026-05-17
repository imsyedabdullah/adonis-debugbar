import React, { useCallback, useMemo, useState } from 'preact/compat';
import { s } from '../styles';
import { CopyButton } from '../CopyButton';
import type { MessageRecord, LogLevel } from '../../types';

type LevelFilter = 'all' | LogLevel;

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: s.blue,
  warn: s.yellow,
  error: s.red,
};

const LEVEL_BG: Record<LogLevel, string> = {
  info: s.blue + '0f',
  warn: s.yellow + '0f',
  error: s.red + '0f',
};

function LevelBadge({ level }: { level: LogLevel }) {
  const color = LEVEL_COLOR[level];
  return (
    <span
      style={{
        padding: '1px 6px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'monospace',
        background: color + '22',
        color,
        flexShrink: 0,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        minWidth: 40,
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {level}
    </span>
  );
}

function ArgBlock({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);

  if (value === null)
    return (
      <span
        style={{ fontFamily: 'monospace', fontSize: 12, color: s.textMuted, fontStyle: 'italic' }}
      >
        null
      </span>
    );
  if (value === undefined)
    return (
      <span
        style={{ fontFamily: 'monospace', fontSize: 12, color: s.textMuted, fontStyle: 'italic' }}
      >
        undefined
      </span>
    );
  if (typeof value === 'boolean')
    return (
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.purple }}>
        {String(value)}
      </span>
    );
  if (typeof value === 'number')
    return (
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: s.blue }}>{String(value)}</span>
    );
  if (typeof value === 'string')
    return (
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: s.textPrimary,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    );

  const isArr = Array.isArray(value);
  const count = isArr ? (value as unknown[]).length : Object.keys(value as object).length;
  const json = JSON.stringify(value, null, 2);
  const preview = JSON.stringify(value);

  return (
    <span style={{ display: 'inline-block', verticalAlign: 'top' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: 11,
          color: s.blue,
          background: s.surface,
          border: `1px solid ${s.border}`,
          borderRadius: 3,
          padding: '1px 6px',
          cursor: 'pointer',
        }}
      >
        {open ? '▾' : '▸'} {isArr ? `Array(${count})` : `Object{${count}}`}
      </button>
      {!open && (
        <span
          style={{ fontFamily: 'monospace', fontSize: 11, color: s.textSecondary, marginLeft: 6 }}
        >
          {preview.length > 80 ? preview.slice(0, 80) + '…' : preview}
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
            display: 'block',
          }}
        >
          {json}
        </pre>
      )}
    </span>
  );
}

function ts(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const filterBtn = (active: boolean, color?: string): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: active ? 600 : 400,
  border: `1px solid ${active ? (color ?? s.blue) : s.border}`,
  background: active ? (color ?? s.blue) + '18' : 'transparent',
  color: active ? (color ?? s.blue) : s.textSecondary,
  cursor: 'pointer',
});

interface Props {
  messages: MessageRecord[];
}

export function MessagesPanel({ messages }: Props) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const getJson = useCallback(
    () =>
      JSON.stringify(
        messages.map((m) => ({
          level: m.level,
          args: m.args,
          location: m.location ?? null,
          timestamp: m.timestamp,
        })),
        null,
        2,
      ),
    [messages],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((msg) => {
      if (levelFilter !== 'all' && msg.level !== levelFilter) return false;
      if (q) {
        const text = msg.args
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      }
      return true;
    });
  }, [messages, levelFilter, search]);

  const counts = useMemo(
    () => ({
      info: messages.filter((m) => m.level === 'info').length,
      warn: messages.filter((m) => m.level === 'warn').length,
      error: messages.filter((m) => m.level === 'error').length,
    }),
    [messages],
  );

  if (!messages.length) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}>
        No messages logged for this request.
        <span style={{ display: 'block', marginTop: 8, fontSize: 11 }}>
          Use{' '}
          <code
            style={{
              fontFamily: 'monospace',
              background: s.codeBg,
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            Debugbar.info(...)
          </code>
          {', '}
          <code
            style={{
              fontFamily: 'monospace',
              background: s.codeBg,
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            Debugbar.warn(...)
          </code>
          {', or '}
          <code
            style={{
              fontFamily: 'monospace',
              background: s.codeBg,
              padding: '1px 4px',
              borderRadius: 3,
            }}
          >
            Debugbar.error(...)
          </code>
          {' in your controller.'}
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '7px 12px',
          background: s.surface,
          borderBottom: `1px solid ${s.border}`,
          fontSize: 12,
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            border: `1px solid ${s.border}`,
            fontSize: 12,
            outline: 'none',
            background: s.bg,
            color: s.textPrimary,
            width: 180,
            flexShrink: 0,
          }}
        />

        <div style={{ width: 1, height: 16, background: s.border, flexShrink: 0 }} />

        {(['all', 'info', 'warn', 'error'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            style={filterBtn(
              levelFilter === l,
              l === 'info' ? s.blue : l === 'warn' ? s.yellow : l === 'error' ? s.red : undefined,
            )}
          >
            {l === 'all'
              ? `All (${messages.length})`
              : `${l[0].toUpperCase() + l.slice(1)} (${counts[l]})`}
          </button>
        ))}

        <span style={{ flex: 1 }} />

        {filtered.length !== messages.length && (
          <span style={{ fontSize: 11, color: s.textMuted }}>
            {filtered.length} of {messages.length}
          </span>
        )}
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div
          style={{ padding: '24px 16px', textAlign: 'center', color: s.textMuted, fontSize: 13 }}
        >
          No messages match the current filter.
        </div>
      ) : (
        <div>
          {filtered.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 12px',
                background: LEVEL_BG[msg.level],
                borderBottom: `1px solid ${s.border}`,
                borderLeft: `3px solid ${LEVEL_COLOR[msg.level]}`,
              }}
            >
              <LevelBadge level={msg.level} />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 12px',
                  alignItems: 'flex-start',
                }}
              >
                {msg.args.map((arg, j) => (
                  <ArgBlock key={j} value={arg} />
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, color: s.textMuted, fontFamily: 'monospace' }}>
                  {ts(msg.timestamp)}
                </span>
                {msg.location && (
                  <span
                    style={{ fontSize: 10, color: s.blue, fontFamily: 'monospace', opacity: 0.8 }}
                  >
                    {msg.location}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
