import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { ContractorDashboardService } from '../contractor-dashboard/contractor-dashboard.service';
import { DirectorCommandCentreService } from '../director-command-centre/director-command-centre.service';
import { FinanceDashboardService } from '../finance-dashboard/finance-dashboard.service';
import { InventoryDashboardService } from '../inventory-dashboard/inventory-dashboard.service';
import { ProcurementDashboardService } from '../procurement-dashboard/procurement-dashboard.service';
import { ProjectAccessService } from '../project-access/project-access.service';
import { ProjectDashboardService } from '../project-dashboard/project-dashboard.service';
import { SalesDashboardService } from '../sales-dashboard/sales-dashboard.service';
import { SiteExecutionDashboardService } from '../site-execution-dashboard/site-execution-dashboard.service';
import {
  computeCostForecast,
  computeProjectMargin,
  roundMoney,
} from './analytics.calculation';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsForecastService } from './forecast.service';
import type {
  DomainAnalyticsView,
  ExecutiveSummary,
  KpiTile,
  ProjectHealthView,
} from './analytics.types';

const API = '/api/v1';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly commandCentre: DirectorCommandCentreService,
    private readonly projectDashboard: ProjectDashboardService,
    private readonly financeDashboard: FinanceDashboardService,
    private readonly salesDashboard: SalesDashboardService,
    private readonly contractorDashboard: ContractorDashboardService,
    private readonly inventoryDashboard: InventoryDashboardService,
    private readonly procurementDashboard: ProcurementDashboardService,
    private readonly siteExecutionDashboard: SiteExecutionDashboardService,
    private readonly forecast: AnalyticsForecastService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async getExecutiveSummary(query: AnalyticsQueryDto, actorId: string) {
    const cc = await this.commandCentre.getSummary(
      {
        projectId: query.projectId,
        date: query.date ?? new Date().toISOString().slice(0, 10),
      },
      actorId,
    );
    const data = cc.data;
    if (!data) {
      throw new NotFoundException('Command centre unavailable');
    }

    const cashAndBank = roundMoney(
      (data.totalCompanyBankBalance?.amount ?? 0) +
        (data.totalCashBalance?.amount ?? 0),
    );
    const collectionsToday = data.customerCollections?.amount ?? 0;
    const paymentsDue = data.paymentsDueToday?.amount ?? 0;
    const receivables = data.overduePayments?.amount ?? 0;
    const payables = roundMoney(
      (data.vendorPayable?.amount ?? 0) + (data.contractorPayable?.amount ?? 0),
    );
    const contractorLiabilities = data.contractorPayable?.amount ?? 0;
    const criticalAlertCount = data.criticalExceptions?.length ?? 0;
    const pendingApprovals = data.purchaseRequestsPending?.count ?? 0;

    const projects = (data.costVersusBudget ?? []).slice(0, 50).map((row) => {
      const physical =
        data.physicalProgress?.find((p) => p.projectId === row.projectId)
          ?.progressPercent ?? 0;
      const financial =
        row.budgetAmount > 0
          ? roundMoney((row.actualCost / row.budgetAmount) * 100)
          : 0;
      const marginForecast = roundMoney(row.budgetAmount - row.actualCost);
      const utilisation = row.utilisationPercent ?? 0;
      let health: 'green' | 'amber' | 'red' = 'green';
      if (marginForecast < 0 || utilisation > 100) {
        health = 'red';
      } else if (utilisation > 90 || physical < financial - 15) {
        health = 'amber';
      }
      return {
        projectId: row.projectId,
        projectCode: row.projectCode,
        projectName: row.projectName,
        physicalProgressPercent: physical,
        financialProgressPercent: financial,
        marginForecast,
        health,
      };
    });

    const kpis: KpiTile[] = [
      this.kpi(
        'cash',
        'Cash and Bank',
        cashAndBank,
        'money',
        `${API}/company-bank-accounts`,
      ),
      this.kpi(
        'collections',
        'Collections',
        collectionsToday,
        'money',
        `${API}/customer-receipts`,
      ),
      this.kpi(
        'payments_due',
        'Payments Due',
        paymentsDue,
        'money',
        `${API}/vendor-invoices`,
      ),
      this.kpi(
        'receivables',
        'Receivables (overdue)',
        receivables,
        'money',
        `${API}/payment-schedules`,
      ),
      this.kpi(
        'payables',
        'Payables',
        payables,
        'money',
        `${API}/vendor-invoices`,
      ),
      this.kpi(
        'contractor_exposure',
        'Contractor Liabilities',
        contractorLiabilities,
        'money',
        `${API}/contractor-bills`,
      ),
      this.kpi(
        'alerts',
        'Critical Alerts',
        criticalAlertCount,
        'count',
        `${API}/analytics/alerts`,
      ),
    ];

    const summary: ExecutiveSummary = {
      asOf: data.filters.date,
      generatedAt: new Date().toISOString(),
      company: {
        cashAndBank,
        collectionsToday,
        paymentsDue,
        receivables,
        payables,
        contractorLiabilities,
        criticalAlertCount,
        pendingApprovals,
      },
      projects,
      kpis,
      source: 'live',
    };

    return createSuccessResponse(summary, 'Executive summary');
  }

  async getProjectHealth(query: AnalyticsQueryDto, actorId: string) {
    if (!query.projectId) {
      throw new BadRequestException('projectId is required');
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
    const revenue = roundMoney(
      s.customerCollections.amount + s.investorFunding.committedAmount,
    );
    const margin = computeProjectMargin({
      revenue,
      estimateAtCompletion: cost.estimateAtCompletion,
      collections: s.customerCollections.amount,
    });
    const budget =
      cost.budgetBasis === 'revised' ? cost.revisedBudget : cost.originalBudget;

    const view: ProjectHealthView = {
      projectId: query.projectId,
      projectCode: s.project.projectCode,
      projectName: s.project.projectName,
      physicalProgressPercent: s.physicalCompletion.percent,
      financialProgressPercent: s.financialCompletion.percent,
      plannedVsActual: {
        planned: s.physicalCompletion.denominator,
        actual: s.physicalCompletion.numerator,
        variance: roundMoney(
          s.physicalCompletion.numerator - s.physicalCompletion.denominator,
        ),
      },
      budgetVsActual: {
        budget,
        actual: cost.actualCost,
        variance: roundMoney(budget - cost.actualCost),
      },
      cost,
      revenue: margin.revenue,
      collections: s.customerCollections.amount,
      receivables: 0,
      payables: s.vendorDues.amount,
      margin: margin.margin,
      cashPosition: roundMoney(
        s.bankBalance.amount + s.cashBalance.amount,
      ),
      delays: s.criticalAlerts.filter((a) =>
        a.code.toLowerCase().includes('delay'),
      ).length,
      criticalIssueCount: s.criticalAlerts.length,
      drillPath: [
        {
          level: 'kpi',
          label: 'Project Health',
          href: `${API}/analytics/project-health?projectId=${query.projectId}`,
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
    };
    return createSuccessResponse(view, 'Project health');
  }

  async getDomainAnalytics(
    domain: DomainAnalyticsView['domain'],
    query: AnalyticsQueryDto,
    actorId: string,
  ) {
    const asOf = query.date ?? new Date().toISOString().slice(0, 10);
    let payload: Record<string, unknown> = {};
    let kpis: KpiTile[] = [];

    switch (domain) {
      case 'sales': {
        const res = await this.salesDashboard.getSummary({
          projectId: query.projectId,
        });
        payload = (res.data as Record<string, unknown>) ?? {};
        kpis = this.objectToKpis(payload, 'sales');
        break;
      }
      case 'construction': {
        if (!query.projectId) {
          throw new BadRequestException(
            'projectId is required for construction analytics',
          );
        }
        await this.projectAccess.assertCanAccessProject(
          actorId,
          query.projectId,
          'read',
        );
        const res = await this.siteExecutionDashboard.getDirectorView({
          projectId: query.projectId,
          from: query.from,
          to: query.to,
        });
        payload = (res.data as Record<string, unknown>) ?? {};
        kpis = this.objectToKpis(payload, 'construction');
        break;
      }
      case 'procurement': {
        const res = await this.procurementDashboard.getDashboard(
          query.projectId,
          actorId,
        );
        payload = (res.data as Record<string, unknown>) ?? {};
        kpis = this.objectToKpis(payload, 'procurement');
        break;
      }
      case 'inventory': {
        if (!query.projectId) {
          throw new BadRequestException(
            'projectId is required for inventory analytics',
          );
        }
        await this.projectAccess.assertCanAccessProject(
          actorId,
          query.projectId,
          'read',
        );
        const res = await this.inventoryDashboard.getSummary(query.projectId);
        payload = (res.data as Record<string, unknown>) ?? {};
        kpis = this.objectToKpis(payload, 'inventory');
        break;
      }
      case 'contractor': {
        const res = await this.contractorDashboard.getKpis({
          projectId: query.projectId,
        });
        payload = (res.data as Record<string, unknown>) ?? {};
        kpis = this.objectToKpis(payload, 'contractor');
        break;
      }
      case 'financial': {
        const res = await this.financeDashboard.getSummary(
          {
            projectId: query.projectId,
            date: query.date,
            from: query.from,
            to: query.to,
          },
          actorId,
        );
        payload = (res.data as Record<string, unknown>) ?? {};
        kpis = this.objectToKpis(payload, 'financial');
        break;
      }
      default:
        throw new BadRequestException(`Unknown domain: ${domain}`);
    }

    const view: DomainAnalyticsView = { domain, asOf, kpis, payload };
    return createSuccessResponse(view, `${domain} analytics`);
  }

  async captureSnapshotPayload(
    kind: string,
    query: AnalyticsQueryDto,
    actorId: string,
  ): Promise<Record<string, unknown>> {
    switch (kind) {
      case 'daily_project_kpi':
      case 'project_progress': {
        if (!query.projectId) {
          throw new BadRequestException('projectId required for project snapshot');
        }
        const health = await this.getProjectHealth(query, actorId);
        return { ...(health.data as object) };
      }
      case 'weekly_director_summary': {
        const exec = await this.getExecutiveSummary(query, actorId);
        return { ...(exec.data as object) };
      }
      case 'cash_flow_forecast':
      case 'forecast_version': {
        const cf = await this.forecast.getCashFlowForecast(
          { ...query, horizon: '30' },
          actorId,
        );
        return { ...(cf.data as object) };
      }
      case 'monthly_financial_close':
      case 'budget_version': {
        const fin = await this.getDomainAnalytics('financial', query, actorId);
        return { ...(fin.data as object) };
      }
      default: {
        const exec = await this.getExecutiveSummary(query, actorId);
        return { ...(exec.data as object) };
      }
    }
  }

  private kpi(
    key: string,
    label: string,
    value: number,
    unit: KpiTile['unit'],
    href: string,
  ): KpiTile {
    return {
      key,
      label,
      value,
      unit,
      drillPath: [
        { level: 'kpi', label, href: `${API}/analytics/kpi-drilldown?kpi=${key}` },
        { level: 'source', label: 'Source records', href },
      ],
    };
  }

  private objectToKpis(
    payload: Record<string, unknown>,
    domain: string,
  ): KpiTile[] {
    const kpis: KpiTile[] = [];
    for (const [key, raw] of Object.entries(payload)) {
      if (typeof raw === 'number') {
        kpis.push(
          this.kpi(key, key, raw, 'count', `${API}/analytics/${domain}`),
        );
      } else if (
        raw &&
        typeof raw === 'object' &&
        'amount' in (raw as object) &&
        typeof (raw as { amount: unknown }).amount === 'number'
      ) {
        kpis.push(
          this.kpi(
            key,
            key,
            (raw as { amount: number }).amount,
            'money',
            `${API}/analytics/${domain}`,
          ),
        );
      }
      if (kpis.length >= 12) break;
    }
    return kpis;
  }
}
