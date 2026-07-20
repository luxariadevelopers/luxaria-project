/**
 * Portal paths for purchase orders.
 * List = Micro Phase 065. Create = 066. Detail = 067.
 */
export const PURCHASE_ORDER_ROUTES = {
  list: '/procurement/purchase-orders',
  create: '/procurement/purchase-orders/new',
  detail: (id: string) =>
    `/procurement/purchase-orders/${encodeURIComponent(id)}`,
} as const;
