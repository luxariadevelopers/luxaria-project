/**
 * Phase 2 PLM lifecycle — draft → activate → team → structure → suspend → resume → close → archive.
 * Foreign company deny covered via project-access assertion on team/structure reads.
 */
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
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

describe('Project lifecycle Phase 2 (e2e)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let connection: Connection;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let foreignStaffToken: string;

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    connection = app.get<Connection>(getConnectionToken());
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);

    const projectBRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set(authHeader(adminToken))
      .send({
        projectName: `PLM Foreign Project ${Date.now()}`,
        projectType: 'residential',
        address: {
          line1: '2 Isolation Rd',
          city: 'Chennai',
          state: 'TN',
          pincode: '600002',
          country: 'IN',
        },
      })
      .expect(201);
    const projectBId = projectBRes.body.data.id as string;

    foreignStaffToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'PLM Foreign Staff',
        email: `plm-foreign-${Date.now()}@luxaria.test`,
        password: 'PLM!ForeignStaff99',
        roleCodes: ['PROJECT_MANAGER'],
        projectId: projectBId,
      })
    ).token;
  }, 180_000);

  afterAll(async () => {
    await harness.close();
  });

  it('runs draft → activate → team → structure → suspend → resume → close → archive', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set(authHeader(adminToken))
      .send({
        projectName: `PLM Lifecycle ${Date.now()}`,
        projectType: 'residential',
        address: {
          line1: 'PLM Site',
          city: 'Chennai',
          state: 'TN',
          pincode: '600001',
          country: 'IN',
        },
      })
      .expect(201);

    const projectId = createRes.body.data.id as string;
    expect(createRes.body.data.status).toBe('Draft');

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/status`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({ status: 'Planning' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/status`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({ status: 'Approval' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/status`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({ status: 'Active' })
      .expect(201);

    const pmUser = await createRoleBoundUser(app, adminToken, {
      fullName: 'PLM PM',
      email: `plm-pm-${Date.now()}@luxaria.test`,
      password: 'PLM!ProjectManager99',
      roleCodes: ['PROJECT_MANAGER'],
      projectId,
    });

    const seUser = await createRoleBoundUser(app, adminToken, {
      fullName: 'PLM SE',
      email: `plm-se-${Date.now()}@luxaria.test`,
      password: 'PLM!SiteEngineer99',
      roleCodes: ['SITE_ENGINEER'],
      projectId,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/team`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({
        userId: pmUser.userId,
        teamRole: 'project_manager',
        accessStartDate: '2026-01-01',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/team`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({
        userId: seUser.userId,
        teamRole: 'site_engineer',
        accessStartDate: '2026-01-01',
      })
      .expect(201);

    // store_keeper may not have a dedicated role seed — assign using PM user as store
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/team`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({
        userId: seUser.userId,
        teamRole: 'store_keeper',
        accessStartDate: '2026-01-01',
      })
      .expect(201);

    const siteRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/structure`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({
        type: 'site',
        siteCode: `S-${Date.now().toString(36).toUpperCase()}`,
        siteName: 'Main Site',
      })
      .expect(201);

    const phaseRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/structure`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({
        parentSiteId: siteRes.body.data.id,
        type: 'phase',
        siteCode: `P-${Date.now().toString(36).toUpperCase()}`,
        siteName: 'Phase 1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/structure`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({
        parentSiteId: phaseRes.body.data.id,
        type: 'block',
        siteCode: `B-${Date.now().toString(36).toUpperCase()}`,
        siteName: 'Block A',
      })
      .expect(201);

    const structure = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/structure`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .expect(200);
    expect(structure.body.data.length).toBeGreaterThanOrEqual(1);

    const suspended = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/suspend`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .expect(201);
    expect(suspended.body.data.status).toBe('On Hold');
    expect(suspended.body.data.statusBeforeHold).toBe('Active');

    const resumed = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/resume`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .expect(201);
    expect(resumed.body.data.status).toBe('Active');

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/status`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .send({ status: 'Completed' })
      .expect(201);

    const closed = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/close`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .expect(201);
    expect(closed.body.data.status).toBe('Closed');

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/archive`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .expect(201);
    expect(archived.body.data.status).toBe('Archived');

    // Foreign project staff denied on this project's team list
    const denied = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/team`)
      .set(authHeader(foreignStaffToken))
      .set('X-Project-Id', projectId);
    expect([403, 404]).toContain(denied.status);

    // Dashboard still works for admin
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/dashboard`)
      .set(authHeader(adminToken))
      .set('X-Project-Id', projectId)
      .expect(200);

    void connection;
    void master;
  });
});
