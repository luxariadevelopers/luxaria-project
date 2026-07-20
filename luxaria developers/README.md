# Luxaria Developers — MongoDB Atlas

Atlas database name: **`luxaria-developers`**

This folder mirrors the collections stored in that database.

## Collections (folders)

| Folder / collection | Purpose |
|---------------------|---------|
| `companies` | Company master (Luxaria Developers Pvt Limited) |
| `users` | Directors, finance, purchase, managers, site engineers, investors |
| `projects` | Construction projects / sites |
| `accounts` | Bank, cash, petty cash, GST accounts |
| `ledgerentries` | Double-entry ledger posts |
| `contributions` | Director / investor capital (cash vs bank) |
| `expenses` | Site and project expenses |
| `pettycashfloats` | Petty cash balances per supervisor |
| `pettycashrequests` | Weekly petty cash top-up requests |
| `vouchers` | Signed labour / payment vouchers |
| `auditfiles` | S3/local file metadata (bills, photos) |
| `materials` | Material master |
| `stockmovements` | GRN / stock in-out |
| `vendors` | Vendor master |
| `purchaserequests` | Purchase / reorder requests |
| `vendorbills` | Vendor bills with GST input |
| `payments` | Vendor payments + GST challans |
| `labourcontracts` | Labour contractor agreements |
| `attendances` | Daily mason / labour attendance |
| `boqlines` | Bill of quantities plan vs utilised |
| `saleunits` | Client bookings (block / plot) |
| `saleadvances` | Client advances |
| `clientinvoices` | Client tax invoices (GST output) |
| `notifications` | Alerts to directors / finance / managers |

## Setup

```bash
# From project root — creates DB + collections + seed data on Atlas
npm run seed
```

Connection is configured in `apps/api/.env` as `MONGODB_URI`.
