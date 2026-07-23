import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  CashAccount,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  CompanyBankAccount,
  BankAccountStatus,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import { Project } from '../projects/schemas/project.schema';
import {
  ContributionCommitment,
  CommitmentStatus,
} from '../project-commitments/schemas/contribution-commitment.schema';
import { ProjectDashboardService } from '../project-dashboard/project-dashboard.service';
import {
  VendorInvoice,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  computeCashFlowBucket,
  computeCostForecast,
  computeProjectMargin,
  roundMoney,
} from './analytics.calculation';
import type {
  CashFlowForecastQueryDto,
  AnalyticsQueryDto,
} from './dto/analytics-query.dto';
import type {
  CashFlowForecastView,
  ProjectProfitabilityView,
} from './analytics.types';

const API = '/api/v1';

@Injectable()
export class AnalyticsForecastService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(PaymentSchedule.name)
    private readonly scheduleModel: Model<PaymentSchedule>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    private readonly projectDashboard: ProjectDashboardService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async getCostForecast(query: AnalyticsQueryDto, actorId: string) {
    if (!query.projectId) {
      throw new BadRequestException('projectId is required for cost forecast');
    }
    await this.projectAccess.assertCanAccessProject(
      actorId,
      query.projectId,
      'read',
    );
    const dash = await this.projectDashboard.getDashboard(
      query.projectId,
      { date: query.date, from: query.from, to: query.to },
      actorId,
    );
    const s = dash.data;
    if (!s) {
      throw new NotFoundException('Project dashboard unavailable');
    }

    const cost = computeCostForecast({
      originalBudget: s.approvedBudget.amount,
      revisedBudget: s.revisedBudget.amount,
      actualCost: s.actualCost.amount,
      committedUnbilledCost: s.committedCost.amount,
      // Prefer residual unless dashboard already computed a different ETC
      forecastRemainingCost: s.forecastCostToComplete.amount,
    });

    return createSuccessResponse(
      {
        projectId: query.projectId,
        projectCode: s.project.projectCode,
        projectName: s.project.projectName,
        ...cost,
        formula:
          'EAC = Actual Cost + Committed Unbilled Cost + Forecast Remaining Cost',
        drillPath: [
          {
            level: 'kpi',
            label: 'Cost Forecast',
            href: `${API}/analytics/cost-forecast?projectId=${query.projectId}`,
          },
          {
            level: 'project',
            label: s.project.projectName,
            href: `${API}/projects/${query.projectId}`,
          },
          {
            level: 'dashboard',
            label: 'Project dashboard',
            href: `${API}/projects/${query.projectId}/dashboard`,
          },
        ],
      },
      'Project cost forecast',
    );
  }

  async getProjectProfitability(query: AnalyticsQueryDto, actorId: string) {
    if (!query.projectId) {
      throw new BadRequestException(
        'projectId is required for project profitability',
      );
    }
    await this.projectAccess.assertCanAccessProject(
      actorId,
      query.projectId,
      'read',
    );
    const dash = await this.projectDashboard.getDashboard(
      query.projectId,
      { date: query.date, from: query.from, to: query.to },
      actorId,
    );
    const s = dash.data;
    if (!s) {
      throw new NotFoundException('Project dashboard unavailable');
    }

    const cost = computeCostForecast({
      originalBudget: s.approvedBudget.amount,
      revisedBudget: s.revisedBudget.amount,
      actualCost: s.actualCost.amount,
      committedUnbilledCost: s.committedCost.amount,
      forecastRemainingCost: s.forecastCostToComplete.amount,
    });

    // Revenue proxy: booking collections target ≈ investor + customer collections received
    // plus open schedule outstanding where available — use collections + open dues heuristic.
    const revenue = roundMoney(
      s.customerCollections.amount + s.investorFunding.committedAmount,
    );
    const margin = computeProjectMargin({
      revenue,
      estimateAtCompletion: cost.estimateAtCompletion,
      collections: s.customerCollections.amount,
    });
    const capitalDeployed = roundMoney(s.investorFunding.receivedAmount);
    const returnOnCapital =
      capitalDeployed > 0
        ? roundMoney((margin.margin / capitalDeployed) * 100)
        : null;

    const view: ProjectProfitabilityView = {
      projectId: query.projectId,
      revenue: margin.revenue,
      estimateAtCompletion: cost.estimateAtCompletion,
      margin: margin.margin,
      marginPercent: margin.marginPercent,
      collectionEfficiency: margin.collectionEfficiency,
      capitalDeployed,
      returnOnCapital,
      cost,
      drillPath: [
        {
          level: 'kpi',
          label: 'Project Profitability',
          href: `${API}/analytics/project-profitability?projectId=${query.projectId}`,
        },
        {
          level: 'project',
          label: s.project.projectName,
          href: `${API}/projects/${query.projectId}`,
        },
        {
          level: 'pnl',
          label: 'Project P&L',
          href: `${API}/accounting-reports/project-profit-and-loss?projectId=${query.projectId}`,
        },
      ],
    };
    return createSuccessResponse(view, 'Project profitability');
  }

  async getCashFlowForecast(query: CashFlowForecastQueryDto, actorId: string) {
    const access = await this.projectAccess.listAccessibleProjectIds(actorId);
    let projectIds: Types.ObjectId[];
    if (access.globalAccess) {
      const all = await this.projectModel.find({}).select('_id').lean().exec();
      projectIds = all.map((p) => p._id as Types.ObjectId);
    } else {
      projectIds = access.projectIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
    }
    if (query.projectId) {
      await this.projectAccess.assertCanAccessProject(
        actorId,
        query.projectId,
        'read',
      );
      projectIds = [new Types.ObjectId(query.projectId)];
    }

    const asOf = query.date
      ? this.startOfUtcDay(new Date(query.date))
      : this.startOfUtcDay(new Date());
    const horizonKey = String(query.horizon ?? '30');
    const windows = this.buildWindows(asOf, horizonKey);

    if (!projectIds.length) {
      const emptyBuckets = windows.map((window) => ({
        ...computeCashFlowBucket({
          label: window.label,
          periodStart: window.start.toISOString(),
          periodEnd: window.end.toISOString(),
          collections: 0,
          contractorPayments: 0,
          vendorPayments: 0,
          payrollLabour: 0,
          statutoryDues: 0,
          loanInflows: 0,
          loanRepayments: 0,
          directorInvestorContributions: 0,
        }),
        closingCash: 0,
      }));
      return createSuccessResponse(
        {
          horizon: horizonKey,
          asOf: asOf.toISOString(),
          openingCash: 0,
          buckets: emptyBuckets,
          projectFundingGaps: [],
          drillPath: [
            {
              level: 'kpi',
              label: 'Cash-flow forecast',
              href: `${API}/analytics/cash-flow-forecast`,
            },
          ],
          emptyReason: 'No accessible projects in scope for this forecast',
        } satisfies CashFlowForecastView,
        'Cash-flow forecast (no projects in scope)',
      );
    }

    const openingCash = await this.sumCashAndBank(projectIds);

    let running = openingCash;
    const buckets: CashFlowForecastView['buckets'] = [];

    for (const window of windows) {
      const [
        collections,
        contractorPayments,
        vendorPayments,
        contributions,
      ] = await Promise.all([
        this.sumScheduleDue(projectIds, window.start, window.end),
        this.sumContractorDue(projectIds, window.start, window.end),
        this.sumVendorDue(projectIds, window.start, window.end),
        this.sumContributionPending(projectIds),
      ]);

      // Contributions / statutory / loans are lightly modelled — pending commitments
      // allocated proportionally across windows when horizon is short.
      const directorInvestorContributions = roundMoney(
        contributions / Math.max(1, windows.length),
      );

      const computed = computeCashFlowBucket({
        label: window.label,
        periodStart: window.start.toISOString(),
        periodEnd: window.end.toISOString(),
        collections,
        contractorPayments,
        vendorPayments,
        payrollLabour: 0,
        statutoryDues: 0,
        loanInflows: 0,
        loanRepayments: 0,
        directorInvestorContributions,
      });
      running = roundMoney(running + computed.net);
      buckets.push({ ...computed, closingCash: running });
    }

    const projects = await this.projectModel
      .find({ _id: { $in: projectIds } })
      .select('projectCode')
      .lean()
      .exec();
    const projectFundingGaps = projects.map((p) => {
      const gap = buckets.reduce((sum, b) => sum + b.fundingGap, 0);
      return {
        projectId: String(p._id),
        projectCode: p.projectCode ?? null,
        fundingGap: roundMoney(
          query.projectId ? gap : gap / Math.max(1, projects.length),
        ),
      };
    });

    const view: CashFlowForecastView = {
      horizon: horizonKey,
      asOf: asOf.toISOString(),
      openingCash,
      buckets,
      projectFundingGaps,
      drillPath: [
        {
          level: 'kpi',
          label: 'Cash-flow forecast',
          href: `${API}/analytics/cash-flow-forecast`,
        },
        {
          level: 'schedules',
          label: 'Payment schedules',
          href: `${API}/payment-schedules`,
        },
        {
          level: 'vendor',
          label: 'Vendor invoices',
          href: `${API}/vendor-invoices`,
        },
        {
          level: 'contractor',
          label: 'Contractor bills',
          href: `${API}/contractor-bills`,
        },
      ],
    };

    return createSuccessResponse(view, 'Cash-flow forecast');
  }

  private buildWindows(
    asOf: Date,
    horizonKey: string,
  ): Array<{ label: string; start: Date; end: Date }> {
    if (horizonKey === 'monthly') {
      return Array.from({ length: 6 }, (_, i) => {
        const start = new Date(
          Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + i, 1),
        );
        const end = new Date(
          Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + i + 1, 0, 23, 59, 59, 999),
        );
        return {
          label: start.toISOString().slice(0, 7),
          start,
          end,
        };
      });
    }
    if (horizonKey === 'completion') {
      const end = new Date(asOf);
      end.setUTCFullYear(end.getUTCFullYear() + 2);
      return [
        {
          label: 'to_completion',
          start: asOf,
          end: this.endOfUtcDay(end),
        },
      ];
    }
    const days = Number(horizonKey);
    if (![7, 30, 90].includes(days)) {
      throw new BadRequestException(
        'horizon must be 7, 30, 90, monthly, or completion',
      );
    }
    const end = new Date(asOf.getTime() + days * 24 * 60 * 60 * 1000);
    return [
      {
        label: `${days}d`,
        start: asOf,
        end: this.endOfUtcDay(end),
      },
    ];
  }

  private async sumCashAndBank(projectIds: Types.ObjectId[]): Promise<number> {
    /** Opening balances as a fast opening cash proxy (journals refine on command centre). */
    const [banks, cash] = await Promise.all([
      this.bankModel
        .aggregate<{ total: number }>([
          {
            $match: {
              status: BankAccountStatus.Active,
              $or: [
                { projectId: { $in: projectIds } },
                { projectId: null },
                { projectId: { $exists: false } },
              ],
            },
          },
          { $group: { _id: null, total: { $sum: '$openingBalance' } } },
        ])
        .exec(),
      this.cashModel
        .aggregate<{ total: number }>([
          {
            $match: {
              status: { $ne: CashAccountStatus.Closed },
              projectId: { $in: projectIds },
            },
          },
          { $group: { _id: null, total: { $sum: '$openingBalance' } } },
        ])
        .exec(),
    ]);
    return roundMoney((banks[0]?.total ?? 0) + (cash[0]?.total ?? 0));
  }

  private async sumScheduleDue(
    projectIds: Types.ObjectId[],
    start: Date,
    end: Date,
  ): Promise<number> {
    const schedules = await this.scheduleModel
      .find({
        projectId: { $in: projectIds },
        status: PaymentScheduleStatus.Active,
      })
      .select('lines')
      .lean()
      .exec();

    let total = 0;
    for (const schedule of schedules) {
      for (const line of schedule.lines ?? []) {
        const due = line.dueDate ? new Date(line.dueDate) : null;
        if (!due || due < start || due > end) continue;
        if (
          line.status === PaymentScheduleLineStatus.Paid ||
          line.status === PaymentScheduleLineStatus.Waived
        ) {
          continue;
        }
        const outstanding = Math.max(
          0,
          (line.amount ?? 0) - (line.collectedAmount ?? 0),
        );
        total += outstanding;
      }
    }
    return roundMoney(total);
  }

  private async sumVendorDue(
    projectIds: Types.ObjectId[],
    start: Date,
    end: Date,
  ): Promise<number> {
    const rows = await this.vendorInvoiceModel
      .find({
        projectId: { $in: projectIds },
        dueDate: { $gte: start, $lte: end },
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('totalAmount paidAmount tds retention')
      .lean()
      .exec();
    return roundMoney(
      rows.reduce((sum, row) => {
        const net =
          (row.totalAmount ?? 0) -
          (row.paidAmount ?? 0) -
          (row.tds ?? 0) -
          (row.retention ?? 0);
        return sum + Math.max(0, net);
      }, 0),
    );
  }

  private async sumContractorDue(
    projectIds: Types.ObjectId[],
    start: Date,
    end: Date,
  ): Promise<number> {
    const rows = await this.contractorBillModel
      .find({
        projectId: { $in: projectIds },
        status: {
          $in: [
            ContractorBillStatus.DirectorApproved,
            ContractorBillStatus.Posted,
            ContractorBillStatus.PartiallyPaid,
            ContractorBillStatus.FinanceVerified,
            ContractorBillStatus.PmCertified,
          ],
        },
        'billingPeriod.to': { $gte: start, $lte: end },
      })
      .select('netPayable paidAmount')
      .lean()
      .exec();
    return roundMoney(
      rows.reduce((sum, row) => {
        const net = (row.netPayable ?? 0) - (row.paidAmount ?? 0);
        return sum + Math.max(0, net);
      }, 0),
    );
  }

  private async sumContributionPending(
    projectIds: Types.ObjectId[],
  ): Promise<number> {
    const rows = await this.commitmentModel
      .find({
        projectId: { $in: projectIds },
        status: CommitmentStatus.Approved,
      })
      .select('commitmentAmount receivedAmount')
      .lean()
      .exec();
    return roundMoney(
      rows.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            (row.commitmentAmount ?? 0) - (row.receivedAmount ?? 0),
          ),
        0,
      ),
    );
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
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
}
