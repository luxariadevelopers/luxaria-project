import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsAlertsService } from './alerts.service';
import { AnalyticsDrilldownService } from './drilldown.service';
import { AnalyticsForecastService } from './forecast.service';
import { AnalyticsReportsService } from './reports.service';
import { AnalyticsSnapshotService } from './snapshot.service';
import {
  AnalyticsExportQueryDto,
  AnalyticsQueryDto,
  CashFlowForecastQueryDto,
  CreateSnapshotDto,
  DrillDownQueryDto,
  ListAlertsQueryDto,
  ListSnapshotsQueryDto,
} from './dto/analytics-query.dto';
@GlobalScope()
@ApiTags('Analytics (Director BI)')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly forecast: AnalyticsForecastService,
    private readonly snapshots: AnalyticsSnapshotService,
    private readonly alerts: AnalyticsAlertsService,
    private readonly drilldown: AnalyticsDrilldownService,
    private readonly reports: AnalyticsReportsService,
  ) {}

  @Get('executive-summary')
  @RequirePermissions('analytics.company.view')
  @ApiOperation({ summary: 'Company executive summary (command centre KPIs)' })
  executiveSummary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getExecutiveSummary(query, actor.id);
  }

  @Get('director-dashboard')
  @RequirePermissions('analytics.dashboard.view')
  @ApiOperation({
    summary:
      'Director dashboard payload (same spine as executive summary; web UI uses command centre)',
  })
  directorDashboard(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getExecutiveSummary(query, actor.id);
  }

  @Get('project-health')
  @RequirePermissions('analytics.project.view')
  @ApiOperation({ summary: 'Per-project health (physical/financial/cost)' })
  projectHealth(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getProjectHealth(query, actor.id);
  }

  @Get('project-profitability')
  @RequirePermissions('analytics.financial.view')
  @ApiOperation({ summary: 'Project profitability and ROC' })
  projectProfitability(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.forecast.getProjectProfitability(query, actor.id);
  }

  @Get('cost-forecast')
  @RequirePermissions('analytics.forecast.view')
  @ApiOperation({
    summary: 'Cost forecast (EAC = Actual + Committed Unbilled + ETC)',
  })
  costForecast(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.forecast.getCostForecast(query, actor.id);
  }

  @Get('cash-flow-forecast')
  @RequirePermissions('analytics.forecast.view')
  @ApiOperation({
    summary: 'Cash-flow forecast (7/30/90/monthly/completion)',
  })
  cashFlowForecast(
    @Query() query: CashFlowForecastQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.forecast.getCashFlowForecast(query, actor.id);
  }

  @Get('sales')
  @RequirePermissions('analytics.sales.view')
  @ApiOperation({ summary: 'Sales intelligence KPIs' })
  sales(@Query() query: AnalyticsQueryDto, @CurrentUser() actor: AuthUser) {
    return this.analytics.getDomainAnalytics('sales', query, actor.id);
  }

  @Get('construction')
  @RequirePermissions('analytics.construction.view')
  @ApiOperation({ summary: 'Construction intelligence KPIs' })
  construction(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getDomainAnalytics('construction', query, actor.id);
  }

  @Get('procurement')
  @RequirePermissions('analytics.procurement.view')
  @ApiOperation({ summary: 'Procurement intelligence KPIs' })
  procurement(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getDomainAnalytics('procurement', query, actor.id);
  }

  @Get('inventory')
  @RequirePermissions('analytics.inventory.view')
  @ApiOperation({ summary: 'Inventory intelligence KPIs' })
  inventory(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getDomainAnalytics('inventory', query, actor.id);
  }

  @Get('contractor')
  @RequirePermissions('analytics.contractor.view')
  @ApiOperation({ summary: 'Contractor intelligence KPIs' })
  contractor(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getDomainAnalytics('contractor', query, actor.id);
  }

  @Get('financial')
  @RequirePermissions('analytics.financial.view')
  @ApiOperation({ summary: 'Financial intelligence KPIs' })
  financial(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.analytics.getDomainAnalytics('financial', query, actor.id);
  }

  @Get('kpi-drilldown')
  @RequirePermissions('analytics.dashboard.view')
  @ApiOperation({ summary: 'Traceable drill-down path for a KPI' })
  kpiDrilldown(@Query() query: DrillDownQueryDto) {
    return this.drilldown.getPath(query);
  }

  @Get('alerts')
  @RequirePermissions('analytics.dashboard.view')
  @ApiOperation({ summary: 'Risk alerts and exceptions' })
  listAlerts(
    @Query() query: ListAlertsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.alerts.list(query, actor.id);
  }

  @Post('alerts/:id/acknowledge')
  @RequirePermissions('analytics.alert.manage')
  @ApiOperation({ summary: 'Acknowledge an open alert' })
  acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.alerts.acknowledge(id, actor.id);
  }

  @Get('snapshots')
  @RequirePermissions('analytics.dashboard.view')
  @ApiOperation({ summary: 'List immutable analytics snapshots' })
  listSnapshots(@Query() query: ListSnapshotsQueryDto) {
    return this.snapshots.list(query);
  }

  @Get('snapshots/:id')
  @RequirePermissions('analytics.dashboard.view')
  @ApiOperation({ summary: 'Get immutable analytics snapshot' })
  getSnapshot(@Param('id') id: string) {
    return this.snapshots.getById(id);
  }

  @Post('snapshots')
  @RequirePermissions('analytics.snapshot.manage')
  @ApiOperation({
    summary: 'Capture immutable KPI/forecast snapshot (read-model freeze)',
  })
  async createSnapshot(
    @Body() dto: CreateSnapshotDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const payload = await this.analytics.captureSnapshotPayload(
      dto.kind,
      {
        projectId: dto.projectId,
        date: dto.asOfDate,
      },
      actor.id,
    );
    return this.snapshots.create(dto, actor.id, payload);
  }

  @Post('snapshots/:id/mutate-blocked')
  @RequirePermissions('analytics.snapshot.manage')
  @ApiOperation({
    summary: 'Immutability guard — always rejects snapshot mutation',
  })
  mutateBlocked(@Param('id') id: string) {
    return this.snapshots.tryUpdateBlocked(id);
  }

  @Get('reports/export')
  @RequirePermissions('analytics.export')
  @ApiOperation({
    summary: 'Export analytics report (PDF/Excel/CSV structured payload)',
  })
  exportReport(
    @Query() query: AnalyticsExportQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.reports.export(query, actor.id);
  }

  @Get('mobile/executive')
  @RequirePermissions('analytics.dashboard.view')
  @ApiOperation({
    summary: 'Mobile executive view — compact today summary',
  })
  async mobileExecutive(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const exec = await this.analytics.getExecutiveSummary(query, actor.id);
    const d = exec.data!;
    return {
      success: true,
      message: 'Mobile executive summary',
      data: {
        asOf: d.asOf,
        today: {
          cashAndBank: d.company.cashAndBank,
          collections: d.company.collectionsToday,
          paymentsDue: d.company.paymentsDue,
          criticalAlerts: d.company.criticalAlertCount,
          pendingApprovals: d.company.pendingApprovals,
        },
        projects: d.projects.slice(0, 8).map((p) => ({
          projectId: p.projectId,
          code: p.projectCode,
          name: p.projectName,
          progress: p.physicalProgressPercent,
          marginForecast: p.marginForecast,
          health: p.health,
        })),
      },
      meta: {},
    };
  }
}
