import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  ApprovalRequest,
  ApprovalRequestSchema,
  ApprovalStatus,
} from '../approvals/schemas/approval-request.schema';
import {
  CashAccount,
  CashAccountSchema,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  ContributionReceipt,
  ContributionReceiptSchema,
} from '../contribution-receipts/schemas/contribution-receipt.schema';
import {
  ContractorPayment,
  ContractorPaymentSchema,
} from '../contractor-payments/schemas/contractor-payment.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  Director,
  DirectorSchema,
  DirectorStatus,
} from '../directors/schemas/director.schema';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  LabourAttendance,
  LabourAttendanceSchema,
  LabourAttendanceEntryMode,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  NotificationChannel,
  NotificationEventType,
} from '../notifications/notifications.constants';
import type { NotificationsService } from '../notifications/notifications.service';
import { MaterialUnit } from '../material-master/schemas/material.schema';
import {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import {
  Project,
  ProjectSchema,
  ProjectType,
} from '../projects/schemas/project.schema';
import { Role, RoleSchema, RoleStatus } from '../rbac/schemas/role.schema';
import {
  SiteExpensePaymentMode,
  SiteExpenseVoucher,
  SiteExpenseVoucherSchema,
  SiteExpenseVoucherStatus,
} from '../site-expense-vouchers/schemas/site-expense-voucher.schema';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
  StockReorderAlertStatus,
  StockReorderAlertType,
} from '../stock-reorder/schemas/stock-reorder-alert.schema';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentSchema,
} from '../vendor-payments/schemas/vendor-payment.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { DailyDirectorDigestService } from './daily-director-digest.service';
import {
  DailyDirectorDigest,
  DailyDirectorDigestSchema,
} from './schemas/daily-director-digest.schema';

