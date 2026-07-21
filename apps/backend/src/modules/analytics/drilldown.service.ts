import { BadRequestException, Injectable } from '@nestjs/common';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import type { DrillDownQueryDto } from './dto/analytics-query.dto';
import type { DrillPathStep } from './analytics.types';

const API = '/api/v1';

/**
 * Every KPI must drill into source records.
 * Example: Outstanding Receivables → Project → Customer → Booking → Demand → Receipt → Ledger
 */
@Injectable()
export class AnalyticsDrilldownService {
  getPath(query: DrillDownQueryDto) {
    const kpi = query.kpi.trim().toLowerCase();
    const projectId = query.projectId;
    const customerId = query.customerId;
    const bookingId = query.bookingId;

    const catalog: Record<string, () => DrillPathStep[]> = {
      receivables: () => [
        {
          level: 'kpi',
          label: 'Outstanding Receivables',
          href: `${API}/analytics/financial`,
        },
        {
          level: 'project',
          label: 'Project',
          href: projectId
            ? `${API}/projects/${projectId}`
            : `${API}/projects`,
        },
        {
          level: 'customer',
          label: 'Customer',
          href: customerId
            ? `${API}/customers/${customerId}`
            : `${API}/customers`,
        },
        {
          level: 'booking',
          label: 'Booking',
          href: bookingId
            ? `${API}/bookings/${bookingId}`
            : `${API}/bookings`,
        },
        {
          level: 'demand',
          label: 'Payment Demand',
          href: bookingId
            ? `${API}/payment-schedules?bookingId=${bookingId}`
            : `${API}/payment-schedules`,
        },
        {
          level: 'receipt',
          label: 'Customer Receipt',
          href: bookingId
            ? `${API}/customer-receipts?bookingId=${bookingId}`
            : `${API}/customer-receipts`,
        },
        {
          level: 'ledger',
          label: 'Ledger Entry',
          href: `${API}/accounting-reports/customer-ledger`,
        },
      ],
      payables: () => [
        {
          level: 'kpi',
          label: 'Payables',
          href: `${API}/analytics/financial`,
        },
        {
          level: 'project',
          label: 'Project',
          href: projectId
            ? `${API}/projects/${projectId}`
            : `${API}/projects`,
        },
        {
          level: 'vendor_invoice',
          label: 'Vendor Invoice',
          href: projectId
            ? `${API}/vendor-invoices?projectId=${projectId}`
            : `${API}/vendor-invoices`,
        },
        {
          level: 'ledger',
          label: 'Ledger Entry',
          href: `${API}/accounting-reports/vendor-ledger`,
        },
      ],
      cash: () => [
        {
          level: 'kpi',
          label: 'Cash and Bank',
          href: `${API}/analytics/executive-summary`,
        },
        {
          level: 'bank',
          label: 'Company Bank Accounts',
          href: `${API}/company-bank-accounts`,
        },
        {
          level: 'cash',
          label: 'Cash Accounts',
          href: `${API}/cash-accounts`,
        },
        {
          level: 'ledger',
          label: 'Bank / Cash Book',
          href: `${API}/accounting-reports/cash-flow`,
        },
      ],
      collections: () => [
        {
          level: 'kpi',
          label: 'Collections',
          href: `${API}/analytics/sales`,
        },
        {
          level: 'project',
          label: 'Project',
          href: projectId
            ? `${API}/projects/${projectId}`
            : `${API}/projects`,
        },
        {
          level: 'receipt',
          label: 'Customer Receipts',
          href: projectId
            ? `${API}/customer-receipts?projectId=${projectId}`
            : `${API}/customer-receipts`,
        },
        {
          level: 'ledger',
          label: 'Journal',
          href: `${API}/journals`,
        },
      ],
      contractor_exposure: () => [
        {
          level: 'kpi',
          label: 'Contractor Exposure',
          href: `${API}/analytics/contractor`,
        },
        {
          level: 'project',
          label: 'Project',
          href: projectId
            ? `${API}/projects/${projectId}`
            : `${API}/projects`,
        },
        {
          level: 'work_order',
          label: 'Work Orders',
          href: projectId
            ? `${API}/work-orders?projectId=${projectId}`
            : `${API}/work-orders`,
        },
        {
          level: 'measurement',
          label: 'Measurements',
          href: projectId
            ? `${API}/work-measurements?projectId=${projectId}`
            : `${API}/work-measurements`,
        },
        {
          level: 'ra_bill',
          label: 'RA Bills',
          href: projectId
            ? `${API}/contractor-bills?projectId=${projectId}`
            : `${API}/contractor-bills`,
        },
        {
          level: 'payment',
          label: 'Contractor Payments',
          href: projectId
            ? `${API}/contractor-payments?projectId=${projectId}`
            : `${API}/contractor-payments`,
        },
      ],
      cost_forecast: () => [
        {
          level: 'kpi',
          label: 'Cost Forecast (EAC)',
          href: `${API}/analytics/cost-forecast`,
        },
        {
          level: 'project',
          label: 'Project',
          href: projectId
            ? `${API}/projects/${projectId}`
            : `${API}/projects`,
        },
        {
          level: 'budget',
          label: 'Budgets',
          href: `${API}/budgets`,
        },
        {
          level: 'actual',
          label: 'Vendor / Contractor Costs',
          href: projectId
            ? `${API}/vendor-invoices?projectId=${projectId}`
            : `${API}/vendor-invoices`,
        },
        {
          level: 'committed',
          label: 'Open POs / Unbilled',
          href: projectId
            ? `${API}/purchase-orders?projectId=${projectId}`
            : `${API}/purchase-orders`,
        },
      ],
      inventory_exposure: () => [
        {
          level: 'kpi',
          label: 'Inventory Exposure',
          href: `${API}/analytics/inventory`,
        },
        {
          level: 'stock',
          label: 'Stock Balances',
          href: `${API}/stock-ledger/balances`,
        },
        {
          level: 'reorder',
          label: 'Reorder Alerts',
          href: `${API}/stock-reorder/alerts`,
        },
      ],
      procurement_exposure: () => [
        {
          level: 'kpi',
          label: 'Procurement Exposure',
          href: `${API}/analytics/procurement`,
        },
        {
          level: 'pr',
          label: 'Purchase Requests',
          href: `${API}/purchase-requests`,
        },
        {
          level: 'po',
          label: 'Purchase Orders',
          href: `${API}/purchase-orders`,
        },
        {
          level: 'grn',
          label: 'Goods Receipts',
          href: `${API}/goods-receipts`,
        },
      ],
    };

    const builder = catalog[kpi];
    if (!builder) {
      throw new BadRequestException(
        `Unknown KPI drill-down key: ${query.kpi}. Known: ${Object.keys(catalog).join(', ')}`,
      );
    }

    return createSuccessResponse(
      {
        kpi,
        path: builder(),
        filters: {
          projectId: projectId ?? null,
          customerId: customerId ?? null,
          bookingId: bookingId ?? null,
        },
      },
      'KPI drill-down path',
    );
  }
}
