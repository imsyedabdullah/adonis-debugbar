import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeDb, dbConfigs, type EngineKey } from './helpers/lucid.js';
import { setDbRef } from '../src/db_ref.ts';
import DebugbarController from '../src/debugbar_controller.ts';
import { normaliseClient } from '../src/utils.ts';

async function seed(db: any, engine: EngineKey) {
  // SQLite uses different syntax than the rest
  const intType = engine === 'sqlite' ? 'INTEGER' : 'INT';
  await db.rawQuery(`DROP TABLE IF EXISTS dbg_users`);
  await db.rawQuery(`CREATE TABLE dbg_users (id ${intType} PRIMARY KEY, name VARCHAR(100))`);
  await db.rawQuery(`INSERT INTO dbg_users (id, name) VALUES (1, 'alice'), (2, 'bob')`);
}

const engines: EngineKey[] = process.env.TEST_ENGINE
  ? [process.env.TEST_ENGINE as EngineKey]
  : ['pg17', 'mysql84'];

describe.each(engines)('runExplain on %s', (engine) => {
  let db: any;
  let dispose: () => Promise<void>;
  let controller: DebugbarController;

  beforeAll(async () => {
    const made = await makeDb(dbConfigs[engine]);
    db = made.db;
    dispose = made.dispose;
    setDbRef(db);
    await seed(db, engine);
    controller = new DebugbarController();
  }, 90_000);

  afterAll(async () => {
    setDbRef(undefined);
    await dispose();
  });

  it('returns an ExplainResult with expected shape', async () => {
    const client = normaliseClient(dbConfigs[engine].client);
    const result = await controller.runExplain(
      client,
      'SELECT * FROM dbg_users WHERE id = ?',
      [1],
      5,
    );

    expect(result.dbClient).toBe(client);
    expect(result).toHaveProperty('timings');
    expect(result.timings.driverMs).toBe(5);
  });

  if (engine === 'pg17' || engine === 'pg13') {
    it('produces a non-empty plan with execution timings', async () => {
      const result = await controller.runExplain('pg', 'SELECT * FROM dbg_users', [], 3);
      expect(result.supported).toBe(true);
      expect(typeof result.plan).toBe('string');
      expect(result.plan as string).toMatch(/Scan/);
      expect(result.timings.executionMs).not.toBeNull();
    });

    it('rolls back the EXPLAIN ANALYZE transaction (no side effects)', async () => {
      // EXPLAIN ANALYZE INSERT would mutate without the rollback wrapper
      await controller.runExplain(
        'pg',
        'INSERT INTO dbg_users (id, name) VALUES (?, ?)',
        [999, 'should-not-persist'],
        1,
      );
      const result = await db.rawQuery('SELECT COUNT(*) AS c FROM dbg_users');
      const count = Number(result.rows[0].c);
      expect(count).toBe(2);
    });
  }

  if (engine === 'mysql84' || engine === 'mysql57') {
    it('returns an array plan', async () => {
      const result = await controller.runExplain(
        'mysql2',
        'SELECT * FROM dbg_users WHERE id = ?',
        [1],
        2,
      );
      expect(result.supported).toBe(true);
      expect(Array.isArray(result.plan)).toBe(true);
    });

    if (engine === 'mysql57') {
      it('falls back to plain EXPLAIN on pre-8.0 and notes it', async () => {
        const result = await controller.runExplain('mysql2', 'SELECT * FROM dbg_users', [], 1);
        expect(result.note).toMatch(/EXPLAIN ANALYZE requires MySQL 8\.0/);
      });
    }
  }

});
