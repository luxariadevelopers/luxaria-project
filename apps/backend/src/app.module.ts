import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { MongoSanitizeMiddleware } from './common/security/mongo-sanitize.middleware';
import { XssSanitizeMiddleware } from './common/security/xss-sanitize.middleware';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { CashAccountsModule } from './modules/cash-accounts/cash-accounts.module';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { CompanyBankAccountsModule } from './modules/company-bank-accounts/company-bank-accounts.module';
import { CompanyModule } from './modules/company/company.module';
import { ContributionReceiptsModule } from './modules/contribution-receipts/contribution-receipts.module';
import { DirectorsModule } from './modules/directors/directors.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { FinancialYearModule } from './modules/financial-year/financial-year.module';
import { HealthModule } from './modules/health/health.module';
import { InvestorsModule } from './modules/investors/investors.module';
import { SitesModule } from './modules/sites/sites.module';
import { CustomersModule } from './modules/customers/customers.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentSchedulesModule } from './modules/payment-schedules/payment-schedules.module';
import { CustomerReceiptsModule } from './modules/customer-receipts/customer-receipts.module';
import { BookingCancellationsModule } from './modules/booking-cancellations/booking-cancellations.module';
import { LeadsModule } from './modules/leads';
import { UnitQuotationsModule } from './modules/unit-quotations';
import { SaleAgreementsModule } from './modules/sale-agreements';
import { UnitRegistrationsModule } from './modules/unit-registrations';
import { CustomerLoansModule } from './modules/customer-loans';
import { UnitHandoversModule } from './modules/unit-handovers';
import { CustomerWarrantiesModule } from './modules/customer-warranties';
import { DirectorCommandCentreModule } from './modules/director-command-centre/director-command-centre.module';
import { ProjectDashboardModule } from './modules/project-dashboard/project-dashboard.module';
import { FinanceDashboardModule } from './modules/finance-dashboard/finance-dashboard.module';
import { InvestorPortalModule } from './modules/investor-portal/investor-portal.module';
import { SalesDashboardModule } from './modules/sales-dashboard';
import { SalesReportsModule } from './modules/sales-reports';
import { CustomerPortalModule } from './modules/customer-portal';
import { AccountingPeriodClosureModule } from './modules/accounting-period-closure/accounting-period-closure.module';
import { AccountingReportsModule } from './modules/accounting-reports/accounting-reports.module';
import { BankReconciliationModule } from './modules/bank-reconciliation/bank-reconciliation.module';
import { ConstructionReportsModule } from './modules/construction-reports/construction-reports.module';
import { DailyDirectorDigestModule } from './modules/daily-director-digest/daily-director-digest.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ContractorsModule } from './modules/contractors/contractors.module';
import { ContractorAgreementsModule } from './modules/contractor-agreements/contractor-agreements.module';
import { ContractorBillsModule } from './modules/contractor-bills/contractor-bills.module';
import { ContractorPaymentsModule } from './modules/contractor-payments/contractor-payments.module';
import { ContractorTendersModule } from './modules/contractor-tenders';
import { ContractorRecoveriesModule } from './modules/contractor-recoveries';
import { ContractorRetentionModule } from './modules/contractor-retention';
import { ContractorLedgerModule } from './modules/contractor-ledger';
import { MaterialReconciliationModule } from './modules/contractor-material-reconciliation';
import { RateContractsModule } from './modules/rate-contracts';
import { WorkOrdersModule } from './modules/work-orders';
import { ContractorDashboardModule } from './modules/contractor-dashboard';
import { ContractorReportsModule } from './modules/contractor-reports';
import { LabourCategoriesModule } from './modules/labour-categories/labour-categories.module';
import { LabourAttendanceModule } from './modules/labour-attendance/labour-attendance.module';
import { ManpowerPlanningModule } from './modules/manpower-planning/manpower-planning.module';
import { MaterialMasterModule } from './modules/material-master/material-master.module';
import { PurchaseRequestsModule } from './modules/purchase-requests/purchase-requests.module';
import { ProcurementMastersModule } from './modules/procurement-masters/procurement-masters.module';
import { ProcurementDashboardModule } from './modules/procurement-dashboard/procurement-dashboard.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { VendorQuotationsModule } from './modules/vendor-quotations/vendor-quotations.module';
import { QuotationComparisonsModule } from './modules/quotation-comparisons/quotation-comparisons.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { VendorInvoicesModule } from './modules/vendor-invoices/vendor-invoices.module';
import { VendorPaymentsModule } from './modules/vendor-payments/vendor-payments.module';
import { VendorPortalModule } from './modules/vendor-portal/vendor-portal.module';
import { QualityInspectionsModule } from './modules/quality-inspections/quality-inspections.module';
import { StockLedgerModule } from './modules/stock-ledger/stock-ledger.module';
import { StockCountsModule } from './modules/stock-counts/stock-counts.module';
import { MaterialIssuesModule } from './modules/material-issues/material-issues.module';
import { MaterialConsumptionModule } from './modules/material-consumption/material-consumption.module';
import { StockReorderModule } from './modules/stock-reorder/stock-reorder.module';
import { WarehouseLocationsModule } from './modules/warehouse-locations/warehouse-locations.module';
import { InventoryCostingModule } from './modules/inventory-costing/inventory-costing.module';
import { StockTransfersModule } from './modules/stock-transfers/stock-transfers.module';
import { StockReservationsModule } from './modules/stock-reservations/stock-reservations.module';
import { InventoryBarcodeModule } from './modules/inventory-barcode/inventory-barcode.module';
import { InventoryDashboardModule } from './modules/inventory-dashboard/inventory-dashboard.module';
import { InventoryReportsModule } from './modules/inventory-reports/inventory-reports.module';
import { JournalModule } from './modules/journal/journal.module';
import { NumberingModule } from './modules/numbering/numbering.module';
import { PettyCashFundTransfersModule } from './modules/petty-cash-fund-transfers/petty-cash-fund-transfers.module';
import { PettyCashRequirementsModule } from './modules/petty-cash-requirements/petty-cash-requirements.module';
import { SignedPaymentVouchersModule } from './modules/signed-payment-vouchers/signed-payment-vouchers.module';
import { SiteExpenseVouchersModule } from './modules/site-expense-vouchers/site-expense-vouchers.module';
import { ProjectAccessModule } from './modules/project-access/project-access.module';
import { ProjectCommitmentsModule } from './modules/project-commitments/project-commitments.module';
import { ProjectParticipantsModule } from './modules/project-participants/project-participants.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UnitsModule } from './modules/units/units.module';
import { BoqModule } from './modules/boq/boq.module';
import { DailyProgressReportsModule } from './modules/daily-progress-reports/dpr.module';
import { DrawingsModule } from './modules/drawings/drawings.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { SiteDiaryModule } from './modules/site-diary';
import { SiteExecutionDashboardModule } from './modules/site-execution-dashboard';
import { SiteExecutionReportsModule } from './modules/site-execution-reports';
import { SiteIssuesModule } from './modules/site-issues';
import { SitePhotosModule } from './modules/site-photos';
import { SiteQualityModule } from './modules/site-quality';
import { SiteSafetyModule } from './modules/site-safety';
import { MeasurementBookModule } from './modules/measurement-book';
import { WorkMeasurementsModule } from './modules/work-measurements/work-measurement.module';
import { MaterialConsumptionStandardsModule } from './modules/material-consumption-standards/material-consumption-standard.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { UsersModule } from './modules/users/users.module';
import { VersionModule } from './modules/version/version.module';
import { SharedModule } from './shared/shared.module';
import { ObservabilityModule } from './common/observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env.local',
        '.env',
      ],
      load: [configuration],
      validate: validateEnvironment,
    }),
    SharedModule,
    ObservabilityModule,
    DatabaseModule,
    NumberingModule,
    // AuthModule registers APP_GUARDs (JWT → throttle → permissions → project access).
    // Keep it early so those guards bind before feature modules load.
    AuthModule,
    RbacModule,
    AuditLogModule,
    CompanyModule,
    ChartOfAccountsModule,
    ExpenseCategoriesModule,
    JournalModule,
    CompanyBankAccountsModule,
    BankReconciliationModule,
    CashAccountsModule,
    PettyCashRequirementsModule,
    PettyCashFundTransfersModule,
    SiteExpenseVouchersModule,
    SignedPaymentVouchersModule,
    DirectorsModule,
    InvestorsModule,
    CustomersModule,
    BookingsModule,
    PaymentSchedulesModule,
    CustomerReceiptsModule,
    BookingCancellationsModule,
    LeadsModule,
    UnitQuotationsModule,
    SaleAgreementsModule,
    UnitRegistrationsModule,
    CustomerLoansModule,
    UnitHandoversModule,
    CustomerWarrantiesModule,
    DirectorCommandCentreModule,
    ProjectDashboardModule,
    FinanceDashboardModule,
    InvestorPortalModule,
    SalesDashboardModule,
    SalesReportsModule,
    CustomerPortalModule,
    NotificationsModule,
    DailyDirectorDigestModule,
    AccountingReportsModule,
    ConstructionReportsModule,
    VendorsModule,
    ContractorsModule,
    ContractorAgreementsModule,
    ContractorBillsModule,
    ContractorTendersModule,
    ContractorRecoveriesModule,
    ContractorRetentionModule,
    ContractorLedgerModule,
    MaterialReconciliationModule,
    RateContractsModule,
    WorkOrdersModule,
    ContractorDashboardModule,
    ContractorReportsModule,
    ContractorPaymentsModule,
    LabourCategoriesModule,
    LabourAttendanceModule,
    ManpowerPlanningModule,
    MaterialMasterModule,
    InventoryCostingModule,
    StockLedgerModule,
    StockCountsModule,
    MaterialIssuesModule,
    MaterialConsumptionModule,
    StockReorderModule,
    WarehouseLocationsModule,
    StockTransfersModule,
    StockReservationsModule,
    InventoryBarcodeModule,
    InventoryDashboardModule,
    InventoryReportsModule,
    ProcurementMastersModule,
    PurchaseRequestsModule,
    RfqModule,
    VendorQuotationsModule,
    QuotationComparisonsModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    VendorInvoicesModule,
    VendorPaymentsModule,
    VendorPortalModule,
    ProcurementDashboardModule,
    QualityInspectionsModule,
    DocumentsModule,
    FinancialYearModule,
    AccountingPeriodClosureModule,
    ProjectAccessModule,
    SitesModule,
    EmployeesModule,
    ApprovalsModule,
    ProjectsModule,
    UnitsModule,
    BoqModule,
    DailyProgressReportsModule,
    DrawingsModule,
    EquipmentModule,
    SiteIssuesModule,
    SiteDiaryModule,
    SitePhotosModule,
    SiteQualityModule,
    SiteSafetyModule,
    SiteExecutionDashboardModule,
    SiteExecutionReportsModule,
    MeasurementBookModule,
    WorkMeasurementsModule,
    MaterialConsumptionStandardsModule,
    ProjectParticipantsModule,
    ProjectCommitmentsModule,
    ContributionReceiptsModule,
    UsersModule,
    HealthModule,
    VersionModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Nest 11 / path-to-regexp v8 requires a named wildcard (not bare "*").
    consumer
      .apply(
        RequestIdMiddleware,
        MongoSanitizeMiddleware,
        XssSanitizeMiddleware,
      )
      .forRoutes('{*path}');
  }
}
