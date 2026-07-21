/**
 * R-003B seeded HTTP IDOR — real Nest app, JWT + RBAC + project guard + services.
 */
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types, type Connection } from 'mongoose';
import request from 'supertest';
import {
  authHeader,
  bootstrapGoldenPathAdmin,
  createRoleBoundUser,
} from './helpers/golden-path/auth';
import {
  createGoldenPathApp,
  type GoldenPathApp,
} from './helpers/golden-path/create-golden-path-app';
import {
  seedGoldenPathMasterData,
  type GoldenPathMasterData,
} from './helpers/golden-path/seed-master-data';

describe('R-003B seeded HTTP IDOR (Company A Project A/B)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let connection: Connection;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let projectAId: string;
  let projectBId: string;
  let staffOnlyAToken: string;
  let staffOnlyBToken: string;
  let noProjectToken: string;

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    connection = app.get<Connection>(getConnectionToken());
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);
    projectAId = master.projectId;

    // Project B in same (primary) company
    const projectBRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set(authHeader(adminToken))
      .send({
        projectName: `R003B Project B ${Date.now()}`,
        projectType: 'residential',
        address: {
          line1: '2 Isolation Rd',
          city: 'Chennai',
          state: 'TN',
          pincode: '600002',
          country: 'IN',
        },
      });
    if (projectBRes.status !== 201) {
      throw new Error(
        `Project B create failed: ${projectBRes.status} ${JSON.stringify(projectBRes.body)}`,
      );
    }
    projectBId = projectBRes.body.data.id as string;

    staffOnlyAToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'R003B Staff A Only',
        email: `r003b-staff-a-${Date.now()}@luxaria.test`,
        password: 'R003B!StaffAOnly99',
        roleCodes: ['PROJECT_MANAGER'],
        projectId: projectAId,
      })
    ).token;

    staffOnlyBToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'R003B Staff B Only',
        email: `r003b-staff-b-${Date.now()}@luxaria.test`,
        password: 'R003B!StaffBOnly99',
        roleCodes: ['PROJECT_MANAGER'],
        projectId: projectBId,
      })
    ).token;

    // Permission but no project assignment
    const roles = await connection
      .collection('roles')
      .find({ code: 'PROJECT_MANAGER', status: 'active' })
      .toArray();
    const noProjEmail = `r003b-noproj-${Date.now()}@luxaria.test`;
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(authHeader(adminToken))
      .send({
        fullName: 'R003B No Project',
        email: noProjEmail,
        password: 'R003B!NoProject99',
        roleIds: roles.map((r) => String(r._id)),
        assignedProjects: [],
      })
      .expect(201);
    const loginNoProj = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: noProjEmail,
        password: 'R003B!NoProject99',
        deviceName: 'r003b-e2e',
      })
      .expect(201);
    noProjectToken = loginNoProj.body.data.accessToken as string;
  }, 180_000);

  afterAll(async () => {
    await harness.close();
  });

  it('requires project.close to create a terminal-status project', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set(authHeader(staffOnlyAToken))
      .send({
        projectName: `R003B Forbidden Terminal ${Date.now()}`,
        projectType: 'residential',
        address: {
          line1: '3 Isolation Rd',
          city: 'Chennai',
          state: 'TN',
          pincode: '600003',
          country: 'IN',
        },
        status: 'Cancelled',
      })
      .expect(403);
  });

  it('same project + permission → project read allowed', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectAId}`)
      .set(authHeader(staffOnlyAToken))
      .set('X-Project-Id', projectAId)
      .expect(200);
  });

  it('same company foreign project → denied', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectBId}`)
      .set(authHeader(staffOnlyAToken))
      .set('X-Project-Id', projectBId);
    expect([403, 404]).toContain(res.status);
  });

  it('header/path project mismatch → denied', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectAId}`)
      .set(authHeader(staffOnlyAToken))
      .set('X-Project-Id', projectBId);
    expect(res.status).toBe(403);
  });

  it('permission without assignment → denied', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectAId}`)
      .set(authHeader(noProjectToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('staff B cannot read project A dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectAId}/dashboard`)
      .set(authHeader(staffOnlyBToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('journals list with foreign X-Project-Id → denied', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/journals')
      .query({ projectId: projectAId })
      .set(authHeader(staffOnlyBToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('purchase-orders list scoped — foreign project query denied', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .query({ projectId: projectAId })
      .set(authHeader(staffOnlyBToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('documents list with foreign projectId → denied', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/documents')
      .query({
        entityType: 'project',
        entityId: projectAId,
        projectId: projectAId,
      })
      .set(authHeader(staffOnlyBToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('project-access check endpoint denies foreign project', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/project-access/check/${projectAId}`)
      .set(authHeader(staffOnlyBToken));
    expect(res.status).toBe(403);
  });

  it('authorised staff A can check project A', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/project-access/check/${projectAId}`)
      .set(authHeader(staffOnlyAToken))
      .expect(200);
  });

  it('foreign resource id on purchase-order get → denied', async () => {
    const fakeId = new Types.ObjectId().toHexString();
    const res = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${fakeId}`)
      .set(authHeader(staffOnlyAToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('finance dashboard with foreign projectId → denied', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/finance-dashboard/summary')
      .query({ projectId: projectAId })
      .set(authHeader(staffOnlyBToken))
      .set('X-Project-Id', projectAId);
    expect([403, 404]).toContain(res.status);
  });

  it('unclassified-style mismatch body vs header on project-access create check', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/project-access/check/${projectAId}/create`)
      .set(authHeader(staffOnlyAToken))
      .set('X-Project-Id', projectBId)
      .send({});
    expect(res.status).toBe(403);
  });
});
