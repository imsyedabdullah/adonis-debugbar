import React, { useState, useEffect, useRef, useCallback } from 'preact/compat';
import { useDebugbarRequests } from '../hooks/use-debugbar-requests';
import { useDebugbarData } from '../hooks/use-debugbar-data';
import { Timeline } from './panels/Timeline';
import { Queries } from './panels/Queries';
import { RequestPanel } from './panels/RequestPanel';
import { RoutePanel } from './panels/RoutePanel';
import { SessionPanel } from './panels/SessionPanel';
import { MessagesPanel } from './panels/MessagesPanel';
import { ConsolePanel } from './panels/ConsolePanel';
import { ExceptionsPanel } from './panels/ExceptionsPanel';
import { InertiaPanel } from './panels/InertiaPanel';
import { s, statusColor, methodColor, durationColor } from './styles';
import type { CapturedRequest, InertiaPageSnapshot } from '../types';

type Tab =
  | 'messages'
  | 'console'
  | 'timeline'
  | 'queries'
  | 'exceptions'
  | 'inertia'
  | 'request'
  | 'route'
  | 'session';

interface Props {
  baseUrl?: string;
}

const DEFAULT_HEIGHT = 300;
const MAX_HEIGHT = 500;
const SNAP_THRESHOLD = 60;
const HANDLE_HEIGHT = 5;

