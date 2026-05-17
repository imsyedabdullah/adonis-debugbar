const ROOT_FOLDERS = new Set(['app', 'start', 'routes', 'lib', 'config', 'database']);
const SKIP = ['node_modules', 'node:', 'adonis-debugbar'];

export function captureCallSite(): string | null {
  const lines = (new Error().stack ?? '').split('\n').slice(1);
  for (const line of lines) {
    if (SKIP.some((p) => line.includes(p))) continue;
    const m = line.match(/\((.+):(\d+):\d+\)$/) ?? line.match(/at\s+(.+):(\d+):\d+$/);
    if (!m) continue;
    const file = m[1].replace(/^file:\/+/i, '').replace(/\\/g, '/');
    const parts = file.split('/');
    const idx = parts.findIndex((p) => ROOT_FOLDERS.has(p));
    const short = idx >= 0 ? parts.slice(idx).join('/') : parts.slice(-2).join('/');
    return `${short}:${m[2]}`;
  }
  return null;
}
