import { describe, it, expect, beforeEach } from 'vitest';
import { RingBuffer } from '../src/store.ts';
import DebugbarController from '../src/debugbar_controller.ts';
import { setDbRef } from '../src/db_ref.ts';

describe('RingBuffer', () => {
  it('stores and retrieves an entry by id', () => {
    const buf = new RingBuffer(10);
    const entry = { id: 'abc' } as any;
    buf.push(entry);
    expect(buf.get('abc')).toBe(entry);
  });

  it('returns undefined for unknown ids', () => {
    const buf = new RingBuffer(10);
    expect(buf.get('missing')).toBeUndefined();
  });

  it('evicts the oldest entry when capacity is exceeded', () => {
    const buf = new RingBuffer(3);
    buf.push({ id: 'a' } as any);
    buf.push({ id: 'b' } as any);
    buf.push({ id: 'c' } as any);
    buf.push({ id: 'd' } as any);

    expect(buf.get('a')).toBeUndefined();
    expect(buf.get('b')).toBeDefined();
    expect(buf.get('c')).toBeDefined();
    expect(buf.get('d')).toBeDefined();
  });

  it('does not exceed capacity after many pushes', () => {
    const buf = new RingBuffer(5);
    for (let i = 0; i < 20; i++) buf.push({ id: String(i) } as any);
    expect(buf.list().length).toBe(5);
  });

  it('list() returns entries newest-first', () => {
    const buf = new RingBuffer(10);
    buf.push({ id: 'first' } as any);
    buf.push({ id: 'second' } as any);
    buf.push({ id: 'third' } as any);
    const ids = buf.list().map((e) => e.id);
    expect(ids).toEqual(['third', 'second', 'first']);
  });

  it('list() returns empty array when buffer is empty', () => {
    const buf = new RingBuffer(10);
    expect(buf.list()).toEqual([]);
  });
});

describe('runExplain — unsupported engines (no DB required)', () => {
  let controller: DebugbarController;

  beforeEach(() => {
    setDbRef(undefined);
    controller = new DebugbarController();
  });

  it('reports unsupported for better-sqlite3 with a SQLite note', async () => {
    const result = await controller.runExplain('better-sqlite3', 'SELECT 1', [], 1);
    expect(result.supported).toBe(false);
    expect(result.note).toMatch(/SQLite/);
  });

  it('reports unsupported for sqlite3 with a SQLite note', async () => {
    const result = await controller.runExplain('sqlite3', 'SELECT 1', [], 1);
    expect(result.supported).toBe(false);
    expect(result.note).toMatch(/SQLite/);
  });

  it('reports unsupported for mssql with guidance', async () => {
    const result = await controller.runExplain('mssql', 'SELECT 1', [], 1);
    expect(result.supported).toBe(false);
    expect(result.note).toMatch(/MSSQL/);
  });

  it('reports unsupported for oracledb with guidance', async () => {
    const result = await controller.runExplain('oracledb', 'SELECT 1', [], 1);
    expect(result.supported).toBe(false);
    expect(result.note).toMatch(/Oracle/i);
  });
});
