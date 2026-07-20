import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { GOLDEN_PATH_ADMIN } from './seed-ids';

export type GoldenPathAuth = {
  adminToken: string;
  adminUserId: string;
};

export async function bootstrapGoldenPathAdmin(
  app: INestApplication,
): Promise<GoldenPathAuth> {
  const server = app.getHttpServer();

  const bootstrap = await request(server)
    .post('/api/v1/auth/bootstrap-admin')
    .send({
      fullName: GOLDEN_PATH_ADMIN.fullName,
      email: GOLDEN_PATH_ADMIN.email,
      mobile: GOLDEN_PATH_ADMIN.mobile,
      password: GOLDEN_PATH_ADMIN.password,
    })
    .expect(201);

  const adminUserId = bootstrap.body.data.id as string;

  const login = await request(server)
    .post('/api/v1/auth/login')
    .send({
      identifier: GOLDEN_PATH_ADMIN.email,
      password: GOLDEN_PATH_ADMIN.password,
      deviceName: 'golden-path-e2e',
    })
    .expect(201);

  return {
    adminToken: login.body.data.accessToken as string,
    adminUserId,
  };
}

export async function loginAsRoleUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ identifier: email, password, deviceName: 'golden-path-e2e' })
    .expect(201);

  return login.body.data.accessToken as string;
}

export async function createRoleBoundUser(
  app: INestApplication,
  adminToken: string,
  input: {
    fullName: string;
    email: string;
    password: string;
    roleCode?: string;
    roleCodes?: string[];
    projectId: string;
  },
): Promise<{ userId: string; token: string }> {
  const connection = app.get<Connection>(getConnectionToken());
  const roleCodes = input.roleCodes ?? (input.roleCode ? [input.roleCode] : []);
  const roles = await connection
    .collection('roles')
    .find({ code: { $in: roleCodes }, status: 'active' })
    .toArray();
  if (roles.length !== roleCodes.length) {
    throw new Error(`Roles ${roleCodes.join(', ')} not found for golden-path role test`);
  }

  const created = await request(app.getHttpServer())
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      roleIds: roles.map((role) => String(role._id)),
      assignedProjects: [input.projectId],
    })
    .expect(201);

  const userId = created.body.data.id as string;
  const token = await loginAsRoleUser(app, input.email, input.password);
  return { userId, token };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
