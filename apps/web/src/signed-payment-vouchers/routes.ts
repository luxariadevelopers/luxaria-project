/**
 * Route path helpers — registry paths live in `navigation/routeRegistry.ts`.
 *
 * Chosen group: **contractors** (`/contractors/signed-vouchers`)
 * Labour signed vouchers sit with attendance and contractor payments;
 * there is no payroll nav group and project-control is BOQ/DPR focused.
 */
export const SIGNED_PAYMENT_VOUCHER_ROUTES = {
  list: '/contractors/signed-vouchers',
  detail: (voucherId: string) =>
    `/contractors/signed-vouchers/${voucherId}`,
} as const;
