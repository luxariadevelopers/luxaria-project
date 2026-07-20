import type { APIRequestContext, APIResponse } from '@playwright/test';
import { e2eEnv } from './test-env';

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type LoginData = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    userCode: string;
    fullName: string;
    email: string | null;
    mobile: string | null;
    status: string;
  };
};

export type ProjectSummary = {
  id: string;
  projectCode: string;
  projectName: string;
  status?: string;
};

export class E2eApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly accessToken?: string,
  ) {}

  withToken(accessToken: string): E2eApiClient {
    return new E2eApiClient(this.request, accessToken);
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken
        ? { Authorization: `Bearer ${this.accessToken}` }
        : {}),
      ...extra,
    };
  }

  private url(path: string): string {
    const base = e2eEnv.apiBaseUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async get(path: string): Promise<APIResponse> {
    return this.request.get(this.url(path), { headers: this.headers() });
  }

  async post(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(this.url(path), {
      headers: this.headers(),
      data,
    });
  }

  async waitForHealth(timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        const res = await this.get('/health');
        if (res.ok()) {
          const body = (await res.json()) as ApiEnvelope<{ status?: string }>;
          if (body.success) {
            return;
          }
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new Error(
      `API health check timed out at ${e2eEnv.apiBaseUrl}/health${
        lastError ? `: ${String(lastError)}` : ''
      }`,
    );
  }

  async bootstrapAdmin(): Promise<void> {
    const res = await this.post('/auth/bootstrap-admin', {
      fullName: e2eEnv.admin.fullName,
      email: e2eEnv.admin.identifier,
      mobile: e2eEnv.admin.mobile,
      password: e2eEnv.admin.password,
    });

    if (res.status() === 409) {
      return;
    }

    if (!res.ok()) {
      throw new Error(
        `bootstrap-admin failed (${res.status()}): ${await res.text()}`,
      );
    }
  }

  async login(identifier: string, password: string): Promise<LoginData> {
    const res = await this.post('/auth/login', {
      identifier,
      password,
      deviceName: 'playwright-e2e',
    });

    if (!res.ok()) {
      throw new Error(`login failed (${res.status()}): ${await res.text()}`);
    }

    const body = (await res.json()) as ApiEnvelope<LoginData>;
    if (!body.data?.accessToken) {
      throw new Error('login response missing accessToken');
    }
    return body.data;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const res = await this.get('/projects?page=1&limit=100');
    if (!res.ok()) {
      throw new Error(`list projects failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as ApiEnvelope<ProjectSummary[]>;
    return body.data ?? [];
  }

  async createProject(name: string): Promise<ProjectSummary> {
    const res = await this.post('/projects', {
      projectName: name,
      projectType: 'residential',
      address: {
        line1: 'E2E Test Site',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      startDate: '2026-01-01',
      expectedCompletionDate: '2027-12-31',
      landArea: 10000,
      numberOfUnits: 10,
    });

    if (!res.ok()) {
      throw new Error(`create project failed (${res.status()}): ${await res.text()}`);
    }

    const body = (await res.json()) as ApiEnvelope<ProjectSummary>;
    if (!body.data?.id) {
      throw new Error('create project response missing id');
    }
    return body.data;
  }

  async ensureLimitedRole(): Promise<string> {
    const listRes = await this.get(
      `/rbac/roles?search=${encodeURIComponent(e2eEnv.limitedRoleCode)}&limit=20`,
    );
    if (!listRes.ok()) {
      throw new Error(
        `list roles failed (${listRes.status()}): ${await listRes.text()}`,
      );
    }

    const listBody = (await listRes.json()) as ApiEnvelope<
      Array<{ id: string; code: string }>
    >;
    const existing = listBody.data?.find(
      (role) => role.code === e2eEnv.limitedRoleCode,
    );
    if (existing?.id) {
      return existing.id;
    }

    const createRes = await this.post('/rbac/roles', {
      name: 'E2E Dashboard Only',
      code: e2eEnv.limitedRoleCode,
      description: 'Playwright permission-denial smoke role',
      permissions: ['dashboard.view'],
      bypassPermissions: false,
    });

    if (!createRes.ok()) {
      throw new Error(
        `create limited role failed (${createRes.status()}): ${await createRes.text()}`,
      );
    }

    const createBody = (await createRes.json()) as ApiEnvelope<{ id: string }>;
    if (!createBody.data?.id) {
      throw new Error('create role response missing id');
    }
    return createBody.data.id;
  }

  async ensureLimitedUser(roleId: string): Promise<string> {
    const searchRes = await this.get(
      `/users?search=${encodeURIComponent(e2eEnv.limited.identifier)}&limit=5`,
    );
    if (!searchRes.ok()) {
      throw new Error(
        `search users failed (${searchRes.status()}): ${await searchRes.text()}`,
      );
    }

    const searchBody = (await searchRes.json()) as ApiEnvelope<
      Array<{ id: string; email?: string | null }>
    >;
    const existing = searchBody.data?.find(
      (user) => user.email === e2eEnv.limited.identifier,
    );
    if (existing?.id) {
      return existing.id;
    }

    const createRes = await this.post('/users', {
      fullName: e2eEnv.limited.fullName,
      email: e2eEnv.limited.identifier,
      mobile: e2eEnv.limited.mobile,
      password: e2eEnv.limited.password,
      roleIds: [roleId],
      assignedProjects: [],
    });

    if (!createRes.ok()) {
      throw new Error(
        `create limited user failed (${createRes.status()}): ${await createRes.text()}`,
      );
    }

    const createBody = (await createRes.json()) as ApiEnvelope<{ id: string }>;
    if (!createBody.data?.id) {
      throw new Error('create user response missing id');
    }
    return createBody.data.id;
  }
}

export async function createApiClient(
  request: APIRequestContext,
): Promise<E2eApiClient> {
  return new E2eApiClient(request);
}
