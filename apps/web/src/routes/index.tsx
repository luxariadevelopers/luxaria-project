import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { RegistryRouteGuard } from '@/auth/RegistryRouteGuard';
import {
  InternalAppGuard,
  InvestorAuthLayout,
  InvestorDashboardPage,
  InvestorDocumentsPage,
  InvestorLayout,
  InvestorLoginPage,
  InvestorPortalForbiddenStandalone,
  InvestorPortalGuard,
  InvestorProjectDetailPage,
  InvestorStatementsPage,
} from '@/investor-portal';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { toRelativeAppPath } from '@/navigation/routeRegistry';
import { LoginPage } from '@/pages/LoginPage';
import { APP_ROUTE_ELEMENTS } from './routeElements';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/investor">
          <Route element={<InvestorPortalGuard />}>
            <Route element={<InvestorAuthLayout />}>
              <Route path="login" element={<InvestorLoginPage />} />
              <Route
                path="forbidden"
                element={<InvestorPortalForbiddenStandalone />}
              />
            </Route>
            <Route element={<InvestorLayout />}>
              <Route
                index
                element={<Navigate to="/investor/dashboard" replace />}
              />
              <Route path="dashboard" element={<InvestorDashboardPage />} />
              <Route
                path="projects/:projectId"
                element={<InvestorProjectDetailPage />}
              />
              <Route path="documents" element={<InvestorDocumentsPage />} />
              <Route path="statements" element={<InvestorStatementsPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<InternalAppGuard />}>
            <Route element={<AppLayout />}>
            <Route element={<RegistryRouteGuard routeId="dashboard" />}>
              <Route index element={APP_ROUTE_ELEMENTS.dashboard} />
            </Route>

            <Route element={<RegistryRouteGuard routeId="director-command-centre" />}>
              <Route
                path={toRelativeAppPath('/dashboard/director')}
                element={APP_ROUTE_ELEMENTS['director-command-centre']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="finance-dashboard" />}>
              <Route
                path={toRelativeAppPath('/dashboard/finance')}
                element={APP_ROUTE_ELEMENTS['finance-dashboard']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="site-operations-dashboard" />}>
              <Route
                path={toRelativeAppPath('/dashboard/site')}
                element={APP_ROUTE_ELEMENTS['site-operations-dashboard']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-dashboard" />}>
              <Route
                path={toRelativeAppPath('/dashboard/purchase')}
                element={APP_ROUTE_ELEMENTS['purchase-dashboard']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="notifications" />}>
              <Route
                path={toRelativeAppPath('/notifications')}
                element={APP_ROUTE_ELEMENTS.notifications}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="approvals" />}>
              <Route
                path={toRelativeAppPath('/approvals')}
                element={APP_ROUTE_ELEMENTS.approvals}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="approval-detail" />}>
              <Route
                path={toRelativeAppPath('/approvals/:approvalId')}
                element={APP_ROUTE_ELEMENTS['approval-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="projects" />}>
              <Route
                path={toRelativeAppPath('/projects')}
                element={APP_ROUTE_ELEMENTS.projects}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-create" />}>
              <Route
                path={toRelativeAppPath('/projects/new')}
                element={APP_ROUTE_ELEMENTS['project-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-detail" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId')}
                element={APP_ROUTE_ELEMENTS['project-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-edit" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/edit')}
                element={APP_ROUTE_ELEMENTS['project-edit']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-access" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/access')}
                element={APP_ROUTE_ELEMENTS['project-access']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-documents" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/documents')}
                element={APP_ROUTE_ELEMENTS['project-documents']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-settings" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/settings')}
                element={APP_ROUTE_ELEMENTS['project-settings']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-structure" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/structure')}
                element={APP_ROUTE_ELEMENTS['project-structure']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-team" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/team')}
                element={APP_ROUTE_ELEMENTS['project-team']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-warehouses" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/warehouses')}
                element={APP_ROUTE_ELEMENTS['project-warehouses']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="project-financial-settings" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/projects/:projectId/financial-settings',
                )}
                element={APP_ROUTE_ELEMENTS['project-financial-settings']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-dashboard" />}>
              <Route
                path={toRelativeAppPath('/projects/dashboard')}
                element={APP_ROUTE_ELEMENTS['project-dashboard']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-dashboard-detail" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/dashboard')}
                element={APP_ROUTE_ELEMENTS['project-dashboard-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-participants" />}>
              <Route
                path={toRelativeAppPath('/projects/participants')}
                element={APP_ROUTE_ELEMENTS['project-participants']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="project-participants-detail" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/participants')}
                element={APP_ROUTE_ELEMENTS['project-participants-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="profit-share" />}>
              <Route
                path={toRelativeAppPath('/projects/profit-share')}
                element={APP_ROUTE_ELEMENTS['profit-share']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="profit-share-detail" />}>
              <Route
                path={toRelativeAppPath('/projects/:projectId/profit-share')}
                element={APP_ROUTE_ELEMENTS['profit-share-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="daily-progress" />}>
              <Route
                path={toRelativeAppPath('/project-control/dpr')}
                element={APP_ROUTE_ELEMENTS['daily-progress']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="dpr-detail" />}>
              <Route
                path={toRelativeAppPath('/project-control/dpr/:id')}
                element={APP_ROUTE_ELEMENTS['dpr-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq')}
                element={APP_ROUTE_ELEMENTS.boq}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq-import" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq/import')}
                element={APP_ROUTE_ELEMENTS['boq-import']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="work-measurements" />}>
              <Route
                path={toRelativeAppPath('/project-control/work-measurements')}
                element={APP_ROUTE_ELEMENTS['work-measurements']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="material-coefficients" />}>
              <Route
                path={toRelativeAppPath('/project-control/material-coefficients')}
                element={APP_ROUTE_ELEMENTS['material-coefficients']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="material-variance" />}>
              <Route
                path={toRelativeAppPath('/project-control/material-variance')}
                element={APP_ROUTE_ELEMENTS['material-variance']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="cost-forecast" />}>
              <Route
                path={toRelativeAppPath('/project-control/cost-forecast')}
                element={APP_ROUTE_ELEMENTS['cost-forecast']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="vendors" />}>
              <Route
                path={toRelativeAppPath('/procurement/vendors')}
                element={APP_ROUTE_ELEMENTS.vendors}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="vendor-detail" />}>
              <Route
                path={toRelativeAppPath('/procurement/vendors/:vendorId')}
                element={APP_ROUTE_ELEMENTS['vendor-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="contractors" />}>
              <Route
                path={toRelativeAppPath('/contractors')}
                element={APP_ROUTE_ELEMENTS.contractors}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="contractor-agreements" />}>
              <Route
                path={toRelativeAppPath('/contractors/agreements')}
                element={APP_ROUTE_ELEMENTS['contractor-agreements']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="contractor-agreement-detail" />}>
              <Route
                path={toRelativeAppPath('/contractors/agreements/:agreementId')}
                element={APP_ROUTE_ELEMENTS['contractor-agreement-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="contractor-payments" />}>
              <Route
                path={toRelativeAppPath('/contractors/payments')}
                element={APP_ROUTE_ELEMENTS['contractor-payments']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="running-bills" />}>
              <Route
                path={toRelativeAppPath('/contractors/running-bills')}
                element={APP_ROUTE_ELEMENTS['running-bills']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="running-bill-create" />}>
              <Route
                path={toRelativeAppPath('/contractors/running-bills/new')}
                element={APP_ROUTE_ELEMENTS['running-bill-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="running-bill-detail" />}>
              <Route
                path={toRelativeAppPath('/contractors/running-bills/:id')}
                element={APP_ROUTE_ELEMENTS['running-bill-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="labour-categories" />}>
              <Route
                path={toRelativeAppPath('/contractors/labour-categories')}
                element={APP_ROUTE_ELEMENTS['labour-categories']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="labour-attendance" />}>
              <Route
                path={toRelativeAppPath('/contractors/attendance')}
                element={APP_ROUTE_ELEMENTS['labour-attendance']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="signed-payment-vouchers" />}>
              <Route
                path={toRelativeAppPath('/contractors/signed-vouchers')}
                element={APP_ROUTE_ELEMENTS['signed-payment-vouchers']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="signed-payment-voucher-detail" />}>
              <Route
                path={toRelativeAppPath('/contractors/signed-vouchers/:voucherId')}
                element={APP_ROUTE_ELEMENTS['signed-payment-voucher-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="manpower-shortfall" />}>
              <Route
                path={toRelativeAppPath('/contractors/manpower-shortfall')}
                element={APP_ROUTE_ELEMENTS['manpower-shortfall']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="manpower-plans" />}>
              <Route
                path={toRelativeAppPath('/contractors/manpower-plans')}
                element={APP_ROUTE_ELEMENTS['manpower-plans']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="manpower-plan-detail" />}>
              <Route
                path={toRelativeAppPath('/contractors/manpower-plans/:planId')}
                element={APP_ROUTE_ELEMENTS['manpower-plan-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="contractor-detail" />}>
              <Route
                path={toRelativeAppPath('/contractors/:contractorId')}
                element={APP_ROUTE_ELEMENTS['contractor-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="customers" />}>
              <Route
                path={toRelativeAppPath('/sales/customers')}
                element={APP_ROUTE_ELEMENTS.customers}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="customer-detail" />}>
              <Route
                path={toRelativeAppPath('/sales/customers/:customerId')}
                element={APP_ROUTE_ELEMENTS['customer-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-orders" />}>
              <Route
                path={toRelativeAppPath('/procurement/purchase-orders')}
                element={APP_ROUTE_ELEMENTS['purchase-orders']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-order-create" />}>
              <Route
                path={toRelativeAppPath('/procurement/purchase-orders/new')}
                element={APP_ROUTE_ELEMENTS['purchase-order-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-order-detail" />}>
              <Route
                path={toRelativeAppPath('/procurement/purchase-orders/:purchaseOrderId')}
                element={APP_ROUTE_ELEMENTS['purchase-order-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-requests" />}>
              <Route
                path={toRelativeAppPath('/procurement/purchase-requests')}
                element={APP_ROUTE_ELEMENTS['purchase-requests']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-request-create" />}>
              <Route
                path={toRelativeAppPath('/procurement/purchase-requests/new')}
                element={APP_ROUTE_ELEMENTS['purchase-request-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="purchase-request-detail" />}>
              <Route
                path={toRelativeAppPath('/procurement/purchase-requests/:requestId')}
                element={APP_ROUTE_ELEMENTS['purchase-request-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="quotations" />}>
              <Route
                path={toRelativeAppPath('/procurement/quotations')}
                element={APP_ROUTE_ELEMENTS.quotations}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="quotation-comparison" />}>
              <Route
                path={toRelativeAppPath('/procurement/quotation-comparisons/:prId')}
                element={APP_ROUTE_ELEMENTS['quotation-comparison']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="vendor-invoices" />}>
              <Route
                path={toRelativeAppPath('/procurement/vendor-invoices')}
                element={APP_ROUTE_ELEMENTS['vendor-invoices']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="vendor-invoice-match" />}>
              <Route
                path={toRelativeAppPath('/procurement/vendor-invoices/:invoiceId/match')}
                element={APP_ROUTE_ELEMENTS['vendor-invoice-match']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="vendor-payments" />}>
              <Route
                path={toRelativeAppPath('/procurement/vendor-payments')}
                element={APP_ROUTE_ELEMENTS['vendor-payments']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="materials" />}>
              <Route
                path={toRelativeAppPath('/inventory/materials')}
                element={APP_ROUTE_ELEMENTS.materials}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="material-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/materials/:materialId')}
                element={APP_ROUTE_ELEMENTS['material-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-balances" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-balances')}
                element={APP_ROUTE_ELEMENTS['stock-balances']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-ledger" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-ledger')}
                element={APP_ROUTE_ELEMENTS['stock-ledger']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-counts" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-counts')}
                element={APP_ROUTE_ELEMENTS['stock-counts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-count-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-counts/:countId')}
                element={APP_ROUTE_ELEMENTS['stock-count-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="units" />}>
              <Route
                path={toRelativeAppPath('/sales/units')}
                element={APP_ROUTE_ELEMENTS.units}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="unit-detail" />}>
              <Route
                path={toRelativeAppPath('/sales/units/:id')}
                element={APP_ROUTE_ELEMENTS['unit-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="collections" />}>
              <Route
                path={toRelativeAppPath('/sales/collections')}
                element={APP_ROUTE_ELEMENTS.collections}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="payment-schedules" />}>
              <Route
                path={toRelativeAppPath('/sales/payment-schedules')}
                element={APP_ROUTE_ELEMENTS['payment-schedules']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="payment-schedule-detail" />}>
              <Route
                path={toRelativeAppPath('/sales/payment-schedules/:id')}
                element={APP_ROUTE_ELEMENTS['payment-schedule-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bookings" />}>
              <Route
                path={toRelativeAppPath('/sales/bookings')}
                element={APP_ROUTE_ELEMENTS.bookings}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="booking-create" />}>
              <Route
                path={toRelativeAppPath('/sales/bookings/new')}
                element={APP_ROUTE_ELEMENTS['booking-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="booking-detail" />}>
              <Route
                path={toRelativeAppPath('/sales/bookings/:bookingId')}
                element={APP_ROUTE_ELEMENTS['booking-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="cancellations" />}>
              <Route
                path={toRelativeAppPath('/sales/cancellations')}
                element={APP_ROUTE_ELEMENTS.cancellations}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="directors" />}>
              <Route
                path={toRelativeAppPath('/capital/directors')}
                element={APP_ROUTE_ELEMENTS.directors}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="director-detail" />}>
              <Route
                path={toRelativeAppPath('/capital/directors/:directorId')}
                element={APP_ROUTE_ELEMENTS['director-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="shareholding" />}>
              <Route
                path={toRelativeAppPath('/capital/shareholding')}
                element={APP_ROUTE_ELEMENTS.shareholding}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="investors" />}>
              <Route
                path={toRelativeAppPath('/capital/investors')}
                element={APP_ROUTE_ELEMENTS.investors}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="funding-dashboard" />}>
              <Route
                path={toRelativeAppPath('/capital/funding-dashboard')}
                element={APP_ROUTE_ELEMENTS['funding-dashboard']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="commitments" />}>
              <Route
                path={toRelativeAppPath('/capital/commitments')}
                element={APP_ROUTE_ELEMENTS.commitments}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="contribution-receipts" />}>
              <Route
                path={toRelativeAppPath('/capital/contribution-receipts')}
                element={APP_ROUTE_ELEMENTS['contribution-receipts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="commitment-detail" />}>
              <Route
                path={toRelativeAppPath('/capital/commitments/:commitmentId')}
                element={APP_ROUTE_ELEMENTS['commitment-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="investor-detail" />}>
              <Route
                path={toRelativeAppPath('/capital/investors/:investorId')}
                element={APP_ROUTE_ELEMENTS['investor-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="chart-of-accounts" />}>
              <Route
                path={toRelativeAppPath('/accounting/chart-of-accounts')}
                element={APP_ROUTE_ELEMENTS['chart-of-accounts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="account-create" />}>
              <Route
                path={toRelativeAppPath('/accounting/chart-of-accounts/new')}
                element={APP_ROUTE_ELEMENTS['account-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="account-edit" />}>
              <Route
                path={toRelativeAppPath('/accounting/chart-of-accounts/:accountId/edit')}
                element={APP_ROUTE_ELEMENTS['account-edit']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="journals" />}>
              <Route
                path={toRelativeAppPath('/accounting/journals')}
                element={APP_ROUTE_ELEMENTS.journals}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="journal-create" />}>
              <Route
                path={toRelativeAppPath('/accounting/journals/new')}
                element={APP_ROUTE_ELEMENTS['journal-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="journal-detail" />}>
              <Route
                path={toRelativeAppPath('/accounting/journals/:journalId')}
                element={APP_ROUTE_ELEMENTS['journal-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="cash-accounts" />}>
              <Route
                path={toRelativeAppPath('/accounting/cash-accounts')}
                element={APP_ROUTE_ELEMENTS['cash-accounts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-accounts" />}>
              <Route
                path={toRelativeAppPath('/accounting/bank-accounts')}
                element={APP_ROUTE_ELEMENTS['bank-accounts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-account-detail" />}>
              <Route
                path={toRelativeAppPath('/accounting/bank-accounts/:bankAccountId')}
                element={APP_ROUTE_ELEMENTS['bank-account-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-reconciliation" />}>
              <Route
                path={toRelativeAppPath('/accounting/bank-reconciliation')}
                element={APP_ROUTE_ELEMENTS['bank-reconciliation']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-reconciliation-detail" />}>
              <Route
                path={toRelativeAppPath('/accounting/bank-reconciliation/:sessionId')}
                element={APP_ROUTE_ELEMENTS['bank-reconciliation-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="financial-years" />}>
              <Route
                path={toRelativeAppPath('/accounting/financial-years')}
                element={APP_ROUTE_ELEMENTS['financial-years']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="financial-year-create" />}>
              <Route
                path={toRelativeAppPath('/accounting/financial-years/new')}
                element={APP_ROUTE_ELEMENTS['financial-year-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="financial-year-detail" />}>
              <Route
                path={toRelativeAppPath('/accounting/financial-years/:financialYearId')}
                element={APP_ROUTE_ELEMENTS['financial-year-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="period-close" />}>
              <Route
                path={toRelativeAppPath('/accounting/period-close')}
                element={APP_ROUTE_ELEMENTS['period-close']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="expense-categories" />}>
              <Route
                path={toRelativeAppPath('/accounting/expense-categories')}
                element={APP_ROUTE_ELEMENTS['expense-categories']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="site-expenses" />}>
              <Route
                path={toRelativeAppPath('/accounting/expenses')}
                element={APP_ROUTE_ELEMENTS['site-expenses']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="site-expense-detail" />}>
              <Route
                path={toRelativeAppPath('/accounting/expenses/:expenseId')}
                element={APP_ROUTE_ELEMENTS['site-expense-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="petty-cash-requests" />}>
              <Route
                path={toRelativeAppPath('/accounting/petty-cash/requests')}
                element={APP_ROUTE_ELEMENTS['petty-cash-requests']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="petty-cash-request-create" />}>
              <Route
                path={toRelativeAppPath('/accounting/petty-cash/requests/new')}
                element={APP_ROUTE_ELEMENTS['petty-cash-request-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="petty-cash-request-detail" />}>
              <Route
                path={toRelativeAppPath('/accounting/petty-cash/requests/:requestId')}
                element={APP_ROUTE_ELEMENTS['petty-cash-request-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="petty-cash-fund-transfers" />}>
              <Route
                path={toRelativeAppPath('/accounting/petty-cash/transfers')}
                element={APP_ROUTE_ELEMENTS['petty-cash-fund-transfers']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="grns" />}>
              <Route
                path={toRelativeAppPath('/inventory/grns')}
                element={APP_ROUTE_ELEMENTS.grns}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="grn-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/grns/:grnId')}
                element={APP_ROUTE_ELEMENTS['grn-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="quality-inspections" />}>
              <Route
                path={toRelativeAppPath('/inventory/quality-inspections')}
                element={APP_ROUTE_ELEMENTS['quality-inspections']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="quality-inspection-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/quality-inspections/:inspectionId')}
                element={APP_ROUTE_ELEMENTS['quality-inspection-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="material-issues" />}>
              <Route
                path={toRelativeAppPath('/inventory/material-issues')}
                element={APP_ROUTE_ELEMENTS['material-issues']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="material-issue-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/material-issues/:issueId')}
                element={APP_ROUTE_ELEMENTS['material-issue-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="reorder-alerts" />}>
              <Route
                path={toRelativeAppPath('/inventory/reorder-alerts')}
                element={APP_ROUTE_ELEMENTS['reorder-alerts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq-versions" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq/versions')}
                element={APP_ROUTE_ELEMENTS['boq-versions']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq-item-editor" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq/items/:id')}
                element={APP_ROUTE_ELEMENTS['boq-item-editor']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="construction-reports" />}>
              <Route
                path={toRelativeAppPath('/reports/construction')}
                element={APP_ROUTE_ELEMENTS['construction-reports']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="accounting-reports" />}>
              <Route
                path={toRelativeAppPath('/reports/accounting')}
                element={APP_ROUTE_ELEMENTS['accounting-reports']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="cash-book" />}>
              <Route
                path={toRelativeAppPath('/reports/accounting/cash-book')}
                element={APP_ROUTE_ELEMENTS['cash-book']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-book" />}>
              <Route
                path={toRelativeAppPath('/reports/accounting/bank-book')}
                element={APP_ROUTE_ELEMENTS['bank-book']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="users" />}>
              <Route
                path={toRelativeAppPath('/users')}
                element={APP_ROUTE_ELEMENTS.users}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="user-create" />}>
              <Route
                path={toRelativeAppPath('/users/new')}
                element={APP_ROUTE_ELEMENTS['user-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="user-detail" />}>
              <Route
                path={toRelativeAppPath('/users/:userId')}
                element={APP_ROUTE_ELEMENTS['user-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="user-edit" />}>
              <Route
                path={toRelativeAppPath('/users/:userId/edit')}
                element={APP_ROUTE_ELEMENTS['user-edit']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="company-overview" />}>
              <Route
                path={toRelativeAppPath('/administration/company')}
                element={APP_ROUTE_ELEMENTS['company-overview']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="company-settings" />}>
              <Route
                path={toRelativeAppPath('/administration/company/settings')}
                element={APP_ROUTE_ELEMENTS['company-settings']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="employees" />}>
              <Route
                path={toRelativeAppPath('/administration/employees')}
                element={APP_ROUTE_ELEMENTS.employees}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="employee-create" />}>
              <Route
                path={toRelativeAppPath('/administration/employees/new')}
                element={APP_ROUTE_ELEMENTS['employee-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="employee-detail" />}>
              <Route
                path={toRelativeAppPath('/administration/employees/:employeeId')}
                element={APP_ROUTE_ELEMENTS['employee-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="employee-access" />}>
              <Route
                path={toRelativeAppPath(
                  '/administration/employees/:employeeId/access',
                )}
                element={APP_ROUTE_ELEMENTS['employee-access']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="departments" />}>
              <Route
                path={toRelativeAppPath('/administration/departments')}
                element={APP_ROUTE_ELEMENTS.departments}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="designations" />}>
              <Route
                path={toRelativeAppPath('/administration/designations')}
                element={APP_ROUTE_ELEMENTS.designations}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="site-access-admin" />}>
              <Route
                path={toRelativeAppPath('/administration/site-access')}
                element={APP_ROUTE_ELEMENTS['site-access-admin']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="roles" />}>
              <Route
                path={toRelativeAppPath('/administration/roles')}
                element={APP_ROUTE_ELEMENTS.roles}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="role-create" />}>
              <Route
                path={toRelativeAppPath('/administration/roles/new')}
                element={APP_ROUTE_ELEMENTS['role-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="role-detail" />}>
              <Route
                path={toRelativeAppPath('/administration/roles/:roleId')}
                element={APP_ROUTE_ELEMENTS['role-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="role-edit" />}>
              <Route
                path={toRelativeAppPath('/administration/roles/:roleId/edit')}
                element={APP_ROUTE_ELEMENTS['role-edit']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="documents" />}>
              <Route
                path={toRelativeAppPath('/documents')}
                element={APP_ROUTE_ELEMENTS.documents}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="audit-logs" />}>
              <Route
                path={toRelativeAppPath('/administration/audit-logs')}
                element={APP_ROUTE_ELEMENTS['audit-logs']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="director-digest" />}>
              <Route
                path={toRelativeAppPath('/administration/director-digest')}
                element={APP_ROUTE_ELEMENTS['director-digest']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="approval-workflows" />}>
              <Route
                path={toRelativeAppPath('/administration/approval-workflows')}
                element={APP_ROUTE_ELEMENTS['approval-workflows']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="system-health" />}>
              <Route
                path={toRelativeAppPath('/administration/system-health')}
                element={APP_ROUTE_ELEMENTS['system-health']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="settings" />}>
              <Route
                path={toRelativeAppPath('/settings')}
                element={APP_ROUTE_ELEMENTS.settings}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="forbidden" />}>
              <Route
                path={toRelativeAppPath('/forbidden')}
                element={APP_ROUTE_ELEMENTS.forbidden}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="no-project-access" />}>
              <Route
                path={toRelativeAppPath('/no-project-access')}
                element={APP_ROUTE_ELEMENTS['no-project-access']}
              />
            </Route>

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-data-table" />}>
              <Route
                path={toRelativeAppPath('/dev/data-table')}
                element={APP_ROUTE_ELEMENTS['dev-data-table']}
              />
            </Route>
            ) : null}

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-forms" />}>
              <Route
                path={toRelativeAppPath('/dev/forms')}
                element={APP_ROUTE_ELEMENTS['dev-forms']}
              />
            </Route>
            ) : null}

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-documents" />}>
              <Route
                path={toRelativeAppPath('/dev/documents')}
                element={APP_ROUTE_ELEMENTS['dev-documents']}
              />
            </Route>
            ) : null}

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-workflow-timeline" />}>
              <Route
                path={toRelativeAppPath('/dev/workflow-timeline')}
                element={APP_ROUTE_ELEMENTS['dev-workflow-timeline']}
              />
            </Route>
            ) : null}

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-entity-detail" />}>
              <Route
                path={toRelativeAppPath('/dev/entity-detail')}
                element={APP_ROUTE_ELEMENTS['dev-entity-detail']}
              />
            </Route>
            ) : null}

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-print-pdf" />}>
              <Route
                path={toRelativeAppPath('/dev/print-pdf')}
                element={APP_ROUTE_ELEMENTS['dev-print-pdf']}
              />
            </Route>
            ) : null}

            {import.meta.env.DEV ? (
            <Route element={<RegistryRouteGuard routeId="dev-export" />}>
              <Route
                path={toRelativeAppPath('/dev/export')}
                element={APP_ROUTE_ELEMENTS['dev-export']}
              />
            </Route>
            ) : null}
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
