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

describe('Golden path: booking → collection (e2e)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let approverToken: string;
  let financeApproverToken: string;

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);
    approverToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Booking Approver',
        email: 'gp-booking-approver@luxaria.test',
        password: 'GoldenPath138!Booking',
        roleCodes: ['PROJECT_MANAGER', 'SALES_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
    financeApproverToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Collection Finance Approver',
        email: 'gp-collection-finance@luxaria.test',
        password: 'GoldenPath138!Collect',
        roleCodes: ['FINANCE_DIRECTOR', 'FINANCE_MANAGER', 'SALES_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await cleanupGoldenPathProjectData(app);
  });

  it('books a unit, demands payment, and posts customer receipt', async () => {
    const server = app.getHttpServer();
    const auth = authHeader(adminToken);

    const bookingRes = await request(server)
      .post('/api/v1/bookings')
      .set(auth)
      .send({
        customerId: master.customerId,
        projectId: master.projectId,
        unitId: master.unitId,
        bookingDate: GOLDEN_PATH_DATES.bookingDate,
        bookingAmount: 200_000,
        agreedPrice: 8_000_000,
        discount: 0,
        fundingType: 'own_funds',
        paymentPlan: {
          name: 'Golden path CLP',
          installments: [
            {
              sequence: 1,
              label: 'On booking',
              amount: 1_600_000,
              percent: 20,
              dueDate: GOLDEN_PATH_DATES.demandDue,
            },
          ],
        },
      })
      .expect(201);

    const bookingId = bookingRes.body.data.id as string;
    expect(bookingRes.body.data.status).toBe('hold');

    await request(server)
      .post(`/api/v1/bookings/${bookingId}/transition`)
      .set(auth)
      .send({ status: 'reserved' })
      .expect(201);
    const booked = await request(server)
      .post(`/api/v1/bookings/${bookingId}/transition`)
      .set(auth)
      .send({ status: 'booked' })
      .expect(201);
    expect(booked.body.data.status).toBe('booked');

    const scheduleRes = await request(server)
      .post('/api/v1/payment-schedules/generate')
      .set(auth)
      .send({
        bookingId,
        scheduleType: 'date_based',
        submit: true,
        lines: [
          {
            sequence: 1,
            milestone: 'On booking',
            dueDate: GOLDEN_PATH_DATES.demandDue,
            percentage: 100,
            amount: 8_000_000,
            tax: 0,
          },
        ],
      })
      .expect(201);

    const scheduleId = scheduleRes.body.data.id as string;
    const lineId = scheduleRes.body.data.lines[0].id as string;

    await request(server)
      .post(`/api/v1/payment-schedules/${scheduleId}/approve`)
      .set(authHeader(approverToken))
      .send({ comment: 'Schedule approved' })
      .expect(201);
    await request(server)
      .post(`/api/v1/payment-schedules/${scheduleId}/approve`)
      .set(authHeader(financeApproverToken))
      .send({ comment: 'Finance approved schedule' })
      .expect(201);

    await request(server)
      .post(`/api/v1/payment-schedules/${scheduleId}/mark-due`)
      .set(auth)
      .send({ lineId, dueDate: GOLDEN_PATH_DATES.demandDue })
      .expect(201);

    const demandRes = await request(server)
      .post(`/api/v1/payment-schedules/${scheduleId}/demands`)
      .set(auth)
      .send({ lineId })
      .expect(201);

    const demandId = demandRes.body.data.demand.id as string;

    const receiptRes = await request(server)
      .post('/api/v1/customer-receipts')
      .set(auth)
      .send({
        customerId: master.customerId,
        bookingId,
        amount: 1_600_000,
        paymentMode: 'neft',
        companyBankAccountId: master.companyBankAccountId,
        transactionReference: 'GP-UTR-COLLECT-138',
        sourceType: 'own_fund',
        scheduleAllocation: [{ demandId, amount: 1_600_000 }],
        post: true,
      })
      .expect(201);

    expect(receiptRes.body.data.status).toBe('posted');
    expect(receiptRes.body.data.journalEntryId).toBeTruthy();
    expect(receiptRes.body.data.receiptNumber).toMatch(/^CR-/);
  });

  it('denies collection posting to site engineer (role boundary)', async () => {
    const engineer = await createRoleBoundUser(app, adminToken, {
      fullName: 'GP Sales Blocked',
      email: 'gp-no-collection@luxaria.test',
      password: 'GoldenPath138!NoCol',
      roleCode: 'SITE_ENGINEER',
      projectId: master.projectId,
    });

    await request(app.getHttpServer())
      .post('/api/v1/customer-receipts')
      .set(authHeader(engineer.token))
      .send({
        customerId: master.customerId,
        bookingId: '507f1f77bcf86cd799439088',
        amount: 100_000,
        paymentMode: 'neft',
        companyBankAccountId: master.companyBankAccountId,
        transactionReference: 'GP-UTR-NOPE',
        sourceType: 'own_fund',
        post: true,
      })
      .expect(403);
  });
});
