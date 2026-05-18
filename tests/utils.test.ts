import { describe, it, expect } from 'vitest';
import { normaliseClient, buildTimings, parsePgTimings } from '../src/utils.ts';

describe('normaliseClient', () => {
  it('normalises postgres variants', () => {
    expect(normaliseClient('pg')).toBe('pg');
    expect(normaliseClient('postgres')).toBe('pg');
    expect(normaliseClient('postgresql')).toBe('pg');
    expect(normaliseClient('PG')).toBe('pg');
    expect(normaliseClient('PostgreSQL')).toBe('pg');
  });

  it('normalises mysql variants', () => {
    expect(normaliseClient('mysql')).toBe('mysql');
    expect(normaliseClient('mysql2')).toBe('mysql2');
  });

  it('normalises sqlite variants', () => {
    expect(normaliseClient('sqlite3')).toBe('sqlite3');
    expect(normaliseClient('better-sqlite3')).toBe('better-sqlite3');
  });

  it('normalises mssql variants', () => {
    expect(normaliseClient('mssql')).toBe('mssql');
    expect(normaliseClient('tedious')).toBe('mssql');
  });

  it('normalises oracledb', () => {
    expect(normaliseClient('oracledb')).toBe('oracledb');
  });

  it('returns unknown for unrecognised values', () => {
    expect(normaliseClient('db2')).toBe('unknown');
    expect(normaliseClient('')).toBe('unknown');
    expect(normaliseClient(null)).toBe('unknown');
    expect(normaliseClient(undefined)).toBe('unknown');
    expect(normaliseClient(42)).toBe('unknown');
  });
});

describe('buildTimings', () => {
  it('computes overhead as driverMs minus executionMs', () => {
    expect(buildTimings(100, 80, 10)).toEqual({
      driverMs: 100,
      executionMs: 80,
      planningMs: 10,
      overheadMs: 20,
    });
  });

  it('clamps overhead to 0 when execution exceeds driver', () => {
    const t = buildTimings(10, 15, 2);
    expect(t.overheadMs).toBe(0);
  });

  it('sets overheadMs to null when executionMs is null', () => {
    const t = buildTimings(100, null, null);
    expect(t.overheadMs).toBeNull();
    expect(t.executionMs).toBeNull();
    expect(t.planningMs).toBeNull();
    expect(t.driverMs).toBe(100);
  });

  it('allows planningMs to be null while executionMs is set', () => {
    const t = buildTimings(50, 30, null);
    expect(t.overheadMs).toBe(20);
    expect(t.planningMs).toBeNull();
  });
});

describe('parsePgTimings', () => {
  const PLAN_FULL = [
    'Seq Scan on users  (cost=0.00..1.05 rows=5 width=32) (actual time=0.012..0.018 rows=5 loops=1)',
    'Planning Time: 0.082 ms',
    'Execution Time: 0.042 ms',
  ].join('\n');

  it('parses execution and planning times from PG EXPLAIN text', () => {
    const t = parsePgTimings(PLAN_FULL, 1.5);
    expect(t.executionMs).toBeCloseTo(0.042);
    expect(t.planningMs).toBeCloseTo(0.082);
    expect(t.driverMs).toBe(1.5);
    expect(t.overheadMs).toBeCloseTo(1.5 - 0.042);
  });

  it('is case-insensitive for label matching', () => {
    const plan = 'execution time: 5.00 ms\nplanning time: 1.00 ms';
    const t = parsePgTimings(plan, 10);
    expect(t.executionMs).toBeCloseTo(5);
    expect(t.planningMs).toBeCloseTo(1);
  });

  it('returns null timings when plan text has no timing lines', () => {
    const t = parsePgTimings('Seq Scan on users', 5);
    expect(t.executionMs).toBeNull();
    expect(t.planningMs).toBeNull();
    expect(t.overheadMs).toBeNull();
    expect(t.driverMs).toBe(5);
  });

  it('returns null timings for empty plan string', () => {
    const t = parsePgTimings('', 3);
    expect(t.executionMs).toBeNull();
    expect(t.planningMs).toBeNull();
    expect(t.overheadMs).toBeNull();
  });
});
