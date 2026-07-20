import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types, type Connection } from 'mongoose';
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

type JournalLineResponse = {
  accountId: string;
  debit: number;
  credit: number;
  partyId: string | null;
  description: string | null;
};

describe('Golden path: contractor bill → AP journal → contractor payment (e2e)', () => {
  let harness: GoldenPathApp;
  let app: INestApplication;
  let connection: Connection;
  let master: GoldenPathMasterData;
  let adminToken: string;
  let submitterToken: string;
  let engineerToken: string;
  let financeToken: string;
  let seed: { contractorId: string; agreementId: string; measurementId: string };

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    connection = app.get<Connection>(getConnectionToken());
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);
    submitterToken = (await createRoleBoundUser(app, adminToken, {
      fullName: 'GP Bill Submitter', email: 'gp-bill-submitter@luxaria.test',
      password: 'GoldenPath138!Submit', roleCodes: ['PROJECT_MANAGER'], projectId: master.projectId,
    })).token;
    engineerToken = (await createRoleBoundUser(app, adminToken, {
      fullName: 'GP Bill Engineer', email: 'gp-bill-engineer@luxaria.test',
      password: 'GoldenPath138!Engineer', roleCodes: ['PROJECT_MANAGER'], projectId: master.projectId,
    })).token;
    financeToken = (await createRoleBoundUser(app, adminToken, {
      fullName: 'GP Bill Finance', email: 'gp-bill-finance@luxaria.test',
      password: 'GoldenPath138!Finance', roleCodes: ['FINANCE_MANAGER', 'FINANCE_DIRECTOR'], projectId: master.projectId,
    })).token;
  }, 120_000);

  afterAll(async () => {
    await harness.close();
  });

  beforeEach(async () => {
    await cleanupGoldenPathProjectData(app);
    await ensureContractorCoa(connection);
    seed = await seedContractorBillingData(connection, master.projectId, master.adminUserId);
  });

  it('posts a bill and settles it through contractor payment APIs', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/v1/contractor-bills')
      .set(authHeader(submitterToken))
      .send({
        projectId: master.projectId,
        contractorId: seed.contractorId,
        agreementId: seed.agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [seed.measurementId],
        invoiceDocument: 'uploads/golden-path/contractor-invoice.pdf',
      })
      .expect(201);
    const billId = created.body.data.id as string;

    await request(server).post(`/api/v1/contractor-bills/${billId}/submit-claim`).set(authHeader(submitterToken)).expect(201);
    await request(server).post(`/api/v1/contractor-bills/${billId}/engineer-verify`).set(authHeader(engineerToken)).send({ notes: 'Measurements verified' }).expect(201);
    await request(server).post(`/api/v1/contractor-bills/${billId}/pm-certify`).set(authHeader(submitterToken)).send({ notes: 'Certified' }).expect(201);
    await request(server).post(`/api/v1/contractor-bills/${billId}/finance-verify`).set(authHeader(financeToken)).send({ notes: 'Finance verified' }).expect(201);
    await request(server).post(`/api/v1/contractor-bills/${billId}/director-approve`).set(authHeader(financeToken)).send({ notes: 'Approved' }).expect(201);
    const posted = await request(server).post(`/api/v1/contractor-bills/${billId}/post`).set(authHeader(financeToken)).expect(201);

    expect(posted.body.data.journalEntryId).toBeTruthy();
    const billJournalId = posted.body.data.journalEntryId as string;
    const billJournal = await request(server).get(`/api/v1/journals/${billJournalId}`).set(authHeader(financeToken)).expect(200);
    expect(billJournal.body.data.totalDebit).toBe(billJournal.body.data.totalCredit);
    const billLines = billJournal.body.data.lines as JournalLineResponse[];
    const wip = billLines.find((line) => line.description?.includes('certified work'));
    const payable = billLines.find((line) => line.description?.includes('Contractor payable'));
    expect(wip?.debit).toBeGreaterThan(0);
    expect(payable?.credit).toBe(posted.body.data.netPayable);
    expect(payable?.partyId).toBe(seed.contractorId);

    const payment = await request(server)
      .post('/api/v1/contractor-payments')
      .set(authHeader(financeToken))
      .send({
        contractorId: seed.contractorId,
        projectId: master.projectId,
        allocations: [{ billId, amount: posted.body.data.netPayable }],
        paymentDate: GOLDEN_PATH_DATES.paymentDate,
        amount: posted.body.data.netPayable,
        paymentMode: 'bank_transfer',
        bankAccountId: master.companyBankAccountId,
        transactionReference: `GP-CB-${Date.now()}`,
        paymentProof: 'uploads/golden-path/contractor-payment.pdf',
      })
      .expect(201);
    const paymentId = payment.body.data.id as string;
    await request(server).post(`/api/v1/contractor-payments/${paymentId}/submit`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${paymentId}/approve`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${paymentId}/release`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${paymentId}/verify`).set(authHeader(financeToken)).expect(201);
    const paymentPosted = await request(server).post(`/api/v1/contractor-payments/${paymentId}/post`).set(authHeader(financeToken)).expect(201);

    expect(paymentPosted.body.data.journalEntryId).toBeTruthy();
    const paymentJournal = await request(server).get(`/api/v1/journals/${paymentPosted.body.data.journalEntryId}`).set(authHeader(financeToken)).expect(200);
    const billPayable = billLines.find((line) => line.description?.includes('Contractor payable'));
    const paymentPayable = (paymentJournal.body.data.lines as JournalLineResponse[]).find(
      (line) => line.debit > 0 && line.partyId === seed.contractorId,
    );
    expect(paymentPayable?.accountId).toBe(billPayable?.accountId);
    expect(paymentPayable?.debit).toBe(posted.body.data.netPayable);

    const replay = await request(server).post(`/api/v1/contractor-bills/${billId}/post`).set(authHeader(financeToken)).expect(201);
    expect(replay.body.data.journalEntryId).toBe(billJournalId);

    const contractorLedger = await connection.collection('journal_entries').find({
      'lines.partyId': new Types.ObjectId(seed.contractorId),
    }).toArray();
    expect(contractorLedger.some((entry) => entry._id.toString() === billJournalId)).toBe(true);
    expect(contractorLedger.some((entry) => entry._id.toString() === paymentPosted.body.data.journalEntryId)).toBe(true);
  });
});

async function ensureContractorCoa(connection: Connection) {
  const accounts = [
    ['GP-CP-138', 'GP Contractor Payable', 'liability', 'contractor_payable', true],
    ['GP-RP-138', 'GP Retention Payable', 'liability', 'retention_payable', true],
    ['GP-TDS-138', 'GP TDS Payable', 'liability', 'tds_payable', false],
    ['GP-OI-138', 'GP Other Income', 'income', 'other_income', false],
  ];
  await Promise.all(accounts.map(([accountCode, accountName, accountType, accountCategory, requiresParty]) =>
    connection.collection('accounts').updateOne(
      { accountCode },
      { $setOnInsert: { accountCode, accountName, accountType, accountCategory, level: 1, allowManualPosting: true, requiresParty, status: 'active', postingCount: 0, isDeleted: false } },
      { upsert: true },
    ),
  ));
}

async function seedContractorBillingData(connection: Connection, projectId: string, adminUserId: string) {
  const contractorId = new Types.ObjectId();
  const agreementId = new Types.ObjectId();
  const measurementId = new Types.ObjectId();
  const boqItemId = new Types.ObjectId();
  await connection.collection('contractors').insertOne({
    _id: contractorId, contractorCode: `GP-CB-${contractorId.toString().slice(-6)}`,
    legalName: 'Golden Path Civil Contractor', contractorType: 'civil', status: 'active',
    verificationStatus: 'verified', workCategories: [], contact: {}, bankDetails: {}, labourLicence: {}, isDeleted: false,
  });
  await connection.collection('contractor_agreements').insertOne({
    _id: agreementId, agreementNumber: `GP-CA-${agreementId.toString().slice(-6)}`, version: 1,
    contractorId, projectId: new Types.ObjectId(projectId), workScope: 'Golden path civil works',
    boqItems: [{ boqItemId, boqCode: 'GP-RCC-001', description: 'RCC work', unit: 'cubic_metre', agreedQuantity: 100, agreedRate: 1000, agreedValue: 100000 }],
    agreedRatesTotal: 100000, agreedQuantity: 100, manpowerCommitment: 1, skillMix: [],
    startDate: new Date('2026-04-01'), endDate: new Date('2026-12-31'), billingCycle: 'monthly',
    advance: { amount: 0, terms: null }, recoveryPlan: { method: null, percentPerBill: null, notes: null },
    retentionPercentage: 0, status: 'active', isDeleted: false,
  });
  await connection.collection('work_measurements').insertOne({
    _id: measurementId, measurementNumber: `GP-WM-${measurementId.toString().slice(-6)}`,
    projectId: new Types.ObjectId(projectId), contractorId, boqItemId, boqCode: 'GP-RCC-001',
    location: 'Golden Path Block A', measurementDate: new Date('2026-07-15'), previousQuantity: 0,
    currentQuantity: 10, cumulativeQuantity: 10, unit: 'cubic_metre', measuredBy: new Types.ObjectId(adminUserId),
    verifiedBy: new Types.ObjectId(adminUserId), verifiedAt: new Date(), status: 'verified',
    boqPlannedQuantity: 100, isDeleted: false,
  });
  return { contractorId: String(contractorId), agreementId: String(agreementId), measurementId: String(measurementId) };
}
