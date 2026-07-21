import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { APIRequestContext } from '@playwright/test';
import { createApiClient } from './api-client';
import {
  e2eEnv,
  type E2eRuntimeState,
} from './test-env';

export async function writeRuntimeState(state: E2eRuntimeState): Promise<void> {
  await mkdir(path.dirname(e2eEnv.paths.runtime), { recursive: true });
  await writeFile(e2eEnv.paths.runtime, JSON.stringify(state, null, 2), 'utf8');
}

export async function readRuntimeState(): Promise<E2eRuntimeState | null> {
  try {
    const raw = await import('node:fs/promises').then((fs) =>
      fs.readFile(e2eEnv.paths.runtime, 'utf8'),
    );
    return JSON.parse(raw) as E2eRuntimeState;
  } catch {
    return null;
  }
}

export async function seedE2eData(request: APIRequestContext): Promise<E2eRuntimeState> {
  const api = await createApiClient(request);

  try {
    await api.waitForHealth();
    const adminUserId = await api.bootstrapAdmin();

    const adminSession = await api.login(
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );
    const adminApi = api.withToken(adminSession.accessToken);

    let project = (await adminApi.listProjects()).find(
      (item) => item.projectName === e2eEnv.project.name,
    );
    if (!project) {
      project = await adminApi.createProject(e2eEnv.project.name);
    }

    const limitedRoleId = await adminApi.ensureLimitedRole();
    const limitedUserId = await adminApi.ensureLimitedUser(limitedRoleId);

    const salesApproverUserId = await adminApi.ensureActorUser(
      e2eEnv.salesApprover,
      project.id,
    );
    const financeApproverUserId = await adminApi.ensureActorUser(
      e2eEnv.financeApprover,
      project.id,
    );
    const purchaseApproverUserId = await adminApi.ensureActorUser(
      e2eEnv.purchaseApprover,
      project.id,
    );
    const financeManagerUserId = await adminApi.ensureActorUser(
      e2eEnv.financeManager,
      project.id,
    );

    const suffix = `seed-${Date.now()}`;
    const master = await adminApi.ensureGoldenPathMasterData(project.id, suffix);

    const state: E2eRuntimeState = {
      liveApi: true,
      adminUserId,
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.projectName,
      limitedRoleId,
      limitedUserId,
      salesApproverUserId,
      financeApproverUserId,
      purchaseApproverUserId,
      financeManagerUserId,
      master,
    };

    await writeRuntimeState(state);
    return state;
  } catch (error) {
    const state: E2eRuntimeState = {
      liveApi: true,
      seedFailed: true,
      seedError: error instanceof Error ? error.message : String(error),
    };
    await writeRuntimeState(state);
    throw error;
  }
}
