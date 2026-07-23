import { AnalyticsView, type AnalyticsViewConfig } from '@/analytics/AnalyticsView';
import { DirectorCommandCentrePage } from '@/pages/DirectorCommandCentrePage';

function page(config: AnalyticsViewConfig) {
  return function AnalyticsRoutePage() {
    return <AnalyticsView config={config} />;
  };
}

/**
 * Director Dashboard = full operational command centre (balances, payables,
 * progress, exceptions). Distinct from the compact Executive Summary brief.
 */
export function DirectorDashboardAnalyticsPage() {
  return <DirectorCommandCentrePage />;
}

export const ExecutiveSummaryPage = page({
  title: 'Executive Summary',
  description:
    'One-page company brief: cash, collections, payables, alerts and project health scores.',
  endpoint: '/analytics/executive-summary',
  permission: 'analytics.company.view',
  variant: 'executive',
});

export const ProjectHealthPage = page({
  title: 'Project Health',
  description:
    'Physical vs financial progress, budget/committed/incurred, EAC and critical issues.',
  endpoint: '/analytics/project-health',
  permission: 'analytics.project.view',
  requiresProject: true,
});

export const ProjectProfitabilityPage = page({
  title: 'Project Profitability',
  description: 'Margin, collection efficiency, capital deployed and return on capital.',
  endpoint: '/analytics/project-profitability',
  permission: 'analytics.financial.view',
  requiresProject: true,
});

export const CashFlowForecastPage = page({
  title: 'Cash-flow Forecast',
  description:
    'Collections, contractor/vendor payments, contributions and funding gaps by horizon.',
  endpoint: '/analytics/cash-flow-forecast',
  permission: 'analytics.forecast.view',
  showHorizon: true,
});

export const AnalyticsCostForecastPage = page({
  title: 'Cost Forecast',
  description:
    'EAC = Actual Cost + Committed Unbilled Cost + Forecast Remaining Cost.',
  endpoint: '/analytics/cost-forecast',
  permission: 'analytics.forecast.view',
  requiresProject: true,
});

export const SalesAnalyticsPage = page({
  title: 'Sales Analytics',
  description: 'Lead conversion, bookings, demand and collection intelligence.',
  endpoint: '/analytics/sales',
  permission: 'analytics.sales.view',
});

export const ConstructionAnalyticsPage = page({
  title: 'Construction Analytics',
  description: 'DPR, productivity, progress and site-execution director view.',
  endpoint: '/analytics/construction',
  permission: 'analytics.construction.view',
  requiresProject: true,
});

export const ProcurementAnalyticsPage = page({
  title: 'Procurement Analytics',
  description: 'PR/PO cycle, open PO ageing and procurement exposure.',
  endpoint: '/analytics/procurement',
  permission: 'analytics.procurement.view',
});

export const InventoryAnalyticsPage = page({
  title: 'Inventory Analytics',
  description: 'Stock value, reorder exposure and inventory intelligence.',
  endpoint: '/analytics/inventory',
  permission: 'analytics.inventory.view',
  requiresProject: true,
});

export const ContractorAnalyticsPage = page({
  title: 'Contractor Analytics',
  description: 'Work orders, RA bills, retention and contractor exposure.',
  endpoint: '/analytics/contractor',
  permission: 'analytics.contractor.view',
});

export const FinancialAnalyticsPage = page({
  title: 'Financial Analytics',
  description: 'Finance dashboard KPIs — cash, AR/AP, reconciliation and statements.',
  endpoint: '/analytics/financial',
  permission: 'analytics.financial.view',
});

export const RiskAlertsPage = page({
  title: 'Risk Alerts',
  description: 'Material business exceptions with drill-down to source records.',
  endpoint: '/analytics/alerts',
  permission: 'analytics.dashboard.view',
});

export const KpiDrilldownPage = page({
  title: 'KPI Drill-down',
  description:
    'Every KPI traces to source transactions (e.g. receivables → booking → demand → receipt → ledger).',
  endpoint: '/analytics/kpi-drilldown',
  permission: 'analytics.dashboard.view',
  showKpi: true,
});

export const AnalyticsReportsPage = page({
  title: 'Analytics Reports',
  description: 'Director brief, management accounts, exposure packs (CSV/Excel/PDF payload).',
  endpoint: '/analytics/reports/export',
  permission: 'analytics.export',
  showReport: true,
});
