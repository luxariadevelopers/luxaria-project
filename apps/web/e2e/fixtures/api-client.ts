import type { APIRequestContext, APIResponse } from '@playwright/test';
import { e2eEnv, type E2eActorEnv, type E2eMasterData } from './test-env';

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type LoginData = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    userCode: string;
    fullName: string;
    email: string | null;
    mobile: string | null;
    status: string;
  };
};

export type ProjectSummary = {
  id: string;
  projectCode: string;
  projectName: string;
  status?: string;
};

export type GoldenPathContext = {
  projectId: string;
  customerId: string;
  unitId: string;
  materialId: string;
  vendorId: string;
  companyBankAccountId: string;
  expenseCategoryId: string;
  adminUserId: string;
};

const E2E_ADDRESS = {
  line1: 'E2E Test Site',
  line2: null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  country: 'India',
};

export class E2eApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly accessToken?: string,
  ) {}

  withToken(accessToken: string): E2eApiClient {
    return new E2eApiClient(this.request, accessToken);
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken
        ? { Authorization: `Bearer ${this.accessToken}` }
        : {}),
      ...extra,
    };
  }

  private url(path: string): string {
    const base = e2eEnv.apiBaseUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async get(path: string): Promise<APIResponse> {
    return this.request.get(this.url(path), { headers: this.headers() });
  }

  async post(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(this.url(path), {
      headers: this.headers(),
      data,
    });
  }

  async patch(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.patch(this.url(path), {
      headers: this.headers(),
      data,
    });
  }

  private async parseEnvelope<T>(res: APIResponse, label: string): Promise<T> {
    if (!res.ok()) {
      throw new Error(`${label} failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as ApiEnvelope<T>;
    return body.data;
  }

  async waitForHealth(timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        const res = await this.get('/health');
        if (res.ok()) {
          const body = (await res.json()) as ApiEnvelope<{ status?: string }>;
          if (body.success) {
            return;
          }
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new Error(
      `API health check timed out at ${e2eEnv.apiBaseUrl}/health${
        lastError ? `: ${String(lastError)}` : ''
      }`,
    );
  }

  async bootstrapAdmin(): Promise<string> {
    try {
      const session = await this.login(
        e2eEnv.admin.identifier,
        e2eEnv.admin.password,
      );
      return session.user.id;
    } catch {
      // Admin not present or password differs — attempt one-time bootstrap.
    }

    const res = await this.post('/auth/bootstrap-admin', {
      fullName: e2eEnv.admin.fullName,
      email: e2eEnv.admin.identifier,
      mobile: e2eEnv.admin.mobile,
      password: e2eEnv.admin.password,
    });

    if (res.status() === 409) {
      const session = await this.login(
        e2eEnv.admin.identifier,
        e2eEnv.admin.password,
      );
      return session.user.id;
    }

    if (!res.ok()) {
      throw new Error(
        `bootstrap-admin failed (${res.status()}): ${await res.text()}`,
      );
    }

    const body = (await res.json()) as ApiEnvelope<{ id: string }>;
    if (!body.data?.id) {
      throw new Error('bootstrap-admin response missing id');
    }
    return body.data.id;
  }

  async login(identifier: string, password: string): Promise<LoginData> {
    const res = await this.post('/auth/login', {
      identifier,
      password,
      deviceName: 'playwright-e2e',
    });

    if (!res.ok()) {
      throw new Error(`login failed (${res.status()}): ${await res.text()}`);
    }

    const body = (await res.json()) as ApiEnvelope<LoginData>;
    if (!body.data?.accessToken) {
      throw new Error('login response missing accessToken');
    }
    return body.data;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const res = await this.get('/projects?page=1&limit=100');
    return this.parseEnvelope<ProjectSummary[]>(res, 'list projects');
  }

  async createProject(name: string): Promise<ProjectSummary> {
    const res = await this.post('/projects', {
      projectName: name,
      projectType: 'residential',
      address: E2E_ADDRESS,
      startDate: '2026-01-01',
      expectedCompletionDate: '2027-12-31',
      landArea: 10000,
      numberOfUnits: 10,
    });

    const data = await this.parseEnvelope<ProjectSummary>(res, 'create project');
    if (!data.id) {
      throw new Error('create project response missing id');
    }
    return data;
  }

  async listRoles(search?: string): Promise<Array<{ id: string; code: string }>> {
    const query = search
      ? `?search=${encodeURIComponent(search)}&limit=100`
      : '?limit=200';
    const res = await this.get(`/rbac/roles${query}`);
    return this.parseEnvelope<Array<{ id: string; code: string }>>(
      res,
      'list roles',
    );
  }

  async findRoleByCode(code: string): Promise<{ id: string; code: string } | null> {
    const roles = await this.listRoles(code);
    return roles.find((role) => role.code === code) ?? null;
  }

  async findRoleIdsByCodes(codes: readonly string[]): Promise<string[]> {
    const roles = await this.listRoles();
    const ids: string[] = [];
    for (const code of codes) {
      const role = roles.find((item) => item.code === code);
      if (!role?.id) {
        throw new Error(`Catalog role not found: ${code}`);
      }
      ids.push(role.id);
    }
    return ids;
  }

  async ensureRole(input: {
    code: string;
    name?: string;
    permissions?: string[];
    cloneFromCode?: string;
  }): Promise<string> {
    const existing = await this.findRoleByCode(input.code);
    if (existing?.id) {
      return existing.id;
    }

    if (input.cloneFromCode) {
      const source = await this.findRoleByCode(input.cloneFromCode);
      if (!source?.id) {
        throw new Error(`Clone source role not found: ${input.cloneFromCode}`);
      }
      const res = await this.post(`/rbac/roles/${source.id}/clone`, {
        code: input.code,
        name: input.name ?? input.code,
      });
      const cloned = await this.parseEnvelope<{ id: string }>(res, 'clone role');
      return cloned.id;
    }

    const res = await this.post('/rbac/roles', {
      name: input.name ?? input.code,
      code: input.code,
      description: 'Playwright E2E role',
      permissions: input.permissions ?? [],
      bypassPermissions: false,
    });
    const created = await this.parseEnvelope<{ id: string }>(res, 'create role');
    return created.id;
  }

  async searchUserByEmail(
    email: string,
  ): Promise<{ id: string; email?: string | null } | null> {
    const res = await this.get(
      `/users?search=${encodeURIComponent(email)}&limit=5`,
    );
    const users = await this.parseEnvelope<
      Array<{ id: string; email?: string | null }>
    >(res, 'search users');
    return users.find((user) => user.email === email) ?? null;
  }

  async ensureUser(input: {
    email: string;
    password: string;
    fullName: string;
    mobile: string;
    roleIds: string[];
    assignedProjects?: string[];
  }): Promise<string> {
    const existing = await this.searchUserByEmail(input.email);
    if (existing?.id) {
      if (input.assignedProjects?.length) {
        await this.assignProjectAccess(existing.id, input.assignedProjects);
      }
      return existing.id;
    }

    const res = await this.post('/users', {
      fullName: input.fullName,
      email: input.email,
      mobile: input.mobile,
      password: input.password,
      roleIds: input.roleIds,
      assignedProjects: input.assignedProjects ?? [],
    });
    const created = await this.parseEnvelope<{ id: string }>(res, 'create user');
    return created.id;
  }

  async ensureActorUser(
    actor: E2eActorEnv,
    projectId: string,
  ): Promise<string> {
    const roleIds =
      actor.roleCodes.length > 0
        ? await this.findRoleIdsByCodes(actor.roleCodes)
        : [];
    return this.ensureUser({
      email: actor.identifier,
      password: actor.password,
      fullName: actor.fullName,
      mobile: actor.mobile,
      roleIds,
      assignedProjects: [projectId],
    });
  }

  async assignProjectAccess(
    userId: string,
    projectIds: string[],
  ): Promise<void> {
    const res = await this.post(`/users/${userId}/projects`, {
      projectIds,
    });
    if (!res.ok()) {
      throw new Error(
        `assign project access failed (${res.status()}): ${await res.text()}`,
      );
    }
  }

  async ensureLimitedRole(): Promise<string> {
    return this.ensureRole({
      code: e2eEnv.limitedRoleCode,
      name: 'E2E Dashboard Only',
      permissions: ['dashboard.view'],
    });
  }

  async ensureLimitedUser(roleId: string): Promise<string> {
    return this.ensureUser({
      email: e2eEnv.limited.identifier,
      password: e2eEnv.limited.password,
      fullName: e2eEnv.limited.fullName,
      mobile: e2eEnv.limited.mobile,
      roleIds: [roleId],
      assignedProjects: [],
    });
  }

  async seedStandardCoa(): Promise<void> {
    const res = await this.post('/accounts/seed-standard');
    if (!res.ok() && res.status() !== 409) {
      throw new Error(
        `seed chart of accounts failed (${res.status()}): ${await res.text()}`,
      );
    }
  }

  async seedStandardExpenseCategories(): Promise<void> {
    const res = await this.post('/expense-categories/seed-standard');
    if (!res.ok() && res.status() !== 409) {
      throw new Error(
        `seed expense categories failed (${res.status()}): ${await res.text()}`,
      );
    }
  }

  async getAccountByCode(accountCode: string): Promise<{ id: string }> {
    const res = await this.get(
      `/accounts/by-code/${encodeURIComponent(accountCode)}`,
    );
    return this.parseEnvelope<{ id: string }>(res, `get account ${accountCode}`);
  }

  async getExpenseCategoryByCode(
    categoryCode: string,
  ): Promise<{ id: string; defaultLedgerAccountId?: string | null }> {
    const res = await this.get(
      `/expense-categories/by-code/${encodeURIComponent(categoryCode)}`,
    );
    return this.parseEnvelope(res, `get expense category ${categoryCode}`);
  }

  async ensureExpenseCategoryLedger(
    categoryCode: string,
    ledgerAccountId: string,
  ): Promise<string> {
    const category = await this.getExpenseCategoryByCode(categoryCode);
    if (category.defaultLedgerAccountId !== ledgerAccountId) {
      const res = await this.patch(`/expense-categories/${category.id}`, {
        defaultLedgerAccountId: ledgerAccountId,
      });
      await this.parseEnvelope(res, 'link expense category ledger');
    }
    return category.id;
  }

  async createCustomer(suffix: string): Promise<{ id: string }> {
    const res = await this.post('/customers', {
      fullName: `E2E Buyer ${suffix}`,
      pan: 'ABCDE1234F',
      fundingType: 'own_funds',
      contact: {
        email: `e2e-buyer-${suffix}@luxaria.test`,
        phone: '9000000100',
      },
    });
    return this.parseEnvelope(res, 'create customer');
  }

  async createUnit(
    projectId: string,
    suffix: string,
  ): Promise<{ id: string; unitNumber: string }> {
    const res = await this.post('/units', {
      projectId,
      block: 'A',
      floor: '10',
      unitNumber: `E2E-${suffix}`,
      unitType: '2bhk',
      carpetArea: 980,
      builtUpArea: 1150,
      uds: 350,
      basePrice: 8_000_000,
      additionalCharges: 200_000,
      tax: 400_000,
    });
    return this.parseEnvelope(res, 'create unit');
  }

  async createMaterial(
    suffix: string,
    ledgerAccountId: string,
  ): Promise<{ id: string }> {
    const res = await this.post('/materials', {
      name: `E2E OPC Cement ${suffix}`,
      category: 'cement',
      baseUnit: 'bag',
      standardRate: 380,
      minimumStock: 20,
      reorderLevel: 50,
      maximumStock: 200,
      standardWastagePercentage: 2,
      ledgerAccountId,
    });
    return this.parseEnvelope(res, 'create material');
  }

  async postOpeningStock(
    projectId: string,
    materialId: string,
    quantity: number,
  ): Promise<void> {
    const res = await this.post('/stock-ledger', {
      projectId,
      materialId,
      transactionType: 'opening_stock',
      quantityIn: quantity,
      quantityOut: 0,
      unit: 'bag',
      transactionDate: '2026-07-01',
    });
    await this.parseEnvelope(res, 'post opening stock');
  }

  async createVendor(suffix: string): Promise<{ id: string }> {
    const res = await this.post('/vendors', {
      legalName: `E2E Cement Suppliers ${suffix}`,
      materialCategories: ['cement'],
    });
    const vendor = await this.parseEnvelope<{ id: string }>(res, 'create vendor');
    await this.post(`/vendors/${vendor.id}/verify`, {
      verified: true,
      notes: 'E2E verified vendor',
    });
    return vendor;
  }

  async assignVendorToProject(
    vendorId: string,
    projectId: string,
  ): Promise<void> {
    const res = await this.post(`/vendors/${vendorId}/projects`, {
      projectId,
    });
    if (!res.ok()) {
      throw new Error(
        `assign vendor to project failed (${res.status()}): ${await res.text()}`,
      );
    }
  }

  async createCompanyBankAccount(
    suffix: string,
    ledgerAccountId: string,
  ): Promise<{ id: string }> {
    const res = await this.post('/company-bank-accounts', {
      bankName: 'HDFC Bank',
      branch: 'Chennai',
      accountHolderName: 'Luxaria Developers Pvt Ltd',
      accountNumber: `123456${String(suffix).slice(-6).padStart(6, '0')}`,
      ifsc: 'HDFC0001234',
      accountType: 'current',
      ledgerAccountId,
      openingBalance: 0,
    });
    return this.parseEnvelope(res, 'create company bank account');
  }

  async ensureGoldenPathMasterData(
    projectId: string,
    suffix: string,
  ): Promise<E2eMasterData> {
    await this.seedStandardCoa();
    await this.seedStandardExpenseCategories();

    const bankLedgerAccountId = (await this.getAccountByCode('1110')).id;
    const pettyCashLedgerAccountId = (await this.getAccountByCode('1130')).id;
    const materialLedgerAccountId = (await this.getAccountByCode('5300')).id;
    const directExpenseAccountId = (await this.getAccountByCode('5100')).id;

    const customer = await this.createCustomer(suffix);
    const unit = await this.createUnit(projectId, suffix);
    const material = await this.createMaterial(suffix, materialLedgerAccountId);
    await this.postOpeningStock(projectId, material.id, 40);
    const vendor = await this.createVendor(suffix);
    await this.assignVendorToProject(vendor.id, projectId);
    const companyBankAccount = await this.createCompanyBankAccount(
      suffix,
      bankLedgerAccountId,
    );
    const expenseCategoryId = await this.ensureExpenseCategoryLedger(
      'TRANSPORT',
      directExpenseAccountId,
    );

    return {
      customerId: customer.id,
      unitId: unit.id,
      materialId: material.id,
      vendorId: vendor.id,
      companyBankAccountId: companyBankAccount.id,
      expenseCategoryId,
      bankLedgerAccountId,
      pettyCashLedgerAccountId,
      materialLedgerAccountId,
      directExpenseAccountId,
    };
  }

  async createBooking(input: {
    customerId: string;
    projectId: string;
    unitId: string;
    bookingDate?: string;
    demandDue?: string;
  }): Promise<{ id: string; status: string }> {
    const res = await this.post('/bookings', {
      customerId: input.customerId,
      projectId: input.projectId,
      unitId: input.unitId,
      bookingDate: input.bookingDate ?? '2026-07-10',
      bookingAmount: 200_000,
      agreedPrice: 8_000_000,
      discount: 0,
      fundingType: 'own_funds',
      paymentPlan: {
        name: 'E2E CLP',
        installments: [
          {
            sequence: 1,
            label: 'On booking',
            amount: 1_600_000,
            percent: 20,
            dueDate: input.demandDue ?? '2026-08-01',
          },
        ],
      },
    });
    return this.parseEnvelope(res, 'create booking');
  }

  async transitionBooking(
    bookingId: string,
    status: 'reserved' | 'booked' | 'agreement' | 'registered',
  ): Promise<{ status: string }> {
    const res = await this.post(`/bookings/${bookingId}/transition`, { status });
    return this.parseEnvelope(res, `transition booking to ${status}`);
  }

  async generatePaymentSchedule(input: {
    bookingId: string;
    demandDue?: string;
  }): Promise<{ id: string; lines: Array<{ id: string }> }> {
    const res = await this.post('/payment-schedules/generate', {
      bookingId: input.bookingId,
      scheduleType: 'date_based',
      submit: true,
      lines: [
        {
          sequence: 1,
          milestone: 'On booking',
          dueDate: input.demandDue ?? '2026-08-01',
          percentage: 100,
          amount: 8_000_000,
          tax: 0,
        },
      ],
    });
    return this.parseEnvelope(res, 'generate payment schedule');
  }

  async approvePaymentSchedule(
    scheduleId: string,
    comment: string,
  ): Promise<void> {
    const res = await this.post(`/payment-schedules/${scheduleId}/approve`, {
      comment,
    });
    await this.parseEnvelope(res, 'approve payment schedule');
  }

  async markScheduleDue(
    scheduleId: string,
    lineId: string,
    dueDate: string,
  ): Promise<void> {
    const res = await this.post(`/payment-schedules/${scheduleId}/mark-due`, {
      lineId,
      dueDate,
    });
    await this.parseEnvelope(res, 'mark schedule due');
  }

  async createDemand(
    scheduleId: string,
    lineId: string,
  ): Promise<{ demand: { id: string } }> {
    const res = await this.post(`/payment-schedules/${scheduleId}/demands`, {
      lineId,
    });
    return this.parseEnvelope(res, 'create demand');
  }

  async createCustomerReceipt(input: {
    customerId: string;
    bookingId: string;
    demandId: string;
    amount: number;
    companyBankAccountId: string;
    transactionReference: string;
  }): Promise<{
    status: string;
    journalEntryId?: string | null;
    receiptNumber?: string;
  }> {
    const res = await this.post('/customer-receipts', {
      customerId: input.customerId,
      bookingId: input.bookingId,
      amount: input.amount,
      paymentMode: 'neft',
      companyBankAccountId: input.companyBankAccountId,
      transactionReference: input.transactionReference,
      sourceType: 'own_fund',
      scheduleAllocation: [{ demandId: input.demandId, amount: input.amount }],
      post: true,
    });
    return this.parseEnvelope(res, 'create customer receipt');
  }

  async runBookingCollectionGoldenPath(
    actors: {
      salesApi: E2eApiClient;
      financeApi: E2eApiClient;
    },
    ctx: GoldenPathContext,
    suffix: string,
  ): Promise<void> {
    const demandDue = '2026-08-01';
    const unit = await this.createUnit(ctx.projectId, suffix);

    const booking = await this.createBooking({
      customerId: ctx.customerId,
      projectId: ctx.projectId,
      unitId: unit.id,
      demandDue,
    });
    if (booking.status !== 'hold') {
      throw new Error(`Expected hold booking, got ${booking.status}`);
    }

    await this.transitionBooking(booking.id, 'reserved');
    const booked = await this.transitionBooking(booking.id, 'booked');
    if (booked.status !== 'booked') {
      throw new Error(`Expected booked status, got ${booked.status}`);
    }

    const schedule = await this.generatePaymentSchedule({
      bookingId: booking.id,
      demandDue,
    });
    const lineId = schedule.lines[0]?.id;
    if (!lineId) {
      throw new Error('Payment schedule missing line');
    }

    await actors.salesApi.approvePaymentSchedule(
      schedule.id,
      'E2E sales approved schedule',
    );
    await actors.financeApi.approvePaymentSchedule(
      schedule.id,
      'E2E finance approved schedule',
    );
    await this.markScheduleDue(schedule.id, lineId, demandDue);
    const demand = await this.createDemand(schedule.id, lineId);

    const receipt = await this.createCustomerReceipt({
      customerId: ctx.customerId,
      bookingId: booking.id,
      demandId: demand.demand.id,
      amount: 1_600_000,
      companyBankAccountId: ctx.companyBankAccountId,
      transactionReference: `E2E-UTR-COLLECT-${suffix}`,
    });

    if (receipt.status !== 'posted' || !receipt.journalEntryId) {
      throw new Error(
        `Expected posted receipt with journal, got ${receipt.status}`,
      );
    }
    if (!receipt.receiptNumber?.startsWith('CR-')) {
      throw new Error(`Unexpected receipt number: ${receipt.receiptNumber}`);
    }
  }

  async runProcurementGoldenPath(
    actors: {
      purchaseApi: E2eApiClient;
      financeApi: E2eApiClient;
    },
    ctx: GoldenPathContext,
    suffix: string,
  ): Promise<void> {
    const prRes = await this.post('/purchase-requests', {
      projectId: ctx.projectId,
      requiredByDate: '2026-08-15',
      justification: `E2E procurement ${suffix}`,
      items: [{ materialId: ctx.materialId, requestedQuantity: 40, unit: 'bag' }],
    });
    const pr = await this.parseEnvelope<{
      id: string;
      items: Array<{ id: string }>;
    }>(prRes, 'create purchase request');
    const prLineId = pr.items[0]?.id;
    if (!prLineId) {
      throw new Error('PR missing line');
    }

    await this.parseEnvelope(
      await this.post(`/purchase-requests/${pr.id}/submit`),
      'submit PR',
    );
    await this.parseEnvelope(
      await this.post(`/purchase-requests/${pr.id}/review`, {
        notes: 'E2E reviewed',
      }),
      'review PR',
    );
    await this.parseEnvelope(
      await this.post(`/purchase-requests/${pr.id}/approve`, {
        items: [{ lineId: prLineId, approvedQuantity: 40 }],
      }),
      'approve PR',
    );
    await this.parseEnvelope(
      await this.post(`/purchase-requests/${pr.id}/start-sourcing`),
      'start sourcing',
    );

    const vqRes = await this.post('/vendor-quotations', {
      purchaseRequestId: pr.id,
      vendorId: ctx.vendorId,
      quotationDate: '2026-07-17',
      validityDate: '2026-08-15',
      deliveryDays: 7,
      paymentTerms: 'Net 30',
      freight: 500,
      taxes: 100,
      discount: 0,
      items: [
        {
          materialId: ctx.materialId,
          quantity: 40,
          unit: 'bag',
          rate: 380,
          tax: 684,
          discount: 0,
        },
      ],
    });
    const quotation = await this.parseEnvelope<{ id: string }>(
      vqRes,
      'create vendor quotation',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-quotations/${quotation.id}/submit`),
      'submit quotation',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-quotations/${quotation.id}/mark-final`),
      'mark quotation final',
    );

    const poRes = await this.post('/purchase-orders', {
      projectId: ctx.projectId,
      purchaseRequestId: pr.id,
      selectedQuotationId: quotation.id,
      orderDate: '2026-07-17',
      expectedDeliveryDate: '2026-08-01',
      billingAddress: E2E_ADDRESS,
      deliveryAddress: E2E_ADDRESS,
      terms: 'E2E PO terms',
    });
    const po = await this.parseEnvelope<{
      id: string;
      items: Array<{ id: string }>;
    }>(poRes, 'create purchase order');
    const poLineId = po.items[0]?.id;
    if (!poLineId) {
      throw new Error('PO missing line');
    }

    await this.parseEnvelope(
      await this.post(`/purchase-orders/${po.id}/submit-approval`),
      'submit PO approval',
    );
    await actors.purchaseApi.parseEnvelope(
      await actors.purchaseApi.post(`/purchase-orders/${po.id}/approve`, {
        comment: 'E2E PO approved',
      }),
      'approve PO (purchase)',
    );
    await actors.financeApi.parseEnvelope(
      await actors.financeApi.post(`/purchase-orders/${po.id}/approve`, {
        comment: 'E2E finance approved PO',
      }),
      'approve PO (finance)',
    );

    const grnRes = await this.post('/goods-receipts', {
      projectId: ctx.projectId,
      purchaseOrderId: po.id,
      vendorId: ctx.vendorId,
      receivedDate: '2026-07-18',
      items: [
        {
          materialId: ctx.materialId,
          purchaseOrderLineId: poLineId,
          orderedQuantity: 40,
          receivedQuantity: 40,
          unit: 'bag',
        },
      ],
      photos: ['e2e-grn.jpg'],
      latitude: 13.0827,
      longitude: 80.2707,
      submit: true,
    });
    const grn = await this.parseEnvelope<{
      id: string;
      items: Array<{ id: string }>;
    }>(grnRes, 'create GRN');
    await this.parseEnvelope(
      await this.post(`/goods-receipts/${grn.id}/quality-check`),
      'GRN quality check',
    );
    const grnLineId = grn.items[0]?.id;
    if (!grnLineId) {
      throw new Error('GRN missing line');
    }
    await this.parseEnvelope(
      await this.post(`/goods-receipts/${grn.id}/accept`, {
        items: [{ lineId: grnLineId, acceptedQuantity: 40, rejectedQuantity: 0 }],
      }),
      'accept GRN',
    );
    const grnPosted = await this.parseEnvelope<{ status: string }>(
      await this.post(`/goods-receipts/${grn.id}/post`),
      'post GRN',
    );
    if (grnPosted.status !== 'posted') {
      throw new Error(`Expected posted GRN, got ${grnPosted.status}`);
    }

    const invRes = await this.post('/vendor-invoices', {
      invoiceNumber: `E2E-VINV-${suffix}`,
      vendorId: ctx.vendorId,
      projectId: ctx.projectId,
      purchaseOrderId: po.id,
      grnIds: [grn.id],
      invoiceDate: '2026-07-19',
      dueDate: '2026-08-15',
      taxableValue: 15200,
      gst: 0,
      tds: 0,
      retention: 0,
      freight: 0,
      totalAmount: 15200,
      items: [
        {
          materialId: ctx.materialId,
          purchaseOrderLineId: poLineId,
          quantity: 40,
          unit: 'bag',
          rate: 380,
        },
      ],
    });
    const invoice = await this.parseEnvelope<{ id: string }>(
      invRes,
      'create vendor invoice',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-invoices/${invoice.id}/submit`),
      'submit invoice',
    );
    await actors.purchaseApi.parseEnvelope(
      await actors.purchaseApi.post(`/vendor-invoices/${invoice.id}/verify`),
      'verify invoice',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-invoices/${invoice.id}/match`),
      'match invoice',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-invoices/${invoice.id}/approve`, {
        exceptionApprovalComment: 'E2E tolerance accepted',
      }),
      'approve invoice',
    );
    const invPosted = await this.parseEnvelope<{ status: string }>(
      await this.post(`/vendor-invoices/${invoice.id}/post`),
      'post invoice',
    );
    if (invPosted.status !== 'posted') {
      throw new Error(`Expected posted invoice, got ${invPosted.status}`);
    }

    const payRes = await this.post('/vendor-payments', {
      vendorId: ctx.vendorId,
      projectId: ctx.projectId,
      allocations: [{ invoiceId: invoice.id, amount: 15200 }],
      paymentDate: '2026-07-20',
      amount: 15200,
      paymentMode: 'neft',
      bankAccountId: ctx.companyBankAccountId,
      transactionReference: `E2E-UTR-PROC-${suffix}`,
    });
    const payment = await this.parseEnvelope<{ id: string }>(
      payRes,
      'create vendor payment',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-payments/${payment.id}/submit`),
      'submit vendor payment',
    );
    await actors.financeApi.parseEnvelope(
      await actors.financeApi.post(`/vendor-payments/${payment.id}/approve`),
      'approve vendor payment',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-payments/${payment.id}/release`),
      'release vendor payment',
    );
    await this.parseEnvelope(
      await this.post(`/vendor-payments/${payment.id}/verify`),
      'verify vendor payment',
    );
    const payPosted = await this.parseEnvelope<{
      status: string;
      journalEntryId?: string | null;
    }>(await this.post(`/vendor-payments/${payment.id}/post`), 'post payment');
    if (payPosted.status !== 'posted' || !payPosted.journalEntryId) {
      throw new Error(
        `Expected posted payment with journal, got ${payPosted.status}`,
      );
    }
  }

  async createPettyCashAccount(
    projectId: string,
    custodianUserId: string,
    ledgerAccountId: string,
    suffix: string,
  ): Promise<{ id: string }> {
    const res = await this.post('/cash-accounts', {
      accountName: `E2E Petty Cash ${suffix}`,
      kind: 'petty_cash',
      projectId,
      custodianUserId,
      ledgerAccountId,
      maximumHoldingLimit: 50_000,
      replenishmentLevel: 10_000,
      openingBalance: 5_000,
    });
    return this.parseEnvelope(res, 'create petty cash account');
  }

  async runPettyCashGoldenPath(
    actors: {
      purchaseApi: E2eApiClient;
      financeApi: E2eApiClient;
    },
    ctx: GoldenPathContext & {
      pettyCashLedgerAccountId: string;
      expenseCategoryId: string;
    },
    suffix: string,
  ): Promise<void> {
    const cashAccount = await this.createPettyCashAccount(
      ctx.projectId,
      ctx.adminUserId,
      ctx.pettyCashLedgerAccountId,
      suffix,
    );

    const reqRes = await this.post('/petty-cash-requirements', {
      projectId: ctx.projectId,
      pettyCashAccountId: cashAccount.id,
      weekStartDate: '2026-07-13',
      weekEndDate: '2026-07-19',
      requirementItems: [
        {
          expenseCategory: 'transport',
          description: 'Site jeep hire',
          estimatedAmount: 5_000,
        },
      ],
      justification: `E2E petty cash ${suffix}`,
    });
    const requirement = await this.parseEnvelope<{ id: string }>(
      reqRes,
      'create petty cash requirement',
    );

    await this.parseEnvelope(
      await this.post(`/petty-cash-requirements/${requirement.id}/submit`),
      'submit petty cash requirement',
    );
    await actors.purchaseApi.parseEnvelope(
      await actors.purchaseApi.post(
        `/petty-cash-requirements/${requirement.id}/project-manager-approve`,
        { comment: 'E2E PM OK' },
      ),
      'PM approve petty cash',
    );
    await actors.financeApi.parseEnvelope(
      await actors.financeApi.post(
        `/petty-cash-requirements/${requirement.id}/finance-approve`,
        { approvedAmount: 5_000, comment: 'E2E finance OK' },
      ),
      'finance approve petty cash',
    );
    const funded = await actors.financeApi.parseEnvelope<{ status: string }>(
      await actors.financeApi.post(
        `/petty-cash-requirements/${requirement.id}/fund`,
        { fundedAmount: 5_000 },
      ),
      'fund petty cash',
    );
    if (funded.status !== 'funded') {
      throw new Error(`Expected funded petty cash, got ${funded.status}`);
    }

    const voucherRes = await this.post('/site-expense-vouchers', {
      projectId: ctx.projectId,
      pettyCashAccountId: cashAccount.id,
      expenseDate: '2026-07-21',
      expenseCategoryId: ctx.expenseCategoryId,
      amount: 1_500,
      paidTo: 'E2E Driver',
      purpose: 'E2E transport expense',
      paymentMode: 'cash',
      billNumber: `E2E-BILL-${suffix}`,
      billDate: '2026-07-21',
      latitude: 13.0827,
      longitude: 80.2707,
      attachments: [
        {
          type: 'bill',
          fileName: 'bill.jpg',
          filePath: 'uploads/e2e/bill.jpg',
        },
        {
          type: 'photo',
          fileName: 'photo.jpg',
          filePath: 'uploads/e2e/photo.jpg',
        },
      ],
    });
    const voucher = await this.parseEnvelope<{ id: string }>(
      voucherRes,
      'create expense voucher',
    );
    await this.parseEnvelope(
      await this.post(`/site-expense-vouchers/${voucher.id}/submit`),
      'submit expense voucher',
    );
    await actors.purchaseApi.parseEnvelope(
      await actors.purchaseApi.post(
        `/site-expense-vouchers/${voucher.id}/verify`,
      ),
      'verify expense voucher',
    );
    await actors.financeApi.parseEnvelope(
      await actors.financeApi.post(
        `/site-expense-vouchers/${voucher.id}/approve`,
      ),
      'approve expense voucher',
    );
    const posted = await actors.financeApi.parseEnvelope<{
      status: string;
      journalEntryId?: string | null;
    }>(
      await actors.financeApi.post(
        `/site-expense-vouchers/${voucher.id}/post`,
      ),
      'post expense voucher',
    );
    if (posted.status !== 'posted' || !posted.journalEntryId) {
      throw new Error(
        `Expected posted expense with journal, got ${posted.status}`,
      );
    }
  }
}

export async function createApiClient(
  request: APIRequestContext,
): Promise<E2eApiClient> {
  return new E2eApiClient(request);
}

export async function createAuthenticatedApi(
  request: APIRequestContext,
  identifier: string,
  password: string,
): Promise<E2eApiClient> {
  const api = await createApiClient(request);
  const session = await api.login(identifier, password);
  return api.withToken(session.accessToken);
}

export function uniqueRunSuffix(): string {
  return String(Date.now());
}

export function toGoldenPathContext(
  state: {
    projectId: string;
    adminUserId: string;
    master: E2eMasterData;
  },
): GoldenPathContext & {
  pettyCashLedgerAccountId: string;
  expenseCategoryId: string;
} {
  return {
    projectId: state.projectId,
    adminUserId: state.adminUserId,
    customerId: state.master.customerId,
    unitId: state.master.unitId,
    materialId: state.master.materialId,
    vendorId: state.master.vendorId,
    companyBankAccountId: state.master.companyBankAccountId,
    expenseCategoryId: state.master.expenseCategoryId,
    pettyCashLedgerAccountId: state.master.pettyCashLedgerAccountId,
  };
}
