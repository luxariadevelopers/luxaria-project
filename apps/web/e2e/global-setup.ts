import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { request } from '@playwright/test';
import { seedE2eData, writeRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

export default async function globalSetup(): Promise<void> {
  const emptyStorage = JSON.stringify({ cookies: [], origins: [] });

  if (!isLiveApi()) {
    await mkdir(path.dirname(e2eEnv.paths.adminAuth), { recursive: true });
    for (const authPath of [
      e2eEnv.paths.adminAuth,
      e2eEnv.paths.limitedAuth,
      e2eEnv.paths.salesApproverAuth,
      e2eEnv.paths.financeApproverAuth,
      e2eEnv.paths.purchaseApproverAuth,
      e2eEnv.paths.financeManagerAuth,
    ]) {
      await writeFile(authPath, emptyStorage, 'utf8');
    }
    await writeRuntimeState({ liveApi: false });
    return;
  }

  const apiContext = await request.newContext();
  try {
    await seedE2eData(apiContext);
  } finally {
    await apiContext.dispose();
  }
}