describe('DailyDirectorDigestService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: DailyDirectorDigestService;
  let notificationsSend: jest.Mock;

  let userId: string;
  let directorId: string;
  let projectId: Types.ObjectId;
  let yesterday: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const models = {
      digest: connection.model(
        DailyDirectorDigest.name,
        DailyDirectorDigestSchema,
      ) as Model<DailyDirectorDigest>,
      user: connection.model(User.name, UserSchema) as Model<User>,
      role: connection.model(Role.name, RoleSchema) as Model<Role>,
      director: connection.model(
        Director.name,
        DirectorSchema,
      ) as Model<Director>,
      project: connection.model(Project.name, ProjectSchema) as Model<Project>,
      participant: connection.model(
        ProjectParticipant.name,
        ProjectParticipantSchema,
      ) as Model<ProjectParticipant>,
      expense: connection.model(
        SiteExpenseVoucher.name,
        SiteExpenseVoucherSchema,
      ) as Model<SiteExpenseVoucher>,
      contributionReceipt: connection.model(
        ContributionReceipt.name,
        ContributionReceiptSchema,
      ) as Model<ContributionReceipt>,
      vendorPayment: connection.model(
        VendorPayment.name,
        VendorPaymentSchema,
      ) as Model<VendorPayment>,
      contractorPayment: connection.model(
        ContractorPayment.name,
        ContractorPaymentSchema,
      ) as Model<ContractorPayment>,
      bank: connection.model(
        CompanyBankAccount.name,
        CompanyBankAccountSchema,
      ) as Model<CompanyBankAccount>,
      cash: connection.model(
        CashAccount.name,
        CashAccountSchema,
      ) as Model<CashAccount>,
      journal: connection.model(
        JournalEntry.name,
        JournalEntrySchema,
      ) as Model<JournalEntry>,
      attendance: connection.model(
        LabourAttendance.name,
        LabourAttendanceSchema,
      ) as Model<LabourAttendance>,
      grn: connection.model(
        GoodsReceipt.name,
        GoodsReceiptSchema,
      ) as Model<GoodsReceipt>,
      stockAlert: connection.model(
        StockReorderAlert.name,
        StockReorderAlertSchema,
      ) as Model<StockReorderAlert>,
      workMeasurement: connection.model(
        WorkMeasurement.name,
        WorkMeasurementSchema,
      ) as Model<WorkMeasurement>,
      vendorInvoice: connection.model(
        VendorInvoice.name,
        VendorInvoiceSchema,
      ) as Model<VendorInvoice>,
      customerReceipt: connection.model(
        CustomerReceipt.name,
        CustomerReceiptSchema,
      ) as Model<CustomerReceipt>,
      approval: connection.model(
        ApprovalRequest.name,
        ApprovalRequestSchema,
      ) as Model<ApprovalRequest>,
    };

    notificationsSend = jest.fn().mockResolvedValue(
      createSuccessResponse([
        {
          userId: 'x',
          notificationId: new Types.ObjectId().toHexString(),
          channels: [
            NotificationChannel.InApp,
            NotificationChannel.Email,
            NotificationChannel.Push,
          ],
          mode: 'inline',
        },
      ]),
    );

    service = new DailyDirectorDigestService(
      models.digest,
      models.user,
      models.role,
      models.director,
      models.project,
      models.participant,
      models.expense,
      models.contributionReceipt,
      models.vendorPayment,
      models.contractorPayment,
      models.bank,
      models.cash,
      models.journal,
      models.attendance,
      models.grn,
      models.stockAlert,
      models.workMeasurement,
      models.vendorInvoice,
      models.customerReceipt,
      models.approval,
      { send: notificationsSend } as unknown as NotificationsService,
    );
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    notificationsSend.mockClear();
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    yesterday = y.toISOString().slice(0, 10);
    const dayStart = new Date(`${yesterday}T00:00:00.000Z`);

    const role = await connection.model(Role.name).create({
      code: 'DIRECTOR',
      name: 'Director',
      description: 'Director',
      permissions: ['director_digest.view', 'director_digest.send'],
      isSystem: true,
      status: RoleStatus.Active,
    });

    const user = await connection.model(User.name).create({
      userCode: 'DIR001',
      fullName: 'Gold Director',
      email: 'director@luxaria.test',
      passwordHash: 'hash',
      status: UserStatus.Active,
      roleIds: [role._id],
    });
    userId = String(user._id);

    const director = await connection.model(Director.name).create({
      directorCode: 'D001',
      fullName: 'Gold Director',
      userId: user._id,
      status: DirectorStatus.Active,
    });
    directorId = String(director._id);

    const project = await connection.model(Project.name).create({
      projectCode: 'PRJ001',
      projectName: 'Harbour Residences',
      projectType: ProjectType.Residential,
      address: {
        line1: '1 Harbour Road',
        city: 'Kochi',
        state: 'KL',
        pincode: '682001',
        country: 'IN',
      },
    });
    projectId = project._id as Types.ObjectId;

    await connection.model(ProjectParticipant.name).create({
      projectId,
      participantType: ParticipantType.Director,
      participantId: director._id,
      participantKey: `director:${directorId}`,
      commitmentAmount: 1_000_000,
      approvedProfitSharePercentage: 50,
      lossSharePercentage: 50,
      instrumentType: InstrumentType.DirectorLoan,
      version: 1,
      status: ParticipantApprovalStatus.Approved,
      effectiveFrom: dayStart,
      effectiveTo: null,
    });

    await connection.model(SiteExpenseVoucher.name).create({
      voucherNumber: 'SEV-001',
      projectId,
      pettyCashAccountId: new Types.ObjectId(),
      expenseDate: dayStart,
      expenseCategoryId: new Types.ObjectId(),
      amount: 12_500,
      paidTo: 'Site supplier',
      purpose: 'Cement bags',
      paymentMode: SiteExpensePaymentMode.Cash,
      status: SiteExpenseVoucherStatus.Approved,
    });

    await connection.model(LabourAttendance.name).create({
      attendanceNumber: 'ATT-001',
      projectId,
      contractorId: new Types.ObjectId(),
      attendanceDate: dayStart,
      lines: [
        {
          labourCategoryId: new Types.ObjectId(),
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: 18,
          overtimeHours: 0,
          workers: [],
        },
      ],
      status: LabourAttendanceStatus.Confirmed,
    });

    await connection.model(StockReorderAlert.name).create({
      projectId,
      materialId: new Types.ObjectId(),
      materialCode: 'CEM',
      materialName: 'Cement',
      alertType: StockReorderAlertType.BelowReorderLevel,
      status: StockReorderAlertStatus.Open,
      message: 'Cement below reorder level',
      availableStock: 5,
      pendingPoQuantity: 0,
      averageDailyConsumption: 2,
      reorderLevel: 50,
      recommendedPurchaseQuantity: 45,
      baseUnit: MaterialUnit.Bag,
      evaluatedAt: new Date(),
    });

    await connection.model(ApprovalRequest.name).create({
      approvalCode: 'APR-001',
      module: 'payment',
      entityType: 'vendor_payment',
      entityId: new Types.ObjectId(),
      projectId,
      workflowId: new Types.ObjectId(),
      requestedBy: user._id,
      requestedAt: new Date(),
      amount: 1000,
      status: ApprovalStatus.Pending,
    });
  });

  it('previews a digest with yesterday expenses, attendance, shortages, approvals', async () => {
    const result = await service.preview({ date: yesterday }, userId);
    const digest = result.data!;

    expect(digest.directorName).toBe('Gold Director');
    expect(digest.digestDate).toBe(yesterday);
    expect(digest.projectCount).toBe(1);
    expect(digest.yesterdayProjectExpenses.amount).toBe(12_500);
    expect(digest.yesterdayProjectExpenses.count).toBe(1);
    expect(digest.labourAttendance.workerCount).toBe(18);
    expect(digest.materialShortages.count).toBe(1);
    expect(digest.pendingApprovals.count).toBe(1);
    expect(digest.criticalAlerts.some((a) => a.code === 'MATERIAL_SHORTAGES')).toBe(
      true,
    );
    expect(digest.summaryText).toContain('Daily digest for Gold Director');
  });

  it('sends digest via in-app, email, and push', async () => {
    const result = await service.send({
      date: yesterday,
      userIds: [userId],
      force: true,
    });

    expect(result.data?.sentCount).toBe(1);
    expect(notificationsSend).toHaveBeenCalledTimes(1);
    expect(notificationsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: NotificationEventType.DirectorDailyDigest,
        userIds: [userId],
        channels: [
          NotificationChannel.InApp,
          NotificationChannel.Email,
          NotificationChannel.Push,
        ],
      }),
    );
  });

  it('skips re-send without force when already delivered', async () => {
    await service.send({ date: yesterday, userIds: [userId], force: true });
    notificationsSend.mockClear();

    const second = await service.send({
      date: yesterday,
      userIds: [userId],
    });

    expect(second.data?.results[0].status).toBe('skipped_already_sent');
    expect(notificationsSend).not.toHaveBeenCalled();
  });
});
