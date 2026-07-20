# Expense Categories API — Luxaria Developers ERP

Base path: `/api/v1/expense-categories`  
Auth: Bearer access token  
Swagger tag: **Expense Categories**

## Overview

Hierarchical expense category master used for site / construction expenses. Supports parent/child trees, default ledger mapping, and evidence rules (bill, signature, photo, approval limit).

## Fields

| Field | Notes |
|-------|--------|
| `categoryCode` | Unique code, e.g. `LABOUR` (immutable after create) |
| `name` | Display name |
| `parentCategoryId` | Null = root |
| `level` | Root = 1 |
| `defaultLedgerAccountId` | Optional COA expense account |
| `requiresBill` | Evidence rule |
| `requiresSignature` | Evidence rule |
| `requiresPhoto` | Evidence rule |
| `approvalLimit` | Amount above which approval is required; null = unset |
| `status` | `active` / `inactive` |

## Standard seed

Idempotent seed includes: Labour, Material, Transport, Food, Site Maintenance, Tools, Electricity, Water, Approval Charges, Professional Charges, Office Expense, Miscellaneous.

## Permissions

| Permission | Use |
|------------|-----|
| `expense_category.view` | List, get, tree |
| `expense_category.manage` | Create, update, evidence rules, parent, activate/deactivate, delete, seed |

## Endpoints

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/expense-categories` | Create |
| `POST` | `/expense-categories/seed-standard` | Seed standard categories |
| `GET` | `/expense-categories/tree` | Hierarchy tree (`?status=`) |
| `GET` | `/expense-categories` | List |
| `GET` | `/expense-categories/by-code/:categoryCode` | Get by code |
| `GET` | `/expense-categories/:id` | Get by id |
| `PATCH` | `/expense-categories/:id` | Update |
| `PATCH` | `/expense-categories/:id/evidence-rules` | Configure evidence rules |
| `POST` | `/expense-categories/:id/parent` | Set parent |
| `POST` | `/expense-categories/:id/activate` | Activate |
| `POST` | `/expense-categories/:id/deactivate` | Deactivate |
| `DELETE` | `/expense-categories/:id` | Soft-delete |

## Rules

1. `defaultLedgerAccountId` must be an **active expense** COA account when set
2. Cannot deactivate a parent while active children exist
3. Cannot activate a child while its parent is inactive
4. Cannot move a category under its own descendant
5. System (seeded) categories cannot be deleted
