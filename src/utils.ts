import type { DbClient, ExplainTimings } from './types.ts';

export function normaliseClient(raw: unknown): DbClient {
  const c = String(raw ?? '').toLowerCase();
  if (c === 'pg' || c === 'postgres' || c === 'postgresql') return 'pg';
  if (c === 'mysql') return 'mysql';
  if (c === 'mysql2') return 'mysql2';
  if (c === 'sqlite3') return 'sqlite3';
  if (c === 'better-sqlite3') return 'better-sqlite3';
  if (c === 'mssql' || c === 'tedious') return 'mssql';
  if (c === 'oracledb') return 'oracledb';
  return 'unknown';
}

export function buildTimings(
  driverMs: number,
  executionMs: number | null,
  planningMs: number | null,
): ExplainTimings {
  return {
    driverMs,
    executionMs,
    planningMs,
    overheadMs: executionMs !== null ? Math.max(0, driverMs - executionMs) : null,
  };
}

export function parsePgTimings(plan: string, driverMs: number): ExplainTimings {
  const executionMatch = plan.match(/Execution Time:\s*([\d.]+)\s*ms/i);
  const planningMatch = plan.match(/Planning Time:\s*([\d.]+)\s*ms/i);
  return buildTimings(
    driverMs,
    executionMatch ? Number.parseFloat(executionMatch[1]) : null,
    planningMatch ? Number.parseFloat(planningMatch[1]) : null,
  );
}
