import { useCallback, useState } from 'preact/compat';
import { s } from '../styles';
import { CopyButton } from '../CopyButton';
import type { ExceptionRecord } from '../../types';

function StackTrace({ stack }: { stack: string }) {
  const lines = stack.split('\n').slice(1); // drop the first "Error: message" line

  return (
    <div
      style={{
        marginTop: 8,
        fontFamily: 'monospace',
        fontSize: 11,
        background: s.codeBg,
        border: `1px solid ${s.border}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isApp =
          trimmed.includes('\\app\\') ||
          trimmed.includes('/app/') ||
          trimmed.includes('\\start\\') ||
          trimmed.includes('/start/') ||
          trimmed.includes('\\routes\\') ||
          trimmed.includes('/routes/');
        return (
          <div
            key={i}
            style={{
              padding: '3px 12px',
              color: isApp ? s.textPrimary : s.textMuted,
              fontWeight: isApp ? 500 : 400,
              borderBottom: i < lines.length - 1 ? `1px solid ${s.border}` : undefined,
              background: isApp ? s.blue + '08' : 'transparent',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {isApp && (
              <span style={{ color: s.blue, marginRight: 6, fontSize: 9, fontWeight: 700 }}>
                APP
              </span>
            )}
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

function ExceptionCard({ exc }: { exc: ExceptionRecord }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        margin: '12px 16px',
        border: `1px solid ${s.red}44`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '10px 14px',
          background: s.red + '0d',
          borderLeft: `4px solid ${s.red}`,
          cursor: exc.stack ? 'pointer' : 'default',
        }}
        onClick={() => exc.stack && setOpen((v) => !v)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: s.red }}>
            {exc.name}
          </span>
          <div
            style={{ fontSize: 13, color: s.textPrimary, marginTop: 3, wordBreak: 'break-word' }}
          >
            {exc.message}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: s.textMuted, fontFamily: 'monospace' }}>
            {new Date(exc.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
          {exc.stack && (
            <span style={{ fontSize: 10, color: s.textMuted }}>
              {open ? '▾ hide stack' : '▸ show stack'}
            </span>
          )}
        </div>
      </div>

      {/* Stack trace */}
      {open && exc.stack && (
        <div style={{ padding: '0 14px 12px' }}>
          <StackTrace stack={exc.stack} />
        </div>
      )}
    </div>
  );
}

interface Props {
  exceptions: ExceptionRecord[];
}

export function ExceptionsPanel({ exceptions }: Props) {
  const getJson = useCallback(
    () =>
      JSON.stringify(
        exceptions.map(({ name, message, stack, timestamp }) => ({
          name,
          message,
          stack,
          timestamp,
        })),
        null,
        2,
      ),
    [exceptions],
  );

  if (!exceptions.length) {
    return (
      <div style={{ padding: '24px 24px' }}>
        <div style={{ fontSize: 13, color: s.textMuted, marginBottom: 20 }}>
          No exceptions for this request.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div
            style={{
              background: s.surface,
              border: `1px solid ${s.border}`,
              borderRadius: 6,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: s.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 10,
              }}
            >
              Catch a specific exception
            </div>
            <pre
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                background: s.codeBg,
                padding: '8px 12px',
                borderRadius: 4,
                border: `1px solid ${s.border}`,
                color: s.codeColor,
                lineHeight: 1.7,
                margin: 0,
                whiteSpace: 'pre',
              }}
            >
              {`try {\n  // your code\n} catch (e) {\n  Debugbar.addException(e)\n}`}
            </pre>
          </div>

          <div
            style={{
              background: s.surface,
              border: `1px solid ${s.border}`,
              borderRadius: 6,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: s.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: 4,
              }}
            >
              Catch all exceptions
            </div>
            <div style={{ fontSize: 11, color: s.textMuted, marginBottom: 10 }}>
              In{' '}
              <code
                style={{
                  fontFamily: 'monospace',
                  background: s.codeBg,
                  padding: '1px 4px',
                  borderRadius: 3,
                  color: s.codeColor,
                }}
              >
                app/exceptions/handler.ts
              </code>
            </div>
            <pre
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                background: s.codeBg,
                padding: '8px 12px',
                borderRadius: 4,
                border: `1px solid ${s.border}`,
                color: s.codeColor,
                lineHeight: 1.7,
                margin: 0,
                whiteSpace: 'pre',
              }}
            >
              {`async report(error: unknown, ctx: HttpContext) {\n  Debugbar.addException(error)\n  return super.report(error, ctx)\n}`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: s.surface,
          borderBottom: `1px solid ${s.border}`,
          fontSize: 12,
        }}
      >
        <span>
          <strong style={{ color: s.red }}>{exceptions.length}</strong>
          <span style={{ color: s.textSecondary }}>
            {' '}
            exception{exceptions.length !== 1 ? 's' : ''}
          </span>
        </span>
        <CopyButton getData={getJson} label="Copy JSON" />
      </div>
      {exceptions.map((exc, i) => (
        <ExceptionCard key={i} exc={exc} />
      ))}
    </div>
  );
}
