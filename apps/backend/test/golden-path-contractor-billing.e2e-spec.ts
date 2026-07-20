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
  let seed: {
    contractorId: string;
    agreementId: string;
    measurementId: string;
    advanceAccountId: string;
  };

  beforeAll(async () => {
    harness = await createGoldenPathApp();
    app = harness.app;
    connection = app.get<Connection>(getConnectionToken());
    const auth = await bootstrapGoldenPathAdmin(app);
    adminToken = auth.adminToken;
    master = await seedGoldenPathMasterData(app, auth.adminUserId);
    submitterToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Bill Submitter',
        email: 'gp-bill-submitter@luxaria.test',
        password: 'GoldenPath138!Submit',
        roleCodes: ['PROJECT_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
    engineerToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Bill Engineer',
        email: 'gp-bill-engineer@luxaria.test',
        password: 'GoldenPath138!Engineer',
        roleCodes: ['PROJECT_MANAGER'],
        projectId: master.projectId,
      })
    ).token;
    financeToken = (
      await createRoleBoundUser(app, adminToken, {
        fullName: 'GP Bill Finance',
        email: 'gp-bill-finance@luxaria.test',
        password: 'GoldenPath138!Finance',
        roleCodes: ['FINANCE_MANAGER', 'FINANCE_DIRECTOR'],
        projectId: master.projectId,
      })
    ).token;
  }, 120_000);

  afterAll(async () => {
    await harness?.close();
  });

  beforeEach(async () => {
    await cleanupGoldenPathProjectData(app);
    await ensureContractorCoa(connection);
    seed = await seedContractorBillingData(
      connection,
      master.projectId,
      master.adminUserId,
    );
  });

  it('posts a bill with separate deduction accounts, reports, and partial/final payment', async () => {
    const server = app.getHttpServer();

    const disbursed = await request(server)
      .post(`/api/v1/contractor-agreements/${seed.agreementId}/disburse-advance`)
      .set(authHeader(adminToken))
      .send({
        bankAccountId: master.companyBankAccountId,
        paymentDate: '2026-06-01',
        transactionReference: `GP-ADV-${Date.now()}`,
      })
      .expect(201);
    expect(disbursed.body.data.advanceDisbursementJournalId).toBeTruthy();

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
        tds: 200,
        materialRecovery: 150,
        penalty: 100,
        otherDeductions: 50,
      })
      .expect(201);
    const billId = created.body.data.id as string;
    expect(created.body.data.advanceRecovery).toBe(2000);
    expect(created.body.data.retention).toBe(500);
    expect(created.body.data.netPayable).toBe(7000);

    await request(server)
      .post(`/api/v1/contractor-bills/${billId}/submit-claim`)
      .set(authHeader(submitterToken))
      .expect(201);
    await request(server)
      .post(`/api/v1/contractor-bills/${billId}/engineer-verify`)
      .set(authHeader(engineerToken))
      .send({ notes: 'Measurements verified' })
      .expect(201);
    await request(server)
      .post(`/api/v1/contractor-bills/${billId}/pm-certify`)
      .set(authHeader(submitterToken))
      .send({ notes: 'Certified' })
      .expect(201);
    await request(server)
      .post(`/api/v1/contractor-bills/${billId}/finance-verify`)
      .set(authHeader(financeToken))
      .send({ notes: 'Finance verified' })
      .expect(201);
    await request(server)
      .post(`/api/v1/contractor-bills/${billId}/director-approve`)
      .set(authHeader(financeToken))
      .send({ notes: 'Approved' })
      .expect(201);
    const posted = await request(server)
      .post(`/api/v1/contractor-bills/${billId}/post`)
      .set(authHeader(financeToken))
      .expect(201);

    expect(posted.body.data.journalEntryId).toBeTruthy();
    const billJournalId = posted.body.data.journalEntryId as string;
    const billJournal = await request(server)
      .get(`/api/v1/journals/${billJournalId}`)
      .set(authHeader(financeToken))
      .expect(200);
    expect(billJournal.body.data.totalDebit).toBe(billJournal.body.data.totalCredit);
    expect(billJournal.body.data.postingPurpose).toBe('ap_recognition');
    const billLines = billJournal.body.data.lines as JournalLineResponse[];
    expect(billLines.find((l) => l.description?.includes('certified work'))?.debit).toBe(10000);
    expect(billLines.find((l) => l.description?.includes('Contractor payable'))?.credit).toBe(7000);
    expect(billLines.find((l) => l.description?.includes('Mobilisation advance'))?.credit).toBe(2000);
    expect(billLines.find((l) => l.description?.includes('Material recovery'))?.credit).toBe(150);
    expect(billLines.find((l) => l.description?.includes('Penalty recovery'))?.credit).toBe(100);
    expect(billLines.find((l) => l.description?.includes('Other contractor deduction'))?.credit).toBe(50);
    expect(billLines.find((l) => l.description?.includes('Retention'))?.credit).toBe(500);
    expect(billLines.find((l) => l.description?.includes('TDS'))?.credit).toBe(200);

    const reportRange = { from: '2026-04-01', to: '2027-03-31' };

    const advanceGl = await request(server)
      .get('/api/v1/accounting-reports/general-ledger')
      .query({
        ...reportRange,
        accountId: seed.advanceAccountId,
        projectId: master.projectId,
        partyId: seed.contractorId,
      })
      .set(authHeader(financeToken))
      .expect(200);
    expect(Number(advanceGl.body.data?.closingBalance)).toBe(48000);

    const contractorLedger = await request(server)
      .get('/api/v1/accounting-reports/contractor-ledger')
      .query({
        ...reportRange,
        projectId: master.projectId,
        partyId: seed.contractorId,
      })
      .set(authHeader(financeToken))
      .expect(200);
    expect(contractorLedger.body.data).toBeTruthy();

    const trialBalance = await request(server)
      .get('/api/v1/accounting-reports/trial-balance')
      .query(reportRange)
      .set(authHeader(financeToken))
      .expect(200);
    const tb = trialBalance.body.data;
    const totalDebit = Number(tb?.totals?.periodDebit ?? 0);
    const totalCredit = Number(tb?.totals?.periodCredit ?? 0);
    expect(totalDebit).toBeGreaterThan(0);
    expect(totalDebit).toBe(totalCredit);
    expect(tb?.meta?.reconciled).toBe(true);

    const projectCost = await request(server)
      .get('/api/v1/accounting-reports/project-cost-sheet')
      .query({
        ...reportRange,
        projectId: master.projectId,
      })
      .set(authHeader(financeToken))
      .expect(200);
    expect(projectCost.body.data).toBeTruthy();

    const partial = await request(server)
      .post('/api/v1/contractor-payments')
      .set(authHeader(financeToken))
      .send({
        contractorId: seed.contractorId,
        projectId: master.projectId,
        allocations: [{ billId, amount: 3000 }],
        paymentDate: GOLDEN_PATH_DATES.paymentDate,
        amount: 3000,
        paymentMode: 'bank_transfer',
        bankAccountId: master.companyBankAccountId,
        transactionReference: `GP-CB-P1-${Date.now()}`,
        paymentProof: 'uploads/golden-path/contractor-payment-1.pdf',
      })
      .expect(201);
    const partialId = partial.body.data.id as string;
    await request(server).post(`/api/v1/contractor-payments/${partialId}/submit`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${partialId}/approve`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${partialId}/release`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${partialId}/verify`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${partialId}/post`).set(authHeader(financeToken)).expect(201);

    const afterPartial = await request(server)
      .get(`/api/v1/contractor-bills/${billId}`)
      .set(authHeader(financeToken))
      .expect(200);
    expect(afterPartial.body.data.paidAmount).toBe(3000);
    expect(afterPartial.body.data.status).toBe('posted');

    await request(server)
      .post('/api/v1/contractor-payments')
      .set(authHeader(financeToken))
      .send({
        contractorId: seed.contractorId,
        projectId: master.projectId,
        allocations: [{ billId, amount: 4000 }],
        paymentDate: GOLDEN_PATH_DATES.paymentDate,
        amount: 4000,
        paymentMode: 'bank_transfer',
        bankAccountId: master.companyBankAccountId,
        transactionReference: `GP-CB-P2-${Date.now()}`,
        paymentProof: 'uploads/golden-path/contractor-payment-2.pdf',
        tds: 10,
      })
      .expect(400);

    const finalPay = await request(server)
      .post('/api/v1/contractor-payments')
      .set(authHeader(financeToken))
      .send({
        contractorId: seed.contractorId,
        projectId: master.projectId,
        allocations: [{ billId, amount: 4000 }],
        paymentDate: GOLDEN_PATH_DATES.paymentDate,
        amount: 4000,
        paymentMode: 'bank_transfer',
        bankAccountId: master.companyBankAccountId,
        transactionReference: `GP-CB-P2-${Date.now()}`,
        paymentProof: 'uploads/golden-path/contractor-payment-2.pdf',
      })
      .expect(201);
    const finalId = finalPay.body.data.id as string;
    await request(server).post(`/api/v1/contractor-payments/${finalId}/submit`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${finalId}/approve`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${finalId}/release`).set(authHeader(financeToken)).expect(201);
    await request(server).post(`/api/v1/contractor-payments/${finalId}/verify`).set(authHeader(financeToken)).expect(201);
    const paymentPosted = await request(server)
      .post(`/api/v1/contractor-payments/${finalId}/post`)
      .set(authHeader(financeToken))
      .expect(201);

    const afterFinal = await request(server)
      .get(`/api/v1/contractor-bills/${billId}`)
      .set(authHeader(financeToken))
      .expect(200);
    expect(afterFinal.body.data.paidAmount).toBe(7000);
    expect(afterFinal.body.data.status).toBe('paid');

    const paymentJournal = await request(server)
      .get(`/api/v1/journals/${paymentPosted.body.data.journalEntryId}`)
      .set(authHeader(financeToken))
      .expect(200);
    const billPayable = billLines.find((line) =>
      line.description?.includes('Contractor payable'),
    );
    const paymentPayable = (
      paymentJournal.body.data.lines as JournalLineResponse[]
    ).find((line) => line.debit > 0 && line.partyId === seed.contractorId);
    expect(paymentPayable?.accountId).toBe(billPayable?.accountId);

    const replay = await request(server)
      .post(`/api/v1/contractor-bills/${billId}/post`)
      .set(authHeader(financeToken))
      .expect(201);
    expect(replay.body.data.journalEntryId).toBe(billJournalId);
    expect(
      await connection.collection('journal_entries').countDocuments({
        sourceModule: 'contractor_bill',
        sourceEntityId: billId,
        postingPurpose: 'ap_recognition',
      }),
    ).toBe(1);
  });
});

