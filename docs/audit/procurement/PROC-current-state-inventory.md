# Procurement Current-State Inventory (Phase 3)

**Baseline:** `cfbc943a4630ad542edde57f9832de9af2dbc2af`  
**Principle:** Inventory must originate from approved procurement (GRN), not free manual stock creation as the primary path.

## Existing (extend, do not replace)

| Flow step | Module | Status |
|-----------|--------|--------|
| Purchase Requisition | `purchase-requests` | Production — project-scoped; no siteId |
| MRP / reorder | `stock-reorder` | Forecast + alerts; no PR conversion |
| Vendor quotation | `vendor-quotations` | Multi-vendor, revise, finalize |
| Comparative statement | `quotation-comparisons` | Generate, recommend, Approvals |
| Purchase Order | `purchase-orders` | Full lifecycle + Approvals |
| GRN | `goods-receipts` | Partial/QC/post → stock |
| Vendors / materials | `vendors`, `material-master` | Masters partial (free-text categories/terms) |
| Dashboard | Web compose only | No dedicated API |

## Phase 3 gaps to close

1. Procurement masters: categories, preferred vendors, price lists, tax/payment/delivery terms  
2. Site-scoped PR; Store Keeper + Site Engineer + PM create paths  
3. MRP alert → draft PR  
4. RFQ multi-vendor + closing date (+ email stub / portal response)  
5. Vendor portal (view RFQ, submit quote, accept PO)  
6. Backend procurement dashboard summary  
7. Role seeds: Storekeeper `purchase.request` + `grn.approve` for receive loop  
8. Mobile: track approval + GRN confirmation polish  

## First vertical slice

Site Engineer / Store Keeper creates PR (with site) → approve → RFQ/quotation → CS → PO → GRN post → stock increase.  
Preserve R-003 project isolation + IAM.
