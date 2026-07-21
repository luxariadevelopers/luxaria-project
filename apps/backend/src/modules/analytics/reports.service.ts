import { BadRequestException, Injectable } from '@nestjs/common';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { AnalyticsService } from './analytics.service';
import { AnalyticsForecastService } from './forecast.service';
import { AnalyticsAlertsService } from './alerts.service';
import type { AnalyticsExportQueryDto } from './dto/analytics-query.dto';
import type { AnalyticsExportJob } from './analytics.types';

const REPORTS = new Set([
  'director_daily_brief',
  'weekly_project_review',
  'monthly_management_accounts',
  'project_profitability',
  'budget_variance',
  'cash_flow_forecast',
  'sales_collection',
  'construction_progress',
  'procurement_exposure',
  'inventory_exposure',
  'contractor_exposure',
  'risk_register',
]);

@Injectable()
export class AnalyticsReportsService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly forecast: AnalyticsForecastService,
    private readonly alerts: AnalyticsAlertsService,
  ) {}

  async export(query: AnalyticsExportQueryDto, actorId: string) {
    if (!REPORTS.has(query.report)) {
      throw new BadRequestException(
        `Unknown report. Allowed: ${[...REPORTS].join(', ')}`,
      );
    }
    const format = query.format ?? 'csv';
    const rows: Array<Record<string, string | number | null>> = [];
    let columns: string[] = ['metric', 'value'];

    switch (query.report) {
      case 'director_daily_brief':
      case 'weekly_project_review': {
        const exec = await this.analytics.getExecutiveSummary(query, actorId);
        const d = exec.data!;
        rows.push(
          { metric: 'cashAndBank', value: d.company.cashAndBank },
          { metric: 'collectionsToday', value: d.company.collectionsToday },
          { metric: 'paymentsDue', value: d.company.paymentsDue },
          { metric: 'receivables', value: d.company.receivables },
          { metric: 'payables', value: d.company.payables },
          {
            metric: 'contractorLiabilities',
            value: d.company.contractorLiabilities,
          },
          {
            metric: 'criticalAlertCount',
            value: d.company.criticalAlertCount,
          },
        );
        for (const p of d.projects) {
          rows.push({
            metric: `project:${p.projectCode ?? p.projectId}`,
            value: p.marginForecast,
          });
        }
        break;
      }
      case 'project_profitability':
      case 'budget_variance': {
        const profit = await this.forecast.getProjectProfitability(
          query,
          actorId,
        );
        const d = profit.data!;
        columns = ['field', 'value'];
        rows.push(
          { field: 'revenue', value: d.revenue },
          { field: 'eac', value: d.estimateAtCompletion },
          { field: 'margin', value: d.margin },
          { field: 'marginPercent', value: d.marginPercent },
          { field: 'actualCost', value: d.cost.actualCost },
          { field: 'committedCost', value: d.cost.committedCost },
          { field: 'etc', value: d.cost.estimateToComplete },
          { field: 'vac', value: d.cost.varianceAtCompletion },
        );
        break;
      }
      case 'cash_flow_forecast': {
        const cf = await this.forecast.getCashFlowForecast(query, actorId);
        const d = cf.data!;
        columns = [
          'label',
          'inflows',
          'outflows',
          'net',
          'fundingGap',
          'closingCash',
        ];
        for (const b of d.buckets) {
          rows.push({
            label: b.label,
            inflows: b.inflows,
            outflows: b.outflows,
            net: b.net,
            fundingGap: b.fundingGap,
            closingCash: b.closingCash,
          });
        }
        break;
      }
      case 'sales_collection': {
        const sales = await this.analytics.getDomainAnalytics(
          'sales',
          query,
          actorId,
        );
        for (const k of sales.data?.kpis ?? []) {
          rows.push({ metric: k.key, value: k.value });
        }
        break;
      }
      case 'construction_progress': {
        const c = await this.analytics.getDomainAnalytics(
          'construction',
          query,
          actorId,
        );
        for (const k of c.data?.kpis ?? []) {
          rows.push({ metric: k.key, value: k.value });
        }
        break;
      }
      case 'procurement_exposure': {
        const p = await this.analytics.getDomainAnalytics(
          'procurement',
          query,
          actorId,
        );
        for (const k of p.data?.kpis ?? []) {
          rows.push({ metric: k.key, value: k.value });
        }
        break;
      }
      case 'inventory_exposure': {
        const inv = await this.analytics.getDomainAnalytics(
          'inventory',
          query,
          actorId,
        );
        for (const k of inv.data?.kpis ?? []) {
          rows.push({ metric: k.key, value: k.value });
        }
        break;
      }
      case 'contractor_exposure': {
        const ctr = await this.analytics.getDomainAnalytics(
          'contractor',
          query,
          actorId,
        );
        for (const k of ctr.data?.kpis ?? []) {
          rows.push({ metric: k.key, value: k.value });
        }
        break;
      }
      case 'monthly_management_accounts': {
        const fin = await this.analytics.getDomainAnalytics(
          'financial',
          query,
          actorId,
        );
        for (const k of fin.data?.kpis ?? []) {
          rows.push({ metric: k.key, value: k.value });
        }
        break;
      }
      case 'risk_register': {
        const alerts = await this.alerts.list(
          { projectId: query.projectId, limit: 200 },
          actorId,
        );
        columns = ['code', 'severity', 'status', 'title', 'message'];
        for (const a of alerts.data ?? []) {
          rows.push({
            code: a.code,
            severity: a.severity,
            status: a.status,
            title: a.title,
            message: a.message,
          });
        }
        break;
      }
      default:
        break;
    }

    const job: AnalyticsExportJob = {
      report: query.report,
      format,
      status: 'ready',
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      columns,
      rows,
      downloadHint:
        format === 'csv'
          ? 'Use rows/columns to render CSV client-side or queue a large export job'
          : `Export package ready as ${format} (structured rows)`,
    };

    return createSuccessResponse(job, `Analytics report: ${query.report}`);
  }
}
