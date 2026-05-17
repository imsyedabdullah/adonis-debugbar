import React, { useCallback } from 'preact/compat';
import type { DebugbarData, MeasureRecord } from '../../types';
import { s, durationColor } from '../styles';
import { CopyButton } from '../CopyButton';

function timelineToJson(data: DebugbarData): string {
  return JSON.stringify(
    {
      milestones: data.timeline.entries.map((entry, i) => ({
        milestone: entry.label,
        time_ms: Number(entry.ms.toFixed(2)),
        delta_ms: Number((entry.ms - (data.timeline.entries[i - 1]?.ms ?? 0)).toFixed(2)),
      })),
      markers: data.timeline.markers.map((m) => ({ label: m.label, ms: Number(m.ms.toFixed(2)) })),
      measures: data.timeline.measures.map((m) => ({
        label: m.label,
        start_ms: Number(m.startMs.toFixed(2)),
        end_ms: m.endMs !== null ? Number(m.endMs.toFixed(2)) : null,
        duration_ms: m.endMs !== null ? Number((m.endMs - m.startMs).toFixed(2)) : null,
      })),
    },
    null,
    2,
  );
}

function Th({ children, w, right }: { children: React.ReactNode; w?: number; right?: boolean }) {
  return (
    <th
      style={{
        padding: '6px 12px',
        textAlign: right ? 'right' : 'left',
        fontSize: 11,
        fontWeight: 600,
        color: s.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        width: w,
      }}
    >
      {children}
    </th>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '7px 12px',
  fontSize: 12,
  color: s.textPrimary,
  verticalAlign: 'middle',
};

// Measures table, shown below the main milestones
function MeasuresTable({ measures, total }: { measures: MeasureRecord[]; total: number }) {
  if (!measures.length) return null;
  const safeTotal = total || 1;

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          padding: '6px 12px',
          background: s.surface,
          borderTop: `1px solid ${s.border}`,
          borderBottom: `1px solid ${s.border}`,
          fontSize: 10,
          fontWeight: 600,
          color: s.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        Measures
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: s.surface, borderBottom: `1px solid ${s.border}` }}>
            <Th w={180}>Label</Th>
            <Th>Bar</Th>
            <Th w={80} right>
              Offset
            </Th>
            <Th w={80} right>
              Duration
            </Th>
          </tr>
        </thead>
        <tbody>
          {measures.map((m, i) => {
            const endMs = m.endMs ?? total;
            const duration = endMs - m.startMs;
            const barLeft = (m.startMs / safeTotal) * 100;
            const barWidth = Math.max((duration / safeTotal) * 100, 0.5);
            const incomplete = m.endMs === null;

            return (
              <tr key={i} style={{ borderBottom: `1px solid ${s.border}` }}>
                <td style={tdStyle}>
                  {m.label}
                  {incomplete && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 9,
                        fontWeight: 700,
                        color: s.yellow,
                        background: s.yellow + '22',
                        padding: '1px 4px',
                        borderRadius: 2,
                      }}
                    >
                      OPEN
                    </span>
                  )}
                </td>
                <td style={{ ...tdStyle, padding: '8px 12px' }}>
                  <div
                    style={{
                      position: 'relative',
                      height: 14,
                      background: s.surface,
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: `1px solid ${s.border}`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        height: '100%',
                        background: incomplete ? s.yellow : s.purple,
                        borderRadius: 2,
                        minWidth: 3,
                        opacity: incomplete ? 0.6 : 1,
                      }}
                    />
                  </div>
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: 'right',
                    color: s.textSecondary,
                    fontFamily: 'monospace',
                  }}
                >
                  +{m.startMs.toFixed(2)}ms
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    color: incomplete ? s.yellow : s.textSecondary,
                  }}
                >
                  {incomplete ? '…' : `${duration.toFixed(2)}ms`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  data: DebugbarData;
}

