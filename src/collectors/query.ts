import { storage } from '../store.ts';

function parseDuration(duration: unknown): number {
  if (Array.isArray(duration)) {
    // Lucid emits hrtime tuple [seconds, nanoseconds]
    return (duration[0] as number) * 1000 + (duration[1] as number) / 1_000_000;
  }
  if (typeof duration === 'bigint') return Number(duration) / 1_000_000;
  if (typeof duration === 'number') return duration;
  return 0;
}

export function attachQueryCollector(emitter: {
  on: (event: string, handler: (data: unknown) => void) => void;
}): void {
  emitter.on('db:query', (raw: unknown) => {
    const query = raw as Record<string, unknown>;
    const store = storage.getStore();
    if (!store) return;

    store.queries.entries.push({
      sql: String(query.sql ?? ''),
      bindings: Array.isArray(query.bindings) ? query.bindings : [],
      duration: parseDuration(query.duration),
      timestamp: Date.now(),
      error: false,
    });
  });
}
