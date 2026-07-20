import path from 'node:path';
import { fileURLToPath } from 'node:url';

const e2eRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** True when tests should hit a live Nest API (CI or explicit local flag). */
export function isLiveApi(): boolean {
  return process.env.E2E_LIVE_API === 'true' || process.env.CI === 'true';
}

export const e2eEnv = {
  apiBaseUrl:
    process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:9000/api/v1',
  admin: {
    identifier:
      process.env.E2E_ADMIN_IDENTIFIER ?? 'e2e-admin@luxaria.test',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'E2eAdminPass123!',
    fullName: process.env.E2E_ADMIN_FULL_NAME ?? 'E2E Admin',
    mobile: process.env.E2E_ADMIN_MOBILE ?? '9000000001',
  },
  limited: {
    identifier:
      process.env.E2E_LIMITED_IDENTIFIER ?? 'e2e-limited@luxaria.test',
    password: process.env.E2E_LIMITED_PASSWORD ?? 'E2eLimitedPass123!',
    fullName: process.env.E2E_LIMITED_FULL_NAME ?? 'E2E Limited User',
    mobile: process.env.E2E_LIMITED_MOBILE ?? '9000000002',
  },
  project: {
    name: process.env.E2E_PROJECT_NAME ?? 'E2E Smoke Project',
  },
  limitedRoleCode: process.env.E2E_LIMITED_ROLE_CODE ?? 'E2E_DASHBOARD_ONLY',
  paths: {
    root: e2eRoot,
    runtime: path.join(e2eRoot, '.e2e', 'runtime.json'),
    adminAuth: path.join(e2eRoot, '.auth', 'admin.json'),
    limitedAuth: path.join(e2eRoot, '.auth', 'limited.json'),
  },
} as const;

export type E2eRuntimeState = {
  liveApi: boolean;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  limitedRoleId?: string;
  limitedUserId?: string;
};