async function ensureContractorCoa(connection: Connection) {
  const accounts = [
    ['GP-CA-138', 'GP Contractor Advance', 'asset', 'contractor_advance', true, true],
    ['GP-CP-138', 'GP Contractor Payable', 'liability', 'contractor_payable', true, true],
    ['GP-RP-138', 'GP Retention Payable', 'liability', 'retention_payable', true, true],
    ['GP-TDS-138', 'GP TDS Payable', 'liability', 'tds_payable', false, false],
    ['GP-MR-138', 'GP Material Recovery', 'income', 'material_recovery', true, true],
    ['GP-PR-138', 'GP Penalty Recovery', 'income', 'penalty_recovery', true, true],
    ['GP-OD-138', 'GP Other Contractor Deduction', 'income', 'other_contractor_deduction', false, true],
  ] as const;
  await Promise.all(
    accounts.map(
      ([
        accountCode,
        accountName,
        accountType,
        accountCategory,
        requiresParty,
        requiresProject,
      ]) =>
        connection.collection('accounts').updateOne(
          { accountCode },
          {
            $setOnInsert: {
              accountCode,
              accountName,
              accountType,
              accountCategory,
              level: 1,
              allowManualPosting: true,
              requiresParty,
              requiresProject,
              status: 'active',
              postingCount: 0,
              isDeleted: false,
            },
          },
          { upsert: true },
        ),
    ),
  );
}

