import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { startMemoryReplicaSet, type MemoryMongo } from '../mongo-test.helper';
import { applyGoldenPathEnv } from './env';

export type GoldenPathApp = {
  app: INestApplication;
  module: TestingModule;
  mongo: MemoryMongo;
  close: () => Promise<void>;
};

let appModuleLoaded = false;

function loadAppModuleClass(): new (...args: never[]) => unknown {
  if (!appModuleLoaded) {
    appModuleLoaded = true;
  }
  // AppModule must be required only after applyGoldenPathEnv sets MONGODB_URI.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../../src/app.module') as typeof import('../../../src/app.module');
  return mod.AppModule;
}

/**
 * Boots the full Nest application against an in-memory MongoDB for cross-module E2E.
 */
export async function createGoldenPathApp(): Promise<GoldenPathApp> {
  const mongo = await startMemoryReplicaSet();
  applyGoldenPathEnv(mongo.uri);

  // Jest runs this suite in a CommonJS VM. Keep both application imports
  // deferred until after the per-test Mongo URI has been installed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createApiApp } = require('../create-api-app') as typeof import('../create-api-app');
  const AppModule = loadAppModuleClass();
  const created = await createApiApp({ imports: [AppModule] });

  return {
    app: created.app,
    module: created.module,
    mongo,
    close: async () => {
      await created.app.close();
      await mongo.stop();
    },
  };
}