function getPath(url: string): string {
  try {
    const u = new URL(url, globalThis.location?.origin ?? 'http://x');
    const raw = u.pathname + (u.search || '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  } catch {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  }
}

function relativeTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 3) return 'just now';
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

function MethodBadge({ method }: { method: string }) {
  const color = methodColor(method);
  return (
    <span
      style={{
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'monospace',
        background: color + '22',
        color,
        flexShrink: 0,
      }}
    >
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: number }) {
  const color = statusColor(status);
  return (
    <span
      style={{
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'monospace',
        background: color + '22',
        color,
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

function RequestRow({
  request,
  selected,
  onClick,
}: {
  request: CapturedRequest;
  selected: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        cursor: 'pointer',
        background: selected ? s.surface : hover ? s.surfaceHover : s.bg,
        borderBottom: `1px solid ${s.border}`,
        borderLeft: `3px solid ${selected ? s.blue : 'transparent'}`,
      }}
    >
      <MethodBadge method={request.method} />
      <span
        style={{
          flex: 1,
          fontFamily: 'monospace',
          fontSize: 12,
          color: s.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {getPath(request.url)}
      </span>
      <StatusBadge status={request.status} />
      <span
        style={{
          fontSize: 11,
          color: durationColor(request.duration),
          fontWeight: 600,
          flexShrink: 0,
          minWidth: 40,
          textAlign: 'right',
        }}
      >
        {request.duration.toFixed(0)}ms
      </span>
      <span
        style={{
          fontSize: 11,
          color: s.textMuted,
          flexShrink: 0,
          minWidth: 56,
          textAlign: 'right',
        }}
      >
        {relativeTime(request.timestamp)}
      </span>
    </div>
  );
}

function RequestSelector({
  requests,
  selectedUid,
  onSelect,
}: {
  requests: CapturedRequest[];
  selectedUid: number | null;
  onSelect: (uid: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = requests.find((r) => r.uid === selectedUid) ?? null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapperRef} style={{ flex: 1, position: 'relative', minWidth: 0 }}>
      <button
        onClick={() => requests.length > 0 && setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          background: open ? s.surfaceHover : s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: open ? '4px 4px 0 0' : 4,
          cursor: requests.length > 0 ? 'pointer' : 'default',
          outline: 'none',
          minWidth: 0,
        }}
      >
        {selected ? (
          <>
            <MethodBadge method={selected.method} />
            <span
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                color: s.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                textAlign: 'left',
              }}
            >
              {getPath(selected.url)}
            </span>
            <StatusBadge status={selected.status} />
            <span
              style={{
                fontSize: 11,
                color: durationColor(selected.duration),
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {selected.duration.toFixed(0)}ms
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: s.textMuted, textAlign: 'left' }}>
            No requests captured yet
          </span>
        )}
        <span
          style={{
            marginLeft: 4,
            color: s.textMuted,
            fontSize: 10,
            flexShrink: 0,
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          ▾
        </span>
      </button>

      {open && requests.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            zIndex: 100,
          }}
        >
          {requests.map((r) => (
            <RequestRow
              key={r.uid}
              request={r}
              selected={r.uid === selectedUid}
              onClick={() => {
                onSelect(r.uid);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Debugbar({ baseUrl = '' }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('queries');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [inertiaSnapshot, setInertiaSnapshot] = useState<InertiaPageSnapshot | null>(null);

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const heightRef = useRef(DEFAULT_HEIGHT);

  const { requests, clear } = useDebugbarRequests(baseUrl);

  const selected = requests.find((r) => r.uid === selectedUid) ?? null;
  const { data, loading } = useDebugbarData(selected?.id ?? null, baseUrl);

  useEffect(() => setMounted(true), []);

  // Inertia page props capture
  useEffect(() => {
    const readPage = (page: Record<string, unknown>) => {
      if (!page?.component) return;
      setInertiaSnapshot({
        component: page.component as string,
        props: (page.props ?? {}) as Record<string, unknown>,
        url: (page.url as string | undefined) ?? window.location.href,
        version: (page.version as string | null | undefined) ?? null,
      });
    };

    try {
      const appEl = document.getElementById('app');
      const page = JSON.parse(appEl?.dataset.page ?? '{}');
      readPage(page);
    } catch {}

    const onSuccess = (e: Event) => {
      try {
        readPage((e as CustomEvent).detail?.page ?? {});
      } catch {}
    };
    document.addEventListener('inertia:success', onSuccess);
    return () => document.removeEventListener('inertia:success', onSuccess);
  }, []);

  // Auto-select the newest request only if nothing is selected or selected was removed.
  // Does NOT jump away from a manually chosen request when new ones arrive.
  useEffect(() => {
    if (requests.length === 0) {
      setSelectedUid(null);
      return;
    }
    setSelectedUid((prev) => {
      if (prev !== null && requests.some((r) => r.uid === prev)) return prev;
      return requests[0].uid;
    });
  }, [requests]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dy = startYRef.current - e.clientY;
      const next = Math.max(0, Math.min(MAX_HEIGHT, startHeightRef.current + dy));
      heightRef.current = next;
      setHeight(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (heightRef.current < SNAP_THRESHOLD) {
        setOpen(false);
        setHeight(DEFAULT_HEIGHT);
        heightRef.current = DEFAULT_HEIGHT;
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = heightRef.current;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  if (!mounted) return null;

  const consoleLogCount = data?.consoleLogs.length ?? 0;

  const tabs: { key: Tab; label: string; badge?: number; badgeColor?: string }[] = [
    { key: 'messages', label: 'Messages', badge: data?.messages.length },
    { key: 'console', label: 'Console', badge: consoleLogCount },
    { key: 'timeline', label: 'Timeline' },
    { key: 'queries', label: 'Queries', badge: data?.queries.count },
    {
      key: 'exceptions',
      label: 'Exceptions',
      badge: data?.exceptions.length,
      badgeColor: data?.exceptions.length ? s.red : undefined,
    },
    { key: 'inertia', label: 'Inertia', badge: inertiaSnapshot ? undefined : undefined },
    { key: 'request', label: 'Request' },
    { key: 'route', label: 'Route' },
    {
      key: 'session',
      label: 'Session',
      badge: data?.session ? Object.keys(data.session.data).length : undefined,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 13,
      }}
    >
      {open && (
        <>
          <div
            onMouseDown={startDrag}
            style={{
              height: HANDLE_HEIGHT,
              cursor: 'ns-resize',
              background: s.border,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = s.blue)}
            onMouseLeave={(e) => (e.currentTarget.style.background = s.border)}
          />

          <div
            style={{
              height,
              display: 'flex',
              flexDirection: 'column',
              background: s.bg,
              borderLeft: `1px solid ${s.border}`,
              borderRight: `1px solid ${s.border}`,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            }}
          >
            {/* Request selector, sits above panel content, dropdown overlays downward */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '5px 12px',
                borderBottom: `1px solid ${s.border}`,
                background: s.surface,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, color: s.textMuted, flexShrink: 0 }}>Request:</span>
              <RequestSelector
                requests={requests}
                selectedUid={selectedUid}
                onSelect={setSelectedUid}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: s.bg }}>
              {loading && (
                <div
                  style={{
                    padding: '24px 16px',
                    color: s.textMuted,
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  Loading…
                </div>
              )}
              {!loading && !data && (
                <div
                  style={{
                    padding: '24px 16px',
                    color: s.textMuted,
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  {requests.length === 0
                    ? 'Make a request to see debug data.'
                    : 'Select a request above.'}
                </div>
              )}
              {!loading && data && activeTab === 'messages' && (
                <MessagesPanel messages={data.messages} />
              )}
              {!loading && activeTab === 'console' && (
                <ConsolePanel logs={data?.consoleLogs ?? []} />
              )}
              {!loading && data && activeTab === 'timeline' && <Timeline data={data} />}
              {!loading && data && activeTab === 'queries' && (
                <Queries
                  key={data.id}
                  queries={data.queries.entries}
                  requestId={data.id}
                  baseUrl={baseUrl}
                />
              )}
              {!loading && data && activeTab === 'exceptions' && (
                <ExceptionsPanel exceptions={data.exceptions} />
              )}
              {activeTab === 'inertia' && <InertiaPanel snapshot={inertiaSnapshot} />}
              {!loading && data && activeTab === 'request' && <RequestPanel data={data} />}
              {!loading && data && activeTab === 'route' && <RoutePanel route={data.route} />}
              {!loading && data && activeTab === 'session' && (
                <SessionPanel session={data.session ?? null} />
              )}
            </div>
          </div>
        </>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          background: s.tabBarBg,
          borderTop: `1px solid ${s.border}`,
          height: 36,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {tabs.map((tab) => {
          const isActive = open && activeTab === tab.key;
          const accentColor = tab.badgeColor ?? s.tabActive;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (!open) {
                  setOpen(true);
                  setHeight(DEFAULT_HEIGHT);
                  heightRef.current = DEFAULT_HEIGHT;
                }
                setActiveTab(tab.key);
              }}
              style={{
                padding: '0 14px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: isActive ? accentColor : s.tabInactiveText,
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                borderTop: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'color 0.1s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  style={{
                    background: isActive
                      ? accentColor
                      : tab.badgeColor
                        ? tab.badgeColor + '22'
                        : s.border,
                    color: isActive ? '#fff' : (tab.badgeColor ?? s.textSecondary),
                    borderRadius: 10,
                    padding: '0 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: '16px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {open && requests.length > 0 && (
          <button onClick={clear} style={actionBtn} title="Clear all requests">
            Clear
          </button>
        )}
        {open && (
          <button
            onClick={() => setOpen(false)}
            style={{ ...actionBtn, padding: '0 14px', fontSize: 18, lineHeight: 1 }}
            title="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  padding: '0 12px',
  height: '100%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 11,
  color: s.textMuted,
  display: 'flex',
  alignItems: 'center',
};
