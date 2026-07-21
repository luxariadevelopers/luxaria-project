import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CashAccount,
  CashAccountSchema,
} from '../cash-accounts/schemas/cash-account.schema';
import { CompanyModule } from '../company/company.module';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import { ContractorDashboardModule } from '../contractor-dashboard/contractor-dashboard.module';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import { DirectorCommandCentreModule } from '../director-command-centre/director-command-centre.module';
import { FinanceDashboardModule } from '../finance-dashboard/finance-dashboard.module';
import { InventoryDashboardModule } from '../inventory-dashboard/inventory-dashboard.module';
import {
  PaymentSchedule,
  PaymentScheduleSchema,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { ProcurementDashboardModule } from '../procurement-dashboard/procurement-dashboard.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import {
  ContributionCommitment,
  ContributionCommitmentSchema,
} from '../project-commitments/schemas/contribution-commitment.schema';
import { ProjectDashboardModule } from '../project-dashboard/project-dashboard.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { SalesDashboardModule } from '../sales-dashboard/sales-dashboard.module';
import { SiteExecutionDashboardModule } from '../site-execution-dashboard/site-execution-dashboard.module';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsAlertsService } from './alerts.service';
import { AnalyticsDrilldownService } from './drilldown.service';
import { AnalyticsForecastService } from './forecast.service';
import { AnalyticsReportsService } from './reports.service';
import { AnalyticsSnapshotService } from './snapshot.service';
import {
  AnalyticsAlert,
  AnalyticsAlertSchema,
} from './schemas/analytics-alert.schema';
import {
  AnalyticsKpiSnapshot,
  AnalyticsKpiSnapshotSchema,
} from './schemas/analytics-kpi-snapshot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsKpiSnapshot.name, schema: AnalyticsKpiSnapshotSchema },
      { name: AnalyticsAlert.name, schema: AnalyticsAlertSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Project.name, schema: ProjectSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: CashAccount.name, schema: CashAccountSchema },
      { name: PaymentSchedule.name, schema: PaymentScheduleSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      {
        name: ContributionCommitment.name,
        schema: ContributionCommitmentSchema,
      },
    ]),
    CompanyModule,
    ProjectAccessModule,
    RbacModule,
    DirectorCommandCentreModule,
    ProjectDashboardModule,
    FinanceDashboardModule,
    SalesDashboardModule,
    ContractorDashboardModule,
    InventoryDashboardModule,
    ProcurementDashboardModule,
    SiteExecutionDashboardModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsForecastService,
    AnalyticsSnapshotService,
    AnalyticsAlertsService,
    AnalyticsDrilldownService,
    AnalyticsReportsService,
  ],
  exports: [
    AnalyticsService,
    AnalyticsForecastService,
    AnalyticsSnapshotService,
  ],
})
export class AnalyticsModule {}
