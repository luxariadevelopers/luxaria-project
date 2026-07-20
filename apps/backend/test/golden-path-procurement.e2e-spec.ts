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

const address = {
  line1: 'Golden Path Site Road',
  line2: null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  country: 'India',
};

describe('Golden path: PR → PO → GRN → invoice → payment (e2e)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let purchaseManagerToken: string;
  let financeManagerToken: string;

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);
    purchaseManagerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Purchase Manager',
        email: 'gp-purchase-manager@luxaria.test',
        password: 'GoldenPath138!Purchase',
        roleCodes: ['PROJECT_MANAGER', 'PURCHASE_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
    financeManagerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Finance Manager',
        email: 'gp-finance-manager@luxaria.test',
        password: 'GoldenPath138!Finance',
        roleCodes: ['FINANCE_DIRECTOR', 'FINANCE_MANAGER', 'PURCHASE_MANAGER'],
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

  it('runs procurement through payment posting via HTTP APIs', async () => {
    const server = app.getHttpServer();
    const auth = authHeader(adminToken);

    const prRes = await request(server)
      .post('/api/v1/purchase-requests')
      .set(auth)
      .send({
        projectId: master.projectId,
        requiredByDate: GOLDEN_PATH_DATES.requiredBy,
        justification: 'Golden path slab pour',
        items: [
          {
            materialId: master.materialId,
            requestedQuantity: 40,
            unit: 'bag',
          },
        ],
      })
      .expect(201);

    const prId = prRes.body.data.id as string;
    const prLineId = prRes.body.data.items[0].id as string;

    await request(server).post(`/api/v1/purchase-requests/${prId}/submit`).set(auth).expect(201);
    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/review`)
      .set(auth)
      .send({ notes: 'Reviewed for golden path' })
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set(auth)
      .send({ items: [{ lineId: prLineId, approvedQuantity: 40 }] })
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/start-sourcing`)
      .set(auth)
      .expect(201);

    const vqRes = await request(server)
      .post('/api/v1/vendor-quotations')
      .set(auth)
      .send({
        purchaseRequestId: prId,
        vendorId: master.vendorId,
        quotationDate: GOLDEN_PATH_DATES.orderDate,
        validityDate: GOLDEN_PATH_DATES.requiredBy,
        deliveryDays: 7,
        paymentTerms: 'Net 30',
        freight: 500,
        taxes: 100,
        discount: 0,
        items: [
          {
            materialId: master.materialId,
            quantity: 40,
            unit: 'bag',
            rate: 380,
            tax: 684,
            discount: 0,
          },
        ],
      })
      .expect(201);

    const quotationId = vqRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/vendor-quotations/${quotationId}/submit`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-quotations/${quotationId}/mark-final`)
      .set(auth)
      .expect(201);

    const poRes = await request(server)
      .post('/api/v1/purchase-orders')
      .set(auth)
      .send({
        projectId: master.projectId,
        purchaseRequestId: prId,
        selectedQuotationId: quotationId,
        orderDate: GOLDEN_PATH_DATES.orderDate,
        expectedDeliveryDate: GOLDEN_PATH_DATES.deliveryDate,
        billingAddress: address,
        deliveryAddress: address,
        terms: 'Golden path PO terms',
      })
      .expect(201);

    const poId = poRes.body.data.id as string;
    const poLineId = poRes.body.data.items[0].id as string;

    await request(server)
      .post(`/api/v1/purchase-orders/${poId}/submit-approval`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-orders/${poId}/approve`)
      .set(authHeader(purchaseManagerToken))
      .send({ comment: 'PO approved' })
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-orders/${poId}/approve`)
      .set(authHeader(financeManagerToken))
      .send({ comment: 'Finance approved PO' })
      .expect(201);

    const grnRes = await request(server)
      .post('/api/v1/goods-receipts')
      .set(auth)
      .send({
        projectId: master.projectId,
        purchaseOrderId: poId,
        vendorId: master.vendorId,
        receivedDate: GOLDEN_PATH_DATES.receivedDate,
        items: [
          {
            materialId: master.materialId,
            purchaseOrderLineId: poLineId,
            orderedQuantity: 40,
            receivedQuantity: 40,
            unit: 'bag',
          },
        ],
        photos: ['golden-path-grn.jpg'],
        latitude: 13.0827,
        longitude: 80.2707,
        submit: true,
      })
      .expect(201);

    const grnId = grnRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/goods-receipts/${grnId}/quality-check`)
      .set(auth)
      .expect(201);
    const grnLineId = grnRes.body.data.items[0].id as string;
    await request(server)
      .post(`/api/v1/goods-receipts/${grnId}/accept`)
      .set(auth)
      .send({
        items: [
          {
            lineId: grnLineId,
            acceptedQuantity: 40,
            rejectedQuantity: 0,
          },
        ],
      })
      .expect(201);
    const grnPosted = await request(server)
      .post(`/api/v1/goods-receipts/${grnId}/post`)
      .set(auth)
      .expect(201);
    expect(grnPosted.body.data.status).toBe('posted');

    const invRes = await request(server)
      .post('/api/v1/vendor-invoices')
      .set(auth)
      .send({
        invoiceNumber: 'GP-VINV-138-001',
        vendorId: master.vendorId,
        projectId: master.projectId,
        purchaseOrderId: poId,
        grnIds: [grnId],
        invoiceDate: GOLDEN_PATH_DATES.invoiceDate,
        dueDate: GOLDEN_PATH_DATES.requiredBy,
        taxableValue: 15200,
        gst: 0,
        tds: 0,
        retention: 0,
        freight: 0,
        totalAmount: 15200,
        items: [
          {
            materialId: master.materialId,
            purchaseOrderLineId: poLineId,
            quantity: 40,
            unit: 'bag',
            rate: 380,
          },
        ],
      })
      .expect(201);

    const invoiceId = invRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/vendor-invoices/${invoiceId}/submit`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-invoices/${invoiceId}/verify`)
      .set(authHeader(purchaseManagerToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-invoices/${invoiceId}/match`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-invoices/${invoiceId}/approve`)
      .set(auth)
      .send({ exceptionApprovalComment: 'Accepted within golden-path test tolerance' })
      .expect(201);
    const invPosted = await request(server)
      .post(`/api/v1/vendor-invoices/${invoiceId}/post`)
      .set(auth)
      .expect(201);
    expect(invPosted.body.data.status).toBe('posted');

    const payRes = await request(server)
      .post('/api/v1/vendor-payments')
      .set(auth)
      .send({
        vendorId: master.vendorId,
        projectId: master.projectId,
        allocations: [{ invoiceId, amount: 15200 }],
        paymentDate: GOLDEN_PATH_DATES.paymentDate,
        amount: 15200,
        paymentMode: 'neft',
        bankAccountId: master.companyBankAccountId,
        transactionReference: 'GP-UTR-PROC-138',
      })
      .expect(201);

    const paymentId = payRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/vendor-payments/${paymentId}/submit`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-payments/${paymentId}/approve`)
      .set(authHeader(financeManagerToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-payments/${paymentId}/release`)
      .set(auth)
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-payments/${paymentId}/verify`)
      .set(auth)
      .expect(201);
    const payPosted = await request(server)
      .post(`/api/v1/vendor-payments/${paymentId}/post`)
      .set(auth)
      .expect(201);

    expect(payPosted.body.data.status).toBe('posted');
    expect(payPosted.body.data.journalEntryId).toBeTruthy();
  });

  it('denies vendor payment release to purchase executive (role boundary)', async () => {
    const limited = await createRoleBoundUser(app, adminToken, {
      fullName: 'GP Purchase Executive',
      email: 'gp-purchase-exec@luxaria.test',
      password: 'GoldenPath138!Exec',
      roleCode: 'PURCHASE_EXECUTIVE',
      projectId: master.projectId,
    });

    await request(app.getHttpServer())
      .post('/api/v1/vendor-payments')
      .set(authHeader(limited.token))
      .send({
        vendorId: master.vendorId,
        projectId: master.projectId,
        allocations: [{ invoiceId: '507f1f77bcf86cd799439099', amount: 100 }],
        paymentDate: GOLDEN_PATH_DATES.paymentDate,
        amount: 100,
        paymentMode: 'neft',
        bankAccountId: master.companyBankAccountId,
        transactionReference: 'GP-UTR-DENY',
      })
      .expect(403);
  });
});
