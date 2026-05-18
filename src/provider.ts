import type { ApplicationService } from '@adonisjs/core/types';
import { storage } from './store.ts';
import { captureCallSite } from './callsite.ts';
import { setDbRef } from './db_ref.ts';
import type { LogLevel } from './types.ts';

function safeArg(v: unknown): unknown {
  if (v === null || v === undefined || typeof v !== 'object') return v;
  try {
    JSON.stringify(v);
    return v;
  } catch {
    return `[non-serializable: ${Object.prototype.toString.call(v)}]`;
  }
}

function patchConsole(level: LogLevel, method: 'log' | 'warn' | 'error'): () => void {
  const original = console[method].bind(console);
  console[method] = (...args: unknown[]) => {
    original(...args);
    const entry = storage.getStore();
    if (entry)
      entry.consoleLogs.push({
        level,
        args: args.map(safeArg),
        timestamp: Date.now(),
        source: 'backend',
        location: captureCallSite(),
      });
  };
  return () => {
    console[method] = original;
  };
}

export default class DebugbarProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (process.env.DEBUG_BAR !== 'true') return;

    patchConsole('info', 'log');
    patchConsole('warn', 'warn');
    patchConsole('error', 'error');

    // Use container.make(): the service singletons exported from
    // @adonisjs/core/services/* are set via app.booted() callbacks and are
    // undefined during boot(). The container bindings are registered during
    // register() and are safe to resolve here.

    const router = (await this.app.container.make('router')) as any;
    const { registerRoutes } = await import('./routes.ts');
    registerRoutes(router);

    const emitter = (await this.app.container.make('emitter')) as {
      on: (event: string, handler: (data: unknown) => void) => void;
    };
    const { attachQueryCollector } = await import('./collectors/query.ts');
    attachQueryCollector(emitter);

    // Enable Lucid debug mode so db:query events fire for every connection
    try {
      const db = (await this.app.container.make('lucid.db')) as unknown as Record<string, unknown>;
      setDbRef(db);
      const manager = db?.manager as Record<string, unknown> | undefined;
      const connections = manager?.connections;

      if (connections instanceof Map) {
        for (const [, conn] of connections as Map<string, Record<string, unknown>>) {
          const config = conn?.config as Record<string, unknown> | undefined;
          if (config) config.debug = true;
        }
      }
    } catch {
      // Lucid not installed, query tracking disabled
    }
  }
}
