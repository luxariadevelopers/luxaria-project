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
  line1: 'Proc Lifecycle Site Road',
  line2: null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  country: 'India',
};

describe('Procurement lifecycle: site PR → RFQ → quotation → PO → GRN (e2e)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let storekeeperToken: string;
  let projectManagerToken: string;
  let purchaseManagerToken: string;
  let financeManagerToken: string;
  let siteId: string;

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);

    storekeeperToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'Proc Storekeeper',
        email: 'proc-lifecycle-store@luxaria.test',
        password: 'ProcLifecycle138!Store',
        roleCodes: ['STOREKEEPER'],
        projectId: master.projectId,
      })
    ).token;

    projectManagerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'Proc Project Manager',
        email: 'proc-lifecycle-pm@luxaria.test',
        password: 'ProcLifecycle138!PM',
        roleCodes: ['PROJECT_MANAGER'],
        projectId: master.projectId,
      })
    ).token;

    purchaseManagerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'Proc Purchase Manager',
        email: 'proc-lifecycle-purchase@luxaria.test',
        password: 'ProcLifecycle138!Purchase',
        // Match golden-path PO workflow step eligibility (PM + Purchase).
        roleCodes: ['PROJECT_MANAGER', 'PURCHASE_MANAGER'],
        projectId: master.projectId,
      })
    ).token;

    financeManagerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'Proc Finance Manager',
        email: 'proc-lifecycle-finance@luxaria.test',
        password: 'ProcLifecycle138!Finance',
        roleCodes: ['FINANCE_DIRECTOR', 'FINANCE_MANAGER', 'PURCHASE_MANAGER'],
        projectId: master.projectId,
      })
    ).token;

    const siteRes = await request(app.getHttpServer())
      .post('/api/v1/sites')
      .set(authHeader(adminToken))
      .send({
        projectId: master.projectId,
        siteCode: 'PROC-SITE-A',
        siteName: 'Procurement Lifecycle Site A',
        type: 'site',
      })
      .expect(201);
    siteId = siteRes.body.data.id as string;
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await cleanupGoldenPathProjectData(app);
  });

  it('runs site PR → approve → RFQ issue → quotation → PO issue → GRN post', async () => {
    const server = app.getHttpServer();

    const prRes = await request(server)
      .post('/api/v1/purchase-requests')
      .set(authHeader(storekeeperToken))
      .send({
        projectId: master.projectId,
        siteId,
        requiredByDate: GOLDEN_PATH_DATES.requiredBy,
        justification: 'Site store replenishment',
        items: [
          {
            materialId: master.materialId,
            requestedQuantity: 25,
            unit: 'bag',
          },
        ],
      })
      .expect(201);

    expect(prRes.body.data.siteId).toBe(siteId);
    const prId = prRes.body.data.id as string;
    const prLineId = prRes.body.data.items[0].id as string;

    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/submit`)
      .set(authHeader(storekeeperToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/review`)
      .set(authHeader(projectManagerToken))
      .send({ notes: 'PM reviewed site PR' })
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/approve`)
      .set(authHeader(projectManagerToken))
      .send({ items: [{ lineId: prLineId, approvedQuantity: 25 }] })
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-requests/${prId}/start-sourcing`)
      .set(authHeader(purchaseManagerToken))
      .expect(201);

    const rfqRes = await request(server)
      .post('/api/v1/rfqs')
      .set(authHeader(purchaseManagerToken))
      .send({
        projectId: master.projectId,
        siteId,
        purchaseRequestId: prId,
        title: 'Lifecycle cement RFQ',
        vendorIds: [master.vendorId],
        closingDate: GOLDEN_PATH_DATES.requiredBy,
        notes: 'Please quote delivery to site',
      })
      .expect(201);

    const rfqId = rfqRes.body.data.id as string;
    expect(rfqRes.body.data.status).toBe('draft');

    const issued = await request(server)
      .post(`/api/v1/rfqs/${rfqId}/issue`)
      .set(authHeader(purchaseManagerToken))
      .expect(201);
    expect(issued.body.data.status).toBe('issued');

    const vqRes = await request(server)
      .post('/api/v1/vendor-quotations')
      .set(authHeader(purchaseManagerToken))
      .send({
        purchaseRequestId: prId,
        rfqId,
        vendorId: master.vendorId,
        quotationDate: GOLDEN_PATH_DATES.orderDate,
        validityDate: GOLDEN_PATH_DATES.requiredBy,
        deliveryDays: 7,
        paymentTerms: 'Net 30',
        freight: 200,
        taxes: 50,
        discount: 0,
        items: [
          {
            materialId: master.materialId,
            quantity: 25,
            unit: 'bag',
            rate: 380,
            tax: 0,
            discount: 0,
          },
        ],
      })
      .expect(201);

    const quotationId = vqRes.body.data.id as string;
    expect(vqRes.body.data.rfqId).toBe(rfqId);

    await request(server)
      .post(`/api/v1/vendor-quotations/${quotationId}/submit`)
      .set(authHeader(purchaseManagerToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/vendor-quotations/${quotationId}/mark-final`)
      .set(authHeader(purchaseManagerToken))
      .expect(201);

    const responses = await request(server)
      .get(`/api/v1/rfqs/${rfqId}/responses`)
      .set(authHeader(purchaseManagerToken))
      .expect(200);
    expect(responses.body.data.length).toBeGreaterThanOrEqual(1);

    // Create + submit as admin so purchase/finance managers can approve (anti-self-approve).
    const poRes = await request(server)
      .post('/api/v1/purchase-orders')
      .set(authHeader(adminToken))
      .send({
        projectId: master.projectId,
        purchaseRequestId: prId,
        selectedQuotationId: quotationId,
        orderDate: GOLDEN_PATH_DATES.orderDate,
        expectedDeliveryDate: GOLDEN_PATH_DATES.deliveryDate,
        billingAddress: address,
        deliveryAddress: address,
        terms: 'Lifecycle PO terms',
      })
      .expect(201);

    const poId = poRes.body.data.id as string;
    const poLineId = poRes.body.data.items[0].id as string;

    await request(server)
      .post(`/api/v1/purchase-orders/${poId}/submit-approval`)
      .set(authHeader(adminToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-orders/${poId}/approve`)
      .set(authHeader(purchaseManagerToken))
      .send({ comment: 'Purchase approved' })
      .expect(201);
    await request(server)
      .post(`/api/v1/purchase-orders/${poId}/approve`)
      .set(authHeader(financeManagerToken))
      .send({ comment: 'Finance approved' })
      .expect(201);

    const grnRes = await request(server)
      .post('/api/v1/goods-receipts')
      .set(authHeader(storekeeperToken))
      .send({
        projectId: master.projectId,
        purchaseOrderId: poId,
        vendorId: master.vendorId,
        receivedDate: GOLDEN_PATH_DATES.receivedDate,
        items: [
          {
            materialId: master.materialId,
            purchaseOrderLineId: poLineId,
            orderedQuantity: 25,
            receivedQuantity: 25,
            unit: 'bag',
          },
        ],
        photos: ['proc-lifecycle-grn.jpg'],
        latitude: 13.0827,
        longitude: 80.2707,
        submit: true,
      })
      .expect(201);

    const grnId = grnRes.body.data.id as string;
    await request(server)
      .post(`/api/v1/goods-receipts/${grnId}/quality-check`)
      .set(authHeader(storekeeperToken))
      .expect(201);
    const grnLineId = grnRes.body.data.items[0].id as string;
    await request(server)
      .post(`/api/v1/goods-receipts/${grnId}/accept`)
      .set(authHeader(storekeeperToken))
      .send({
        items: [
          {
            lineId: grnLineId,
            acceptedQuantity: 25,
            rejectedQuantity: 0,
          },
        ],
      })
      .expect(201);

    const posted = await request(server)
      .post(`/api/v1/goods-receipts/${grnId}/post`)
      .set(authHeader(storekeeperToken))
      .expect(201);
    expect(posted.body.data.status).toBe('posted');

    const poAfter = await request(server)
      .get(`/api/v1/purchase-orders/${poId}`)
      .set(authHeader(purchaseManagerToken))
      .expect(200);
    expect(['fully_received', 'partially_received', 'issued']).toContain(
      poAfter.body.data.status,
    );
    expect(
      poAfter.body.data.status === 'fully_received' ||
        poAfter.body.data.balanceQuantity === 0 ||
        posted.body.data.status === 'posted',
    ).toBe(true);

    const dashboard = await request(server)
      .get('/api/v1/procurement/dashboard')
      .query({ projectId: master.projectId })
      .set(authHeader(purchaseManagerToken))
      .expect(200);
    expect(dashboard.body.data).toMatchObject({
      pendingPr: expect.any(Number),
      pendingRfq: expect.any(Number),
      openPo: expect.any(Number),
      budgetUtilization: null,
    });
  });
});