export function Timeline({ data }: Props) {
  const { total, entries, markers, measures } = data.timeline;
  const { count: queryCount, totalDuration: queryTime } = data.queries;
  const getText = useCallback(() => timelineToJson(data), [data]);

  return (
    <div>
      {/* Header strip */}
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
        <span>
          Total: <strong style={{ color: s.textPrimary }}>{total.toFixed(2)} ms</strong>
          &nbsp;·&nbsp;
          <strong style={{ color: s.textPrimary }}>{queryCount}</strong>{' '}
          {queryCount === 1 ? 'query' : 'queries'} ({queryTime.toFixed(2)} ms)
          {measures.length > 0 && (
            <>
              &nbsp;·&nbsp;<strong style={{ color: s.purple }}>{measures.length}</strong> measure
              {measures.length !== 1 ? 's' : ''}
            </>
          )}
        </span>
        <CopyButton getData={getText} label="Copy JSON" />
      </div>

      <div style={{ padding: 16 }}>
        {/* Usage hint when no markers or measures yet */}
        {!markers.length && !measures.length && (
          <div style={{ marginBottom: 12, fontSize: 11, color: s.textMuted }}>
            {[
              { label: "Debugbar.addMarker('label')", desc: 'pin a marker on the ruler' },
              {
                label: "Debugbar.startMeasure('label') / stopMeasure('label')",
                desc: 'measure a code block',
              },
            ].map(({ label, desc }) => (
              <div key={label} style={{ marginBottom: 4 }}>
                <code
                  style={{
                    fontFamily: 'monospace',
                    background: s.codeBg,
                    padding: '1px 4px',
                    borderRadius: 3,
                    color: s.codeColor,
                  }}
                >
                  {label}
                </code>
                <span style={{ marginLeft: 6 }}>: {desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timeline table, entries then markers */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: s.surface, borderBottom: `1px solid ${s.border}` }}>
              <Th w={180}>Event</Th>
              <Th>Bar</Th>
              <Th w={90} right>
                Time (ms)
              </Th>
              <Th w={90} right>
                +Delta
              </Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const safeTotal = total || 1;
              const prev = entries[i - 1]?.ms ?? 0;
              const segMs = entry.ms - prev;
              const barLeft = (prev / safeTotal) * 100;
              const barWidth = Math.max((segMs / safeTotal) * 100, 0.3);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${s.border}` }}>
                  <td style={tdStyle}>{entry.label}</td>
                  <td style={{ ...tdStyle, padding: '8px 12px' }}>
                    <div
                      style={{
                        position: 'relative',
                        height: 14,
                        background: s.surface,
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: `${barLeft}%`,
                          width: `${barWidth}%`,
                          height: '100%',
                          background: i === 0 ? s.blue : s.green,
                          borderRadius: 2,
                          minWidth: 3,
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: s.textSecondary }}>
                    {entry.ms.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: s.textSecondary }}>
                    +{segMs.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {markers.length > 0 && (
              <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                <td style={{ ...tdStyle, color: s.textSecondary, verticalAlign: 'middle' }}>
                  Additional Markers
                </td>
                <td style={{ ...tdStyle, padding: '10px 12px 0px' }}>
                  {/* bar + pins + labels */}
                  <div style={{ position: 'relative' }}>
                    {/* the gray bar */}
                    <div
                      style={{
                        height: 14,
                        background: s.borderStrong,
                        borderRadius: 3,
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      {markers.map((m, i) => {
                        const safeTotal = total || 1;
                        const pct = Math.min((m.ms / safeTotal) * 100, 99.5);
                        return (
                          <div
                            key={i}
                            style={{
                              position: 'absolute',
                              left: `${pct}%`,
                              top: -3,
                              bottom: -3,
                              width: 2,
                              background: s.textSecondary,
                              borderRadius: 1,
                              transform: 'translateX(-50%)',
                            }}
                          />
                        );
                      })}
                    </div>
                    {/* labels below the bar */}
                    <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
                      {markers.map((m, i) => {
                        const safeTotal = total || 1;
                        const pct = Math.min((m.ms / safeTotal) * 100, 96);
                        return (
                          <span
                            key={i}
                            style={{
                              position: 'absolute',
                              left: `${pct}%`,
                              transform: 'translateX(-50%)',
                              fontSize: 9,
                              color: s.textSecondary,
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: s.textMuted }}>-</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: s.textMuted }}>-</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Measures section */}
        <MeasuresTable measures={measures} total={total} />
      </div>
    </div>
  );
}
