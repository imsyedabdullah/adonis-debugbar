import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type LazyImport = () => Promise<{ default: any }>;
type RouteHandler = ((ctx: unknown) => unknown) | [LazyImport, string];

type Router = {
  get: (pattern: string, handler: RouteHandler) => void;
  post: (pattern: string, handler: RouteHandler) => void;
};

export function registerRoutes(router: Router): void {
  const DebugbarController = () => import('./debugbar_controller.ts');

  router.get('/__debugbar/requests/:id', [DebugbarController, 'request']);
  router.post('/__debugbar/explain', [DebugbarController, 'explain']);
  router.post('/__debugbar/explain-all', [DebugbarController, 'explainAll']);

  router.get('/__debugbar/static/debugbar.js', (ctx: unknown) => {
    const c = ctx as {
      response: {
        header: (k: string, v: string) => void;
        send: (b: unknown) => void;
      };
    };
    const filePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'debugbar.js');
    const content = readFileSync(filePath, 'utf-8');
    c.response.header('Content-Type', 'application/javascript; charset=utf-8');
    c.response.header('Cache-Control', 'no-store');
    c.response.send(content);
  });
}
