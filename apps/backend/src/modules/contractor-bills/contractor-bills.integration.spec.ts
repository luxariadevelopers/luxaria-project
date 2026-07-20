import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  AccountingPeriod,
  AccountingPeriodSchema,
} from '../accounting-period-closure/schemas/accounting-period.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLog, AuditLogSchema } from '../audit-log/schemas/audit-log.schema';
import { ChartOfAccountsService } from '../chart-of-accounts/chart-of-accounts.service';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import {
  ContractorAgreement,
  ContractorAgreementBillingCycle,
  ContractorAgreementSchema,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import { DatabaseService } from '../../database/services/database.service';
import { withTransaction } from '../../database/utils/transaction.helper';
import { FinancialYearService } from '../financial-year/financial-year.service';
import {
  FinancialYearUnlockRequest,
  FinancialYearUnlockRequestSchema,
} from '../financial-year/schemas/financial-year-unlock-request.schema';
import {
  FinancialYear,
  FinancialYearSchema,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import { JournalService } from '../journal/journal.service';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { Project, ProjectSchema, ProjectStatus, ProjectType } from '../projects/schemas/project.schema';
import { BoqUnit } from '../boq/schemas/boq.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { ContractorBillsService } from './contractor-bills.service';
import {
  ContractorBill,
  ContractorBillSchema,
  ContractorBillStatus,
} from './schemas/contractor-bill.schema';

describe('ContractorBillsService AP journal integration', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let service: ContractorBillsService;
  let billModel: Model<ContractorBill>;
  let agreementModel: Model<ContractorAgreement>;
  let measurementModel: Model<WorkMeasurement>;
  let accountModel: Model<Account>;
  let journalModel: Model<JournalEntry>;
  let projectModel: Model<Project>;
  let contractorModel: Model<Contractor>;
  let contractorId: string;
  let projectId: string;
  let agreementId: string;
  let measurementId: string;
  let actorId: string;
  let engineerId: string;
  let accountIds: Record<string, string>;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    connection = (await connect(replSet.getUri())).connection;

    billModel = connection.model(ContractorBill.name, ContractorBillSchema) as Model<ContractorBill>;
    agreementModel = connection.model(ContractorAgreement.name, ContractorAgreementSchema) as Model<ContractorAgreement>;
    measurementModel = connection.model(WorkMeasurement.name, WorkMeasurementSchema) as Model<WorkMeasurement>;
    accountModel = connection.model(Account.name, AccountSchema) as Model<Account>;
    journalModel = connection.model(JournalEntry.name, JournalEntrySchema) as Model<JournalEntry>;
    projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    contractorModel = connection.model(Contractor.name, ContractorSchema) as Model<Contractor>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    const fyModel = connection.model(FinancialYear.name, FinancialYearSchema) as Model<FinancialYear>;
    const unlockModel = connection.model(FinancialYearUnlockRequest.name, FinancialYearUnlockRequestSchema) as Model<FinancialYearUnlockRequest>;
    const companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    const periodModel = connection.model(AccountingPeriod.name, AccountingPeriodSchema) as Model<AccountingPeriod>;
    const idempotencyModel = connection.model(IdempotencyKey.name, IdempotencyKeySchema) as Model<IdempotencyKey>;
    const auditModel = connection.model(AuditLog.name, AuditLogSchema) as Model<AuditLog>;

    await Promise.all([
      billModel.syncIndexes(), agreementModel.syncIndexes(), measurementModel.syncIndexes(),
      accountModel.syncIndexes(), journalModel.syncIndexes(), projectModel.syncIndexes(),
      contractorModel.syncIndexes(), counterModel.syncIndexes(), fyModel.syncIndexes(),
      companyModel.syncIndexes(), idempotencyModel.syncIndexes(),
    ]);

    const databaseService = {
      withTransaction: <T>(work: Parameters<typeof withTransaction<T>>[1]) =>
        withTransaction(connection, work),
    } as unknown as DatabaseService;
    const numbering = new NumberingService(counterModel);
    const financialYears = new FinancialYearService(fyModel, unlockModel, companyModel, periodModel);
    const idempotency = new IdempotencyService(idempotencyModel);
    const audit = new AuditLogService(auditModel);
    const journal = new JournalService(
      journalModel, numbering, financialYears, new ChartOfAccountsService(accountModel),
      databaseService, idempotency, audit,
    );
    service = new ContractorBillsService(
      billModel, agreementModel, measurementModel, projectModel, contractorModel,
      accountModel, journalModel, numbering, journal, financialYears, idempotency,
      databaseService, audit,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    await replSet?.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      billModel.deleteMany({}).setOptions({ withDeleted: true }),
      agreementModel.deleteMany({}).setOptions({ withDeleted: true }),
      measurementModel.deleteMany({}).setOptions({ withDeleted: true }),
      accountModel.deleteMany({}).setOptions({ withDeleted: true }),
      journalModel.deleteMany({}).setOptions({ withDeleted: true }),
      projectModel.deleteMany({}).setOptions({ withDeleted: true }),
      contractorModel.deleteMany({}).setOptions({ withDeleted: true }),
      connection.model(Company.name).deleteMany({}).setOptions({ withDeleted: true }),
      connection.model(FinancialYear.name).deleteMany({}).setOptions({ withDeleted: true }),
      connection.model(Counter.name).deleteMany({}),
      connection.model(IdempotencyKey.name).deleteMany({}),
      connection.model(AuditLog.name).deleteMany({}),
    ]);
    actorId = new Types.ObjectId().toHexString();
    engineerId = new Types.ObjectId().toHexString();
    const [company] = await connection.model(Company.name).create([{
      companyCode: 'CB-COMPANY', legalName: 'Contractor Bill Co', tradeName: 'CB Co',
      registeredAddress: address(), corporateAddress: address(), authorisedShareCapital: 1,
      paidUpShareCapital: 0, financialYearStartMonth: 4, status: CompanyStatus.Active, isPrimary: true,
    }]);
    await connection.model(FinancialYear.name).create({
      companyId: company._id, name: 'FY 2026-27', startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31T23:59:59.999Z'), status: FinancialYearStatus.Open,
      isCurrent: true, isLocked: false,
    });
    const accounts = await accountModel.create([
      account('CB-WIP', 'WIP', AccountType.Asset, AccountCategory.WorkInProgress),
      account('CB-CP', 'Contractor Payable', AccountType.Liability, AccountCategory.ContractorPayable, true),
      account('CB-RP', 'Retention Payable', AccountType.Liability, AccountCategory.RetentionPayable, true),
      account('CB-TDS', 'TDS Payable', AccountType.Liability, AccountCategory.TdsPayable),
      account('CB-OI', 'Other Income', AccountType.Income, AccountCategory.OtherIncome),
    ]);
    accountIds = Object.fromEntries(accounts.map((row) => [row.accountCategory, String(row._id)]));

    const [project] = await projectModel.create([{
      projectCode: 'CB-PROJECT', projectName: 'Contractor Journal Project',
      projectType: ProjectType.Residential, address: address(), status: ProjectStatus.Construction,
      companyId: company._id,
    }]);
    projectId = String(project._id);
    const [contractor] = await contractorModel.create([{
      contractorCode: 'CB-CONTRACTOR', legalName: 'Journal Contractor',
      contractorType: ContractorType.Civil, status: ContractorStatus.Active,
      verificationStatus: ContractorVerificationStatus.Verified, workCategories: [],
      contact: {}, bankDetails: {}, labourLicence: {},
    }]);
    contractorId = String(contractor._id);
    const boqItemId = new Types.ObjectId();
    const [agreement] = await agreementModel.create([{
      agreementNumber: 'CB-AGREEMENT', version: 1, contractorId: contractor._id, projectId: project._id,
      workScope: 'Civil works', boqItems: [{ boqItemId, boqCode: 'RCC-001', description: 'RCC', unit: BoqUnit.CubicMetre, agreedQuantity: 100, agreedRate: 1000, agreedValue: 100000 }],
      agreedRatesTotal: 100000, agreedQuantity: 100, manpowerCommitment: 1, skillMix: [],
      startDate: new Date('2026-04-01'), endDate: new Date('2026-12-31'),
      billingCycle: ContractorAgreementBillingCycle.Monthly, advance: { amount: 50000, terms: null },
      recoveryPlan: { method: 'percent', percentPerBill: 20, notes: null }, retentionPercentage: 5,
      status: ContractorAgreementStatus.Active,
    }]);
    agreementId = String(agreement._id);
    const [measurement] = await measurementModel.create([{
      measurementNumber: 'CB-WM-001', projectId: project._id, contractorId: contractor._id,
      boqItemId, boqCode: 'RCC-001', location: 'Block A', measurementDate: new Date('2026-07-15'),
      previousQuantity: 0, currentQuantity: 10, cumulativeQuantity: 10, unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(actorId), verifiedBy: new Types.ObjectId(engineerId),
      verifiedAt: new Date(), status: WorkMeasurementStatus.Verified, boqPlannedQuantity: 100,
    }]);
    measurementId = String(measurement._id);
  });

  it('posts a simple bill as Dr WIP and Cr Contractor Payable', async () => {
    await agreementModel.updateOne({ _id: agreementId }, { $set: { retentionPercentage: 0, 'advance.amount': 0 } });
    const posted = await createAndApprove({ retention: 0, advanceRecovery: 0 });
    const journal = await journalModel.findById(posted.data!.journalEntryId).lean();
    expect(journal?.status).toBe(JournalStatus.Posted);
    expect(journal?.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountId: expect.objectContaining({}), debit: 10000, credit: 0 }),
      expect.objectContaining({ credit: 10000, debit: 0, partyId: expect.anything() }),
    ]));
    expect(journal?.lines.find((line) => String(line.accountId) === accountIds[AccountCategory.WorkInProgress])?.debit).toBe(10000);
    const payable = journal?.lines.find((line) => String(line.accountId) === accountIds[AccountCategory.ContractorPayable]);
    expect(payable?.credit).toBe(10000);
    expect(String(payable?.partyId)).toBe(contractorId);
  });

  it('posts all deductions as balanced AP journal credit lines', async () => {
    const posted = await createAndApprove({ tds: 200, materialRecovery: 150, penalty: 100, otherDeductions: 50 });
    const journal = await journalModel.findById(posted.data!.journalEntryId).lean();
    expect(journal?.totalDebit).toBe(10000);
    expect(journal?.totalCredit).toBe(10000);
    expect(journal?.lines.find((line) => String(line.accountId) === accountIds[AccountCategory.RetentionPayable])?.credit).toBe(500);
    expect(journal?.lines.find((line) => String(line.accountId) === accountIds[AccountCategory.TdsPayable])?.credit).toBe(200);
    expect(journal?.lines.find((line) => String(line.accountId) === accountIds[AccountCategory.OtherIncome])?.credit).toBe(2300);
    expect(journal?.lines.find((line) => String(line.accountId) === accountIds[AccountCategory.ContractorPayable])?.credit).toBe(7000);
  });

  it('rejects posting without Contractor Payable mapping and preserves approval', async () => {
    const approved = await createAndApprove({ post: false });
    await accountModel.deleteOne({ _id: accountIds[AccountCategory.ContractorPayable] });
    await expect(service.post(approved.data!.id, actorId)).rejects.toThrow(/contractor_payable/i);
    expect((await billModel.findById(approved.data!.id).lean())?.status).toBe(ContractorBillStatus.DirectorApproved);
    expect(await journalModel.countDocuments({})).toBe(0);
  });

  it('does not duplicate journals under concurrent post attempts', async () => {
    const approved = await createAndApprove({ post: false });
    await Promise.allSettled([service.post(approved.data!.id, actorId), service.post(approved.data!.id, actorId)]);
    expect(await journalModel.countDocuments({ sourceModule: 'contractor_bill', sourceEntityId: approved.data!.id })).toBe(1);
    expect((await billModel.findById(approved.data!.id).lean())?.journalEntryId).toBeTruthy();
  });

  it('uses the Contractor Payable account mapping on the posted journal', async () => {
    const posted = await createAndApprove({});
    const journal = await journalModel.findById(posted.data!.journalEntryId).lean();
    const payable = journal?.lines.find((line) => line.credit > 0 && String(line.accountId) === accountIds[AccountCategory.ContractorPayable]);
    expect(String(payable?.accountId)).toBe(accountIds[AccountCategory.ContractorPayable]);
    expect(payable?.credit).toBe(posted.data!.netPayable);
  });

  async function createAndApprove(
    deductions: { retention?: number; advanceRecovery?: number; tds?: number; materialRecovery?: number; penalty?: number; otherDeductions?: number; post?: boolean },
  ) {
    const created = await service.create({
      projectId, contractorId, agreementId, billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
      measurementIds: [measurementId], invoiceDocument: 'documents/invoice.pdf', ...deductions,
    }, actorId);
    await service.submitClaim(created.data!.id, actorId);
    await service.engineerVerify(created.data!.id, {}, engineerId);
    await service.pmCertify(created.data!.id, {}, actorId);
    await service.financeVerify(created.data!.id, {}, actorId);
    const approved = await service.directorApprove(created.data!.id, {}, actorId);
    return deductions.post === false ? approved : service.post(created.data!.id, actorId);
  }
});

function address() {
  return { line1: 'Site', line2: null, city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', country: 'India' };
}

function account(
  accountCode: string,
  accountName: string,
  accountType: AccountType,
  accountCategory: AccountCategory,
  requiresParty = false,
) {
  return {
    accountCode, accountName, accountType, accountCategory, level: 1,
    allowManualPosting: true, status: AccountStatus.Active, requiresParty,
  };
}
