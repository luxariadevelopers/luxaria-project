import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  bootstrapGoldenPathAdmin,
  createRoleBoundUser,
} from './helpers/golden-path/auth';
import { cleanupGoldenPathProjectData } from './helpers/golden-path/cleanup';
import {
  createGoldenPathApp,
  type GoldenPathApp,
} from './helpers/golden-path/create-golden-path-app';
import { GOLDEN_PATH_DATES } from './helpers/golden-path/seed-ids';
import {
  seedGoldenPathMasterData,
  type GoldenPathMasterData,
} from './helpers/golden-path/seed-master-data';

describe('Golden path: petty cash → expense → posting (e2e)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let pettyCashAccountId: string;
  let financeReviewerToken: string;
  let financeApproverToken: string;
  let financePosterToken: string;

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);
    financeReviewerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Finance Reviewer',
        email: 'gp-finance-reviewer@luxaria.test',
        password: 'GoldenPath138!Review',
        roleCodes: ['PROJECT_MANAGER', 'FINANCE_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
    financeApproverToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Finance Approver',
        email: 'gp-finance-approver@luxaria.test',
        password: 'GoldenPath138!Approve',
        roleCodes: ['FINANCE_DIRECTOR', 'FINANCE_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
    financePosterToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Finance Poster',
        email: 'gp-finance-poster@luxaria.test',
        password: 'GoldenPath138!Post',
        roleCodes: ['FINANCE_DIRECTOR', 'FINANCE_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await cleanupGoldenPathProjectData(app);
    const cashRes = await request(app.getHttpServer())
      .post('/api/v1/cash-accounts')
      .set(authHeader(adminToken))
      .send({
        accountName: 'GP Petty Cash Float',
        kind: 'petty_cash',
        projectId: master.projectId,
        custodianUserId: master.adminUserId,
        ledgerAccountId: '507f1f77bcf86cd799439019',
        maximumHoldingLimit: 50_000,
        replenishmentLevel: 10_000,
        openingBalance: 5_000,
      })
      .expect(201);
    pettyCashAccountId = cashRes.body.data.id as string;
  });

  it('funds petty cash, records site expense, and posts journal', async () => {
    const server = app.getHttpServer();
    const auth = authHeader(adminToken);

    const reqRes = await request(server)
      .post('/api/v1/petty-cash-requirements')
      .set(auth)
      .send({
        projectId: master.projectId,
        pettyCashAccountId,
        weekStartDate: GOLDEN_PATH_DATES.weekStart,
        weekEndDate: GOLDEN_PATH_DATES.weekEnd,
        requirementItems: [
          {
            expenseCategory: 'transport',
            description: 'Site jeep hire',
            estimatedAmount: 5_000,
          },
        ],
        justification: 'Weekly float for golden path',
      })
      .expect(201);

    const requirementId = reqRes.body.data.id as string;

    await request(server)
      .post(`/api/v1/petty-cash-requirements/${requirementId}/submit`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/petty-cash-requirements/${requirementId}/project-manager-approve`)
      .set(authHeader(financeReviewerToken))
      .send({ comment: 'PM OK' })
      .expect(201);
    await request(server)
      .post(`/api/v1/petty-cash-requirements/${requirementId}/finance-approve`)
      .set(authHeader(financeApproverToken))
      .send({ approvedAmount: 5_000, comment: 'Finance OK' })
      .expect(201);
    const funded = await request(server)
      .post(`/api/v1/petty-cash-requirements/${requirementId}/fund`)
      .set(authHeader(financePosterToken))
      .send({ fundedAmount: 5_000 })
      .expect(201);
    expect(funded.body.data.status).toBe('funded');

    const voucherRes = await request(server)
      .post('/api/v1/site-expense-vouchers')
      .set(auth)
      .send({
        projectId: master.projectId,
        pettyCashAccountId,
        expenseDate: GOLDEN_PATH_DATES.expenseDate,
        expenseCategoryId: master.expenseCategoryId,
        amount: 1_500,
        paidTo: 'Golden Path Driver',
        purpose: 'Golden path transport expense',
        paymentMode: 'cash',
        billNumber: 'GP-BILL-138',
        billDate: GOLDEN_PATH_DATES.expenseDate,
        latitude: 13.0827,
        longitude: 80.2707,
        attachments: [
          {
            type: 'bill',
            fileName: 'bill.jpg',
            filePath: 'uploads/golden-path/bill.jpg',
          },
          {
            type: 'photo',
            fileName: 'photo.jpg',
            filePath: 'uploads/golden-path/photo.jpg',
          },
        ],
      })
      .expect(201);

    const voucherId = voucherRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/site-expense-vouchers/${voucherId}/submit`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/site-expense-vouchers/${voucherId}/verify`)
      .set(authHeader(financeReviewerToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/site-expense-vouchers/${voucherId}/approve`)
      .set(authHeader(financeApproverToken))
      .expect(201);
    const posted = await request(server)
      .post(`/api/v1/site-expense-vouchers/${voucherId}/post`)
      .set(authHeader(financePosterToken))
      .expect(201);

    expect(posted.body.data.status).toBe('posted');
    expect(posted.body.data.journalEntryId).toBeTruthy();
  });

  it('denies expense posting to site engineer without expense.post', async () => {
    const engineer = await createRoleBoundUser(app, adminToken, {
      fullName: 'GP Site Engineer',
      email: 'gp-site-engineer@luxaria.test',
      password: 'GoldenPath138!Site',
      roleCode: 'SITE_ENGINEER',
      projectId: master.projectId,
    });

    const voucherRes = await request(app.getHttpServer())
      .post('/api/v1/site-expense-vouchers')
      .set(authHeader(engineer.token))
      .send({
        projectId: master.projectId,
        pettyCashAccountId,
        expenseDate: GOLDEN_PATH_DATES.expenseDate,
        expenseCategoryId: master.expenseCategoryId,
        amount: 500,
        paidTo: 'Tea vendor',
        purpose: 'Tea expense',
        paymentMode: 'cash',
        billNumber: 'GP-BILL-TEA',
        billDate: GOLDEN_PATH_DATES.expenseDate,
        latitude: 13.0827,
        longitude: 80.2707,
        attachments: [
          { type: 'bill', filePath: 'uploads/golden-path/tea-bill.jpg' },
          { type: 'photo', filePath: 'uploads/golden-path/tea-photo.jpg' },
        ],
      })
      .expect(201);

    const voucherId = voucherRes.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/site-expense-vouchers/${voucherId}/submit`)
      .set(authHeader(adminToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/site-expense-vouchers/${voucherId}/verify`)
      .set(authHeader(financeReviewerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/site-expense-vouchers/${voucherId}/approve`)
      .set(authHeader(financeApproverToken))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/site-expense-vouchers/${voucherId}/post`)
      .set(authHeader(engineer.token))
      .expect(403);
  });
});
