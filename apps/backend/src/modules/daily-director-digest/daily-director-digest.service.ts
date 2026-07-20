import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  ApprovalRequest,
  ApprovalStatus,
} from '../approvals/schemas/approval-request.schema';
import {
  BankAccountStatus,
  CompanyBankAccount,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  CashAccount,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  ContributionReceipt,
  ContributionReceiptStatus,
} from '../contribution-receipts/schemas/contribution-receipt.schema';
import {
  ContractorPayment,
  ContractorPaymentStatus,
} from '../contractor-payments/schemas/contractor-payment.schema';
import {
  CustomerReceipt,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  Director,
  DirectorStatus,
} from '../directors/schemas/director.schema';
import {
  GoodsReceipt,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  LabourAttendance,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  NotificationChannel,
  NotificationEventType,
} from '../notifications/notifications.constants';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import { Project } from '../projects/schemas/project.schema';
import { Role } from '../rbac/schemas/role.schema';
import {
  SiteExpenseVoucher,
  SiteExpenseVoucherStatus,
} from '../site-expense-vouchers/schemas/site-expense-voucher.schema';
import {
  StockReorderAlert,
  StockReorderAlertStatus,
} from '../stock-reorder/schemas/stock-reorder-alert.schema';
import { User, UserStatus } from '../users/schemas/user.schema';
import {
  VendorInvoice,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentStatus,
} from '../vendor-payments/schemas/vendor-payment.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import {
  DailyDirectorDigestDeliveryStatus,
  DIRECTOR_ROLE_CODES,
} from './daily-director-digest.constants';
import type {
  DigestAlert,
  DigestMoney,
  DirectorDigestRecipient,
  DirectorDigestSummary,
} from './daily-director-digest.types';
import type { PreviewDigestQueryDto, SendDigestDto } from './dto/digest.dto';
import { DailyDirectorDigest } from './schemas/daily-director-digest.schema';

const DEFAULT_DIGEST_CHANNELS: NotificationChannel[] = [
  NotificationChannel.InApp,
  NotificationChannel.Email,
  NotificationChannel.Push,
];

@Injectable()
export class DailyDirectorDigestService {
  private readonly logger = new Logger(DailyDirectorDigestService.name);

