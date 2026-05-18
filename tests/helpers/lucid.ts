import { Database } from '@adonisjs/lucid/database';
import { Emitter } from '@adonisjs/core/events';
import { AppFactory } from '@adonisjs/core/factories/app';
import { LoggerFactory } from '@adonisjs/core/factories/logger';

export async function makeDb(connection: any) {
  const app = new AppFactory().create(new URL('./', import.meta.url), () => {});
  await app.init();

  const logger = new LoggerFactory().create();
  const emitter = new Emitter<any>(app);

  const db = new Database(
    {
      connection: 'primary',
      connections: { primary: connection },
    },
    logger,
    emitter,
  );

  return {
    db,
    emitter,
    dispose: async () => {
      await db.manager.closeAll();
    },
  };
}

export const dbConfigs = {
  pg17: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 55017,
      user: 'test',
      password: 'test',
      database: 'test',
    },
  },
  pg13: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 55013,
      user: 'test',
      password: 'test',
      database: 'test',
    },
  },
  mysql84: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 33084,
      user: 'root',
      password: 'test',
      database: 'test',
    },
  },
  mysql57: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 33057,
      user: 'root',
      password: 'test',
      database: 'test',
    },
  },
} as const;

export type EngineKey = keyof typeof dbConfigs;