async function seedContractorBillingData(
  connection: Connection,
  projectId: string,
  adminUserId: string,
) {
  const contractorId = new Types.ObjectId();
  const agreementId = new Types.ObjectId();
  const measurementId = new Types.ObjectId();
  const boqItemId = new Types.ObjectId();
  const advanceAccount = await connection.collection('accounts').findOne({
    accountCategory: 'contractor_advance',
    status: 'active',
  });
  await connection.collection('contractors').insertOne({
    _id: contractorId,
    contractorCode: `GP-CB-${contractorId.toString().slice(-6)}`,
    legalName: 'Golden Path Civil Contractor',
    contractorType: 'civil',
    status: 'active',
    verificationStatus: 'verified',
    workCategories: [],
    contact: {},
    bankDetails: {},
    labourLicence: {},
    isDeleted: false,
  });
  await connection.collection('contractor_agreements').insertOne({
    _id: agreementId,
    agreementNumber: `GP-CA-${agreementId.toString().slice(-6)}`,
    version: 1,
    contractorId,
    projectId: new Types.ObjectId(projectId),
    workScope: 'Golden path civil works',
    boqItems: [
      {
        boqItemId,
        boqCode: 'GP-RCC-001',
        description: 'RCC work',
        unit: 'cubic_metre',
        agreedQuantity: 100,
        agreedRate: 1000,
        agreedValue: 100000,
      },
    ],
    agreedRatesTotal: 100000,
    agreedQuantity: 100,
    manpowerCommitment: 1,
    skillMix: [],
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-12-31'),
    billingCycle: 'monthly',
    advance: { amount: 50000, terms: 'Against BG' },
    recoveryPlan: { method: 'percent_per_bill', percentPerBill: 20, notes: null },
    retentionPercentage: 5,
    status: 'active',
    advanceDisbursementJournalId: null,
    advanceDisbursedAt: null,
    isDeleted: false,
  });
  await connection.collection('work_measurements').insertOne({
    _id: measurementId,
    measurementNumber: `GP-WM-${measurementId.toString().slice(-6)}`,
    projectId: new Types.ObjectId(projectId),
    contractorId,
    boqItemId,
    boqCode: 'GP-RCC-001',
    location: 'Golden Path Block A',
    measurementDate: new Date('2026-07-15'),
    previousQuantity: 0,
    currentQuantity: 10,
    cumulativeQuantity: 10,
    unit: 'cubic_metre',
    measuredBy: new Types.ObjectId(adminUserId),
    verifiedBy: new Types.ObjectId(adminUserId),
    verifiedAt: new Date(),
    status: 'verified',
    boqPlannedQuantity: 100,
    isDeleted: false,
  });
  return {
    contractorId: String(contractorId),
    agreementId: String(agreementId),
    measurementId: String(measurementId),
    advanceAccountId: String(advanceAccount?._id),
  };
}
