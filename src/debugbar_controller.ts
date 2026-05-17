import type { HttpContext } from '@adonisjs/core/http';
import { ringBuffer } from './store.ts';
import type { DbClient, ExplainResult } from './types.ts';
import { normaliseClient, buildTimings, parsePgTimings } from './utils.ts';

export default class DebugbarController {
  public request({ params, response }: HttpContext) {
    // const allIds = ringBuffer.list().map((e) => e.id);
    // console.log("[debugbar] lookup id:", params.id);
    // console.log("[debugbar] ring buffer ids:", allIds);
    const entry = ringBuffer.get(params.id);
    if (!entry) return response.notFound({ error: 'Request not found' });
    return response.json(entry);
  }

  public async explain({ request, response }: HttpContext) {
    const body = request.body() as Record<string, unknown>;
    const requestId = body.requestId;
    const queryIndex = body.queryIndex;

    if (typeof requestId !== 'string' || typeof queryIndex !== 'number') {
      return response.badRequest({ error: 'Invalid parameters' });
    }

    const entry = ringBuffer.get(requestId);
    if (!entry) return response.notFound({ error: 'Request not found' });

    const query = entry.queries.entries[queryIndex];
    if (!query) return response.notFound({ error: 'Query not found' });

    try {
      const dbClient = await this.resolveDbClient();
      const result = await this.runExplain(dbClient, query.sql, query.bindings, query.duration);
      return response.json(result);
    } catch (err) {
      return response.internalServerError({ error: String(err) });
    }
  }

  public async explainAll({ request, response }: HttpContext) {
    const body = request.body() as Record<string, unknown>;
    const requestId = body.requestId;

    if (typeof requestId !== 'string') {
      return response.badRequest({ error: 'Invalid parameters' });
    }

    const entry = ringBuffer.get(requestId);
    if (!entry) return response.notFound({ error: 'Request not found' });

    const dbClient = await this.resolveDbClient();

    const results = await Promise.all(
      entry.queries.entries.map(async (query, i) => {
        try {
          const result = await this.runExplain(dbClient, query.sql, query.bindings, query.duration);
          return { index: i, result };
        } catch (err) {
          return { index: i, error: String(err) };
        }
      }),
    );

    return response.json(results);
  }

  private async resolveDbClient(): Promise<DbClient> {
    const { default: db } = await import('@adonisjs/lucid/services/db');
    const raw = db as unknown as Record<string, unknown>;
    try {
      const manager = raw.manager as Record<string, unknown> | undefined;
      const connections = manager?.connections;
      if (connections instanceof Map) {
        const first = connections.values().next().value as Record<string, unknown> | undefined;
        const client = (first?.config as Record<string, unknown> | undefined)?.client;
        return normaliseClient(client);
      }
      const config = raw.config as Record<string, unknown> | undefined;
      return normaliseClient(config?.client);
    } catch {
      return 'unknown';
    }
  }

  private async explainPg(
    sql: string,
    bindings: unknown[],
    driverMs: number,
  ): Promise<ExplainResult> {
    // EXPLAIN ANALYZE executes the query; wrap in a transaction we always rollback
    const { default: db } = await import('@adonisjs/lucid/services/db');
    const trx = await db.transaction();
    try {
      const result = await trx.rawQuery(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, bindings as any[]);
      const plan = (result.rows as Record<string, string>[]).map((r) => r['QUERY PLAN']).join('\n');
      return {
        dbClient: 'pg',
        plan,
        supported: true,
        timings: parsePgTimings(plan, driverMs),
      };
    } finally {
      await trx.rollback();
    }
  }

  private async explainMysql(
    client: 'mysql' | 'mysql2',
    sql: string,
    bindings: unknown[],
    driverMs: number,
  ): Promise<ExplainResult> {
    const { default: db } = await import('@adonisjs/lucid/services/db');

    // Try EXPLAIN ANALYZE (MySQL 8.0+) first; fall back to plain EXPLAIN
    let rows: Record<string, unknown>[];
    let usedAnalyze = false;
    try {
      const res = await db.rawQuery(`EXPLAIN ANALYZE ${sql}`, bindings as any[]);
      rows = res.rows as Record<string, unknown>[];
      usedAnalyze = true;
    } catch {
      const res = await db.rawQuery(`EXPLAIN ${sql}`, bindings as any[]);
      rows = res.rows as Record<string, unknown>[];
    }

    return {
      dbClient: client,
      plan: rows,
      supported: true,
      note: usedAnalyze ? undefined : 'EXPLAIN ANALYZE requires MySQL 8.0+. Showing basic EXPLAIN.',
      timings: buildTimings(driverMs, null, null),
    };
  }

  private async explainSqlite(
    client: 'sqlite3' | 'better-sqlite3',
    sql: string,
    bindings: unknown[],
    driverMs: number,
  ): Promise<ExplainResult> {
    const { default: db } = await import('@adonisjs/lucid/services/db');
    const result = await db.rawQuery(`EXPLAIN QUERY PLAN ${sql}`, bindings as any[]);
    const plan = (result.rows as Record<string, unknown>[])
      .map((r) => String(r.detail ?? r.DETAIL ?? JSON.stringify(r)))
      .join('\n');
    return {
      dbClient: client,
      plan,
      supported: true,
      timings: buildTimings(driverMs, null, null),
    };
  }

  private async runExplain(
    dbClient: DbClient,
    sql: string,
    bindings: unknown[],
    driverMs: number,
  ): Promise<ExplainResult> {
    const noTimings = buildTimings(driverMs, null, null);

    if (dbClient === 'pg') return this.explainPg(sql, bindings, driverMs);
    if (dbClient === 'mysql' || dbClient === 'mysql2')
      return this.explainMysql(dbClient, sql, bindings, driverMs);
    if (dbClient === 'sqlite3' || dbClient === 'better-sqlite3')
      return this.explainSqlite(dbClient, sql, bindings, driverMs);

    if (dbClient === 'mssql') {
      return {
        dbClient,
        plan: '',
        supported: false,
        timings: noTimings,
        note: 'EXPLAIN is not supported for MSSQL. Use SQL Server Management Studio → Execution Plan instead.',
      };
    }
    if (dbClient === 'oracledb') {
      return {
        dbClient,
        plan: '',
        supported: false,
        timings: noTimings,
        note: 'EXPLAIN PLAN is not yet supported. Use Oracle SQL Developer → Explain Plan instead.',
      };
    }

    try {
      const { default: db } = await import('@adonisjs/lucid/services/db');
      const res = await db.rawQuery(`EXPLAIN ${sql}`, bindings as any[]);
      const rows = res.rows as Record<string, unknown>[];
      return {
        dbClient: 'unknown',
        supported: true,
        timings: noTimings,
        plan: rows.map((r) => JSON.stringify(r)).join('\n'),
        note: 'Unknown database client, showing raw EXPLAIN output.',
      };
    } catch (err) {
      return {
        dbClient: 'unknown',
        plan: '',
        supported: false,
        timings: noTimings,
        note: `EXPLAIN not supported or failed: ${String(err)}`,
      };
    }
  }
}