  constructor(
    @InjectModel(DailyDirectorDigest.name)
    private readonly digestModel: Model<DailyDirectorDigest>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(SiteExpenseVoucher.name)
    private readonly expenseModel: Model<SiteExpenseVoucher>,
    @InjectModel(ContributionReceipt.name)
    private readonly contributionReceiptModel: Model<ContributionReceipt>,
    @InjectModel(VendorPayment.name)
    private readonly vendorPaymentModel: Model<VendorPayment>,
    @InjectModel(ContractorPayment.name)
    private readonly contractorPaymentModel: Model<ContractorPayment>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(LabourAttendance.name)
    private readonly attendanceModel: Model<LabourAttendance>,
    @InjectModel(GoodsReceipt.name)
    private readonly grnModel: Model<GoodsReceipt>,
    @InjectModel(StockReorderAlert.name)
    private readonly stockAlertModel: Model<StockReorderAlert>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(CustomerReceipt.name)
    private readonly customerReceiptModel: Model<CustomerReceipt>,
    @InjectModel(ApprovalRequest.name)
    private readonly approvalModel: Model<ApprovalRequest>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async preview(query: PreviewDigestQueryDto, actorId: string) {
    const digestDate = this.resolveDigestDate(query.date);
    const userId = query.userId ?? actorId;
    const recipients = await this.resolveRecipients([userId]);
    const recipient = recipients[0];
    if (!recipient) {
      throw new NotFoundException('Director recipient not found');
    }

    const summary = await this.buildDigestForRecipient(recipient, digestDate);
    await this.upsertDigestRecord(
      summary,
      DailyDirectorDigestDeliveryStatus.Preview,
      [],
      null,
    );

    return createSuccessResponse(summary, 'Director digest preview');
  }

  async previewAll(date?: string) {
    const digestDate = this.resolveDigestDate(date);
    const recipients = await this.resolveRecipients();
    const digests: DirectorDigestSummary[] = [];
    for (const recipient of recipients) {
      const summary = await this.buildDigestForRecipient(
        recipient,
        digestDate,
      );
      await this.upsertDigestRecord(
        summary,
        DailyDirectorDigestDeliveryStatus.Preview,
        [],
        null,
      );
      digests.push(summary);
    }
    return createSuccessResponse(
      { digestDate: this.toDateKey(digestDate), digests },
      'Director digest previews',
    );
  }

  async send(dto: SendDigestDto, actorId?: string) {
    void actorId;
    const digestDate = this.resolveDigestDate(dto.date);
    const channels = dto.channels?.length
      ? dto.channels.filter((c) =>
          DEFAULT_DIGEST_CHANNELS.includes(c as NotificationChannel),
        )
      : DEFAULT_DIGEST_CHANNELS;
    const effectiveChannels = channels.length
      ? channels
      : DEFAULT_DIGEST_CHANNELS;

    const recipients = await this.resolveRecipients(dto.userIds);
    const results: Array<{
      userId: string;
      directorName: string;
      status: string;
      notificationId?: string;
      error?: string;
    }> = [];

    for (const recipient of recipients) {
      try {
        if (!dto.force) {
          const existing = await this.digestModel
            .findOne({
              userId: new Types.ObjectId(recipient.userId),
              digestDate,
              deliveryStatus: DailyDirectorDigestDeliveryStatus.Sent,
            })
            .lean()
            .exec();
          if (existing) {
            results.push({
              userId: recipient.userId,
              directorName: recipient.fullName,
              status: 'skipped_already_sent',
              notificationId: existing.notificationId ?? undefined,
            });
            continue;
          }
        }

        const summary = await this.buildDigestForRecipient(
          recipient,
          digestDate,
        );
        const sent = await this.notificationsService.send({
          eventType: NotificationEventType.DirectorDailyDigest,
          userIds: [recipient.userId],
          channels: effectiveChannels,
          data: {
            title: `Daily director digest — ${summary.digestDate}`,
            body: summary.summaryText,
            digestDate: summary.digestDate,
            summaryText: summary.summaryText,
            directorName: summary.directorName,
            digest: summary,
          },
          idempotencyKey: dto.force
            ? undefined
            : `director-digest:${summary.digestDate}:${recipient.userId}`,
          entityType: 'daily_director_digest',
          entityId: summary.digestDate,
        });

        const notificationId = sent.data?.[0]?.notificationId ?? null;
        await this.upsertDigestRecord(
          summary,
          DailyDirectorDigestDeliveryStatus.Sent,
          effectiveChannels,
          notificationId,
        );
        results.push({
          userId: recipient.userId,
          directorName: recipient.fullName,
          status: 'sent',
          notificationId: notificationId ?? undefined,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Digest send failed';
        this.logger.warn(
          `Digest send failed for ${recipient.userId}: ${message}`,
        );
        results.push({
          userId: recipient.userId,
          directorName: recipient.fullName,
          status: 'failed',
          error: message,
        });
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    return createSuccessResponse(
      {
        digestDate: this.toDateKey(digestDate),
        channels: effectiveChannels,
        sentCount,
        failedCount,
        results,
      },
      'Director digests dispatched',
    );
  }

  async runScheduled(dto: SendDigestDto = {}) {
    return this.send({ ...dto, force: dto.force ?? false });
  }

  // ─── recipients / scope ────────────────────────────────────────────────

  async resolveRecipients(
    userIds?: string[],
  ): Promise<DirectorDigestRecipient[]> {
    const roles = await this.roleModel
      .find({ code: { $in: [...DIRECTOR_ROLE_CODES] } })
      .select('_id code')
      .lean()
      .exec();
    const roleIds = roles.map((r) => r._id as Types.ObjectId);
    const roleCodeById = new Map(roles.map((r) => [String(r._id), r.code]));

    const userFilter: FilterQuery<User> = {
      status: UserStatus.Active,
    };
    if (userIds?.length) {
      userFilter._id = {
        $in: userIds.map((id) => {
          if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid userId: ${id}`);
          }
          return new Types.ObjectId(id);
        }),
      };
    } else if (roleIds.length) {
      userFilter.roleIds = { $in: roleIds };
    } else {
      return [];
    }

    const users = await this.userModel
      .find(userFilter)
      .select('_id fullName email roleIds')
      .lean()
      .exec();

    const directors = await this.directorModel
      .find({
        status: DirectorStatus.Active,
        userId: { $ne: null },
        ...(userIds?.length
          ? {
              userId: {
                $in: userIds.map((id) => new Types.ObjectId(id)),
              },
            }
          : {}),
      })
      .select('_id userId fullName')
      .lean()
      .exec();

    const directorByUser = new Map(
      directors
        .filter((d) => d.userId)
        .map((d) => [String(d.userId), d]),
    );

    // Include linked directors even if role is missing (edge case)
    if (!userIds?.length) {
      const missingUserIds = directors
        .map((d) => String(d.userId))
        .filter((id) => id && !users.some((u) => String(u._id) === id));
      if (missingUserIds.length) {
        const extras = await this.userModel
          .find({
            _id: {
              $in: missingUserIds.map((id) => new Types.ObjectId(id)),
            },
            status: UserStatus.Active,
          })
          .select('_id fullName email roleIds')
          .lean()
          .exec();
        users.push(...extras);
      }
    }

    return users.map((u) => {
      const director = directorByUser.get(String(u._id));
      const roleCodes = (u.roleIds ?? [])
        .map((id) => roleCodeById.get(String(id)))
        .filter((c): c is string => Boolean(c));
      return {
        userId: String(u._id),
        fullName: u.fullName,
        email: u.email ?? null,
        directorId: director ? String(director._id) : null,
        roleCodes,
      };
    });
  }

  private async resolveProjectIds(
    recipient: DirectorDigestRecipient,
  ): Promise<Types.ObjectId[]> {
    if (recipient.directorId) {
      const rows = await this.participantModel
        .find({
          participantType: ParticipantType.Director,
          participantId: new Types.ObjectId(recipient.directorId),
          status: ParticipantApprovalStatus.Approved,
          effectiveTo: null,
        })
        .select('projectId')
        .lean()
        .exec();
      if (rows.length) {
        return rows.map((r) => r.projectId as Types.ObjectId);
      }
    }

    if (recipient.roleCodes.includes('MANAGING_DIRECTOR')) {
      const all = await this.projectModel.find({}).select('_id').lean().exec();
      return all.map((p) => p._id as Types.ObjectId);
    }

    const user = await this.userModel
      .findById(recipient.userId)
      .select('assignedProjects')
      .lean()
      .exec();
    return (user?.assignedProjects ?? []) as Types.ObjectId[];
  }

  // ─── digest build ──────────────────────────────────────────────────────

  async buildDigestForRecipient(
    recipient: DirectorDigestRecipient,
    digestDate: Date,
  ): Promise<DirectorDigestSummary> {
    const dayStart = this.startOfUtcDay(digestDate);
    const dayEnd = this.endOfUtcDay(digestDate);
    const projectIds = await this.resolveProjectIds(recipient);
    const projectFilter = { $in: projectIds };
    const asOf = dayEnd;

    const projects = projectIds.length
      ? await this.projectModel
          .find({ _id: { $in: projectIds } })
          .select('_id projectCode projectName')
          .lean()
          .exec()
      : [];
    const projectMeta = new Map(
      projects.map((p) => [
        String(p._id),
        {
          projectCode: p.projectCode ?? null,
          projectName: p.projectName ?? null,
        },
      ]),
    );

    const [
      yesterdayProjectExpenses,
      fundsReceived,
      paymentsReleased,
      currentBankBalance,
      currentCashBalance,
      labourAttendance,
      materialReceipts,
      materialShortages,
      projectProgress,
      vendorPaymentsDue,
      customerCollections,
      pendingApprovals,
    ] = await Promise.all([
      this.sumExpenses(projectFilter, dayStart, dayEnd),
      this.sumFundsReceived(projectFilter, dayStart, dayEnd),
      this.sumPaymentsReleased(projectFilter, dayStart, dayEnd),
      this.sumBankBalance(projectIds, asOf),
      this.sumCashBalance(projectIds, asOf),
      this.sumLabourAttendance(projectFilter, dayStart, dayEnd),
      this.sumMaterialReceipts(projectFilter, dayStart, dayEnd),
      this.listMaterialShortages(projectFilter),
      this.listProjectProgress(projectFilter, projectMeta),
      this.sumVendorPaymentsDue(projectFilter),
      this.sumCustomerCollections(projectFilter, dayStart, dayEnd),
      this.countPendingApprovals(projectFilter),
    ]);

    const criticalAlerts = this.buildCriticalAlerts({
      materialShortages: materialShortages.count,
      pendingApprovals: pendingApprovals.count,
      vendorPaymentsDue: vendorPaymentsDue.count,
    });

    const summary: DirectorDigestSummary = {
      userId: recipient.userId,
      directorId: recipient.directorId,
      directorName: recipient.fullName,
      digestDate: this.toDateKey(dayStart),
      generatedAt: new Date().toISOString(),
      projectCount: projectIds.length,
      yesterdayProjectExpenses,
      fundsReceived,
      paymentsReleased,
      currentBankBalance,
      currentCashBalance,
      labourAttendance,
      materialReceipts,
      materialShortages,
      projectProgress,
      vendorPaymentsDue,
      customerCollections,
      pendingApprovals,
      criticalAlerts,
      summaryText: '',
    };
    summary.summaryText = this.formatSummaryText(summary);
    return summary;
  }

  private async sumExpenses(
    projectFilter: { $in: Types.ObjectId[] },
    dayStart: Date,
    dayEnd: Date,
  ): Promise<DigestMoney> {
    if (!projectFilter.$in.length) return { amount: 0, count: 0 };
    const [agg] = await this.expenseModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            expenseDate: { $gte: dayStart, $lte: dayEnd },
            status: {
              $in: [
                SiteExpenseVoucherStatus.Approved,
                SiteExpenseVoucherStatus.Posted,
                SiteExpenseVoucherStatus.Verified,
                SiteExpenseVoucherStatus.Submitted,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return {
      amount: this.round2(agg?.total ?? 0),
      count: agg?.count ?? 0,
    };
  }

  private async sumFundsReceived(
    projectFilter: { $in: Types.ObjectId[] },
    dayStart: Date,
    dayEnd: Date,
  ): Promise<DigestMoney> {
    if (!projectFilter.$in.length) return { amount: 0, count: 0 };
    const [agg] = await this.contributionReceiptModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            receivedDate: { $gte: dayStart, $lte: dayEnd },
            status: ContributionReceiptStatus.Posted,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return {
      amount: this.round2(agg?.total ?? 0),
      count: agg?.count ?? 0,
    };
  }

  private async sumPaymentsReleased(
    projectFilter: { $in: Types.ObjectId[] },
    dayStart: Date,
    dayEnd: Date,
  ): Promise<DigestMoney> {
    if (!projectFilter.$in.length) return { amount: 0, count: 0 };

    const [vendorAgg] = await this.vendorPaymentModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            paymentDate: { $gte: dayStart, $lte: dayEnd },
            status: {
              $in: [
                VendorPaymentStatus.Released,
                VendorPaymentStatus.Posted,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$bankAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const [contractorAgg] = await this.contractorPaymentModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            paymentDate: { $gte: dayStart, $lte: dayEnd },
            status: {
              $in: [
                ContractorPaymentStatus.Released,
                ContractorPaymentStatus.Posted,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$bankAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return {
      amount: this.round2(
        (vendorAgg?.total ?? 0) + (contractorAgg?.total ?? 0),
      ),
      count: (vendorAgg?.count ?? 0) + (contractorAgg?.count ?? 0),
    };
  }

  private async sumBankBalance(
    projectIds: Types.ObjectId[],
    asOf: Date,
  ): Promise<number> {
    const filter: FilterQuery<CompanyBankAccount> = {
      status: BankAccountStatus.Active,
    };
    if (projectIds.length) {
      filter.$or = [
        { projectId: { $in: projectIds } },
        { projectId: null },
      ];
    }

    const accounts = await this.bankModel
      .find(filter)
      .select('_id ledgerAccountId openingBalance')
      .lean()
      .exec();
    return this.totalLedgerBalances(accounts, asOf);
  }

  private async sumCashBalance(
    projectIds: Types.ObjectId[],
    asOf: Date,
  ): Promise<number> {
    const filter: FilterQuery<CashAccount> = {
      status: { $ne: CashAccountStatus.Closed },
    };
    if (projectIds.length) {
      filter.projectId = { $in: projectIds };
    } else {
      return 0;
    }

    const accounts = await this.cashModel
      .find(filter)
      .select('_id ledgerAccountId openingBalance')
      .lean()
      .exec();
    return this.totalLedgerBalances(accounts, asOf);
  }

  private async totalLedgerBalances(
    accounts: Array<{
      _id: Types.ObjectId;
      ledgerAccountId?: Types.ObjectId;
      openingBalance?: number;
    }>,
    asOf: Date,
  ): Promise<number> {
    if (!accounts.length) return 0;
    const ledgerIds = accounts
      .map((a) => a.ledgerAccountId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: JournalStatus.Posted,
          'lines.accountId': { $in: ledgerIds },
          journalDate: { $lte: asOf },
        },
      },
      { $unwind: '$lines' },
      { $match: { 'lines.accountId': { $in: ledgerIds } } },
      {
        $group: {
          _id: '$lines.accountId',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ];

    const rows = await this.journalModel.aggregate(pipeline).exec();
    const byLedger = new Map(
      rows.map((r) => [
        String(r._id),
        { debit: r.totalDebit ?? 0, credit: r.totalCredit ?? 0 },
      ]),
    );

    let total = 0;
    for (const a of accounts) {
      const mov = byLedger.get(String(a.ledgerAccountId)) ?? {
        debit: 0,
        credit: 0,
      };
      total += (a.openingBalance ?? 0) + mov.debit - mov.credit;
    }
    return this.round2(total);
  }

  private async sumLabourAttendance(
    projectFilter: { $in: Types.ObjectId[] },
    dayStart: Date,
    dayEnd: Date,
  ) {
    if (!projectFilter.$in.length) {
      return { sheetCount: 0, workerCount: 0 };
    }
    const sheets = await this.attendanceModel
      .find({
        projectId: projectFilter,
        attendanceDate: { $gte: dayStart, $lte: dayEnd },
        status: {
          $in: [
            LabourAttendanceStatus.Submitted,
            LabourAttendanceStatus.Confirmed,
          ],
        },
      })
      .select('lines.workerCount')
      .lean()
      .exec();

    let workerCount = 0;
    for (const sheet of sheets) {
      for (const line of sheet.lines ?? []) {
        workerCount += line.workerCount ?? 0;
      }
    }
    return { sheetCount: sheets.length, workerCount };
  }

  private async sumMaterialReceipts(
    projectFilter: { $in: Types.ObjectId[] },
    dayStart: Date,
    dayEnd: Date,
  ) {
    if (!projectFilter.$in.length) {
      return { grnCount: 0, lineCount: 0, receivedQuantity: 0 };
    }
    const grns = await this.grnModel
      .find({
        projectId: projectFilter,
        receivedDate: { $gte: dayStart, $lte: dayEnd },
        status: {
          $in: [
            GoodsReceiptStatus.Accepted,
            GoodsReceiptStatus.PartiallyAccepted,
            GoodsReceiptStatus.Posted,
            GoodsReceiptStatus.QualityCheck,
            GoodsReceiptStatus.Submitted,
          ],
        },
      })
      .select('items')
      .lean()
      .exec();

    let lineCount = 0;
    let receivedQuantity = 0;
    for (const grn of grns) {
      for (const item of grn.items ?? []) {
        lineCount += 1;
        receivedQuantity += item.receivedQuantity ?? 0;
      }
    }
    return {
      grnCount: grns.length,
      lineCount,
      receivedQuantity: this.round2(receivedQuantity),
    };
  }

  private async listMaterialShortages(projectFilter: {
    $in: Types.ObjectId[];
  }) {
    if (!projectFilter.$in.length) {
      return { count: 0, items: [] as Array<{ id: string; projectId: string; message: string }> };
    }
    const items = await this.stockAlertModel
      .find({
        projectId: projectFilter,
        status: StockReorderAlertStatus.Open,
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();

    return {
      count: items.length,
      items: items.map((a) => ({
        id: String(a._id),
        projectId: String(a.projectId),
        message: `${a.materialName ?? a.materialCode ?? 'Material'}: ${a.alertType}`,
      })),
    };
  }

  private async listProjectProgress(
    projectFilter: { $in: Types.ObjectId[] },
    projectMeta: Map<
      string,
      { projectCode: string | null; projectName: string | null }
    >,
  ) {
    if (!projectFilter.$in.length) return [];

    const rows = await this.workMeasurementModel
      .aggregate<{
        _id: Types.ObjectId;
        planned: number;
        measured: number;
      }>([
        {
          $match: {
            projectId: projectFilter,
            status: WorkMeasurementStatus.Verified,
          },
        },
        {
          $group: {
            _id: {
              projectId: '$projectId',
              boqItemId: '$boqItemId',
            },
            planned: { $max: '$boqPlannedQuantity' },
            measured: { $max: '$cumulativeQuantity' },
          },
        },
        {
          $group: {
            _id: '$_id.projectId',
            planned: { $sum: '$planned' },
            measured: { $sum: '$measured' },
          },
        },
      ])
      .exec();

    return rows.map((r) => {
      const projectId = String(r._id);
      const meta = projectMeta.get(projectId);
      const planned = r.planned ?? 0;
      const measured = r.measured ?? 0;
      return {
        projectId,
        projectCode: meta?.projectCode ?? null,
        projectName: meta?.projectName ?? null,
        progressPercent:
          planned > 0 ? this.round2((measured / planned) * 100) : 0,
      };
    });
  }

  private async sumVendorPaymentsDue(projectFilter: {
    $in: Types.ObjectId[];
  }): Promise<DigestMoney> {
    if (!projectFilter.$in.length) return { amount: 0, count: 0 };
    const rows = await this.vendorInvoiceModel
      .find({
        projectId: projectFilter,
        status: {
          $in: [
            VendorInvoiceStatus.Posted,
            VendorInvoiceStatus.Approval,
            VendorInvoiceStatus.Matching,
            VendorInvoiceStatus.Verification,
            VendorInvoiceStatus.Submitted,
          ],
        },
      })
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let amount = 0;
    let count = 0;
    for (const r of rows) {
      const remaining = this.round2(
        (r.totalAmount ?? 0) -
          (r.tds ?? 0) -
          (r.retention ?? 0) -
          (r.paidAmount ?? 0),
      );
      if (remaining > 0) {
        amount += remaining;
        count += 1;
      }
    }
    return { amount: this.round2(amount), count };
  }

  private async sumCustomerCollections(
    projectFilter: { $in: Types.ObjectId[] },
    dayStart: Date,
    dayEnd: Date,
  ): Promise<DigestMoney> {
    if (!projectFilter.$in.length) return { amount: 0, count: 0 };
    const [agg] = await this.customerReceiptModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            receiptDate: { $gte: dayStart, $lte: dayEnd },
            status: CustomerReceiptStatus.Posted,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
    return {
      amount: this.round2(agg?.total ?? 0),
      count: agg?.count ?? 0,
    };
  }

  private async countPendingApprovals(projectFilter: {
    $in: Types.ObjectId[];
  }) {
    if (!projectFilter.$in.length) return { count: 0 };
    const count = await this.approvalModel
      .countDocuments({
        status: ApprovalStatus.Pending,
        projectId: projectFilter,
      })
      .exec();
    return { count };
  }

  private buildCriticalAlerts(input: {
    materialShortages: number;
    pendingApprovals: number;
    vendorPaymentsDue: number;
  }): DigestAlert[] {
    const alerts: DigestAlert[] = [];
    if (input.materialShortages > 0) {
      alerts.push({
        code: 'MATERIAL_SHORTAGES',
        severity: 'warning',
        message: 'Open material shortage / reorder alerts',
        count: input.materialShortages,
      });
    }
    if (input.pendingApprovals > 0) {
      alerts.push({
        code: 'PENDING_APPROVALS',
        severity: 'warning',
        message: 'Approvals awaiting action',
        count: input.pendingApprovals,
      });
    }
    if (input.vendorPaymentsDue > 0) {
      alerts.push({
        code: 'VENDOR_PAYMENTS_DUE',
        severity: 'critical',
        message: 'Vendor invoices with outstanding payable',
        count: input.vendorPaymentsDue,
      });
    }
    return alerts;
  }

  private formatSummaryText(summary: DirectorDigestSummary): string {
    const avgProgress =
      summary.projectProgress.length > 0
        ? this.round2(
            summary.projectProgress.reduce(
              (s, p) => s + p.progressPercent,
              0,
            ) / summary.projectProgress.length,
          )
        : 0;

    return [
      `Daily digest for ${summary.directorName} (${summary.digestDate})`,
      `Projects: ${summary.projectCount}`,
      `Yesterday expenses: ₹${summary.yesterdayProjectExpenses.amount} (${summary.yesterdayProjectExpenses.count})`,
      `Funds received: ₹${summary.fundsReceived.amount}`,
      `Payments released: ₹${summary.paymentsReleased.amount}`,
      `Bank balance: ₹${summary.currentBankBalance}`,
      `Cash balance: ₹${summary.currentCashBalance}`,
      `Labour: ${summary.labourAttendance.workerCount} workers / ${summary.labourAttendance.sheetCount} sheets`,
      `Material receipts: ${summary.materialReceipts.grnCount} GRNs`,
      `Material shortages: ${summary.materialShortages.count}`,
      `Avg project progress: ${avgProgress}%`,
      `Vendor payments due: ₹${summary.vendorPaymentsDue.amount}`,
      `Customer collections: ₹${summary.customerCollections.amount}`,
      `Pending approvals: ${summary.pendingApprovals.count}`,
      `Critical alerts: ${summary.criticalAlerts.length}`,
    ].join('\n');
  }

  // ─── persistence / date helpers ────────────────────────────────────────

  private async upsertDigestRecord(
    summary: DirectorDigestSummary,
    deliveryStatus: DailyDirectorDigestDeliveryStatus,
    channels: NotificationChannel[],
    notificationId: string | null,
  ) {
    const digestDate = this.startOfUtcDay(new Date(summary.digestDate));
    await this.digestModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(summary.userId),
          digestDate,
        },
        {
          $set: {
            directorId: summary.directorId
              ? new Types.ObjectId(summary.directorId)
              : null,
            summary,
            deliveryStatus,
            channels,
            notificationId,
            lastError: null,
            sentAt:
              deliveryStatus === DailyDirectorDigestDeliveryStatus.Sent
                ? new Date()
                : null,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  resolveDigestDate(date?: string): Date {
    if (date) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid date');
      }
      return this.startOfUtcDay(parsed);
    }
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return this.startOfUtcDay(yesterday);
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private endOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }

  private toDateKey(d: Date): string {
    return this.startOfUtcDay(d).toISOString().slice(0, 10);
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
