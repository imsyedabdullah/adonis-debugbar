// Shared design tokens, light mode, Laravel Debugbar inspired
export const s = {
  // Backgrounds
  bg: '#ffffff',
  surface: '#f6f8fa',
  surfaceHover: '#f0f4f8',

  // Borders
  border: '#d0d7de',
  borderStrong: '#b0bec5',

  // Text
  textPrimary: '#24292f',
  textSecondary: '#57606a',
  textMuted: '#8b949e',

  // Accent colours
  blue: '#0969da',
  green: '#1a7f37',
  yellow: '#9a6700',
  red: '#cf222e',
  purple: '#8250df',
  orange: '#bc4c00',

  // Status colours
  status2xx: '#1a7f37',
  status3xx: '#9a6700',
  status4xx: '#cf222e',
  status5xx: '#cf222e',

  // Toolbar
  toolbarBg: '#24292f',
  toolbarText: '#f0f6fc',
  toolbarBorder: '#444c56',

  // Tab bar
  tabBarBg: '#f6f8fa',
  tabBarBorder: '#d0d7de',
  tabActive: '#0969da',
  tabActiveText: '#0969da',
  tabInactiveText: '#57606a',

  // Code
  codeBg: '#f6f8fa',
  codeColor: '#24292f',
  codeKw: '#cf222e',
  codeString: '#0a3069',
  codeNumber: '#0550ae',
};

export function statusColor(status: number): string {
  if (status < 300) return s.status2xx;
  if (status < 400) return s.status3xx;
  return s.status4xx;
}

export function methodColor(method: string): string {
  const map: Record<string, string> = {
    GET: s.blue,
    POST: s.green,
    PUT: s.yellow,
    PATCH: s.orange,
    DELETE: s.red,
    HEAD: s.purple,
  };
  return map[method] ?? s.textSecondary;
}

export function durationColor(ms: number): string {
  if (ms > 500) return s.red;
  if (ms > 100) return s.yellow;
  return s.green;
}
