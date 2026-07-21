import { Types } from 'mongoose';
import { AccountCategory } from '../chart-of-accounts/schemas/account.schema';
import { JournalService } from '../journal/journal.service';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { CustomerInvoicesService } from './customer-invoices.service';
import { CustomerInvoiceStatus } from './schemas/customer-invoice.schema';

describe('CustomerInvoicesService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const bookingId = new Types.ObjectId().toHexString();
  const customerId = new Types.ObjectId().toHexString();

  function invoiceDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      invoiceNumber: 'CINV-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: new Types.ObjectId(projectId),
      bookingId: new Types.ObjectId(bookingId),
      customerId: new Types.ObjectId(customerId),
      unitId: null,
      invoiceDate: new Date('2026-07-15'),
      dueDate: null,
      status: CustomerInvoiceStatus.Draft,
      taxableAmount: 1_000_000,
      cgst: 45_000,
      sgst: 45_000,
      igst: 0,
      totalAmount: 1_090_000,
      lines: [
        {
          description: 'Tower A — Stage 2',
          taxableAmount: 1_000_000,
          taxAmount: 90_000,
          totalAmount: 1_090_000,
        },
      ],
      journalEntryId: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('posts revenue journal with customer advance debit and sales/gst credits', async () => {
    const row = invoiceDoc();
    const accounts = {
      [AccountCategory.CustomerAdvance]: {
        _id: new Types.ObjectId(),
        accountCategory: AccountCategory.CustomerAdvance,
      },
      [AccountCategory.Sales]: {
        _id: new Types.ObjectId(),
        accountCategory: AccountCategory.Sales,
      },
      [AccountCategory.OutputGst]: {
        _id: new Types.ObjectId(),
        accountCategory: AccountCategory.OutputGst,
      },
    };

    const accountModel = {
      findOne: jest.fn().mockImplementation(({ accountCategory }) => ({
        exec: jest.fn().mockResolvedValue(accounts[accountCategory as AccountCategory]),
      })),
    };

    let capturedLines: unknown[] = [];
    const journalService = {
      create: jest.fn().mockImplementation(async (dto) => {
        capturedLines = dto.lines;
        return { data: { id: new Types.ObjectId().toHexString() } };
      }),
    } as unknown as JournalService;

    const invoiceModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };

    const service = new CustomerInvoicesService(
      invoiceModel as never,
      accountModel as never,
      journalService,
    );

    const res = await service.post(String(row._id), actorId);
    expect(res.data?.status).toBe(CustomerInvoiceStatus.Posted);
    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'customer_invoice',
        post: true,
      }),
      actorId,
      expect.any(String),
    );

    expect(capturedLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: String(accounts[AccountCategory.CustomerAdvance]._id),
          debit: 1_090_000,
          credit: 0,
          partyType: JournalPartyType.Customer,
          partyId: customerId,
        }),
        expect.objectContaining({
          accountId: String(accounts[AccountCategory.Sales]._id),
          debit: 0,
          credit: 1_000_000,
        }),
        expect.objectContaining({
          accountId: String(accounts[AccountCategory.OutputGst]._id),
          debit: 0,
          credit: 90_000,
        }),
      ]),
    );
  });

  it('creates draft invoice with computed totals', async () => {
    const created = invoiceDoc();
    const invoiceModel = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = new CustomerInvoicesService(
      invoiceModel as never,
      {} as never,
      {} as never,
    );

    const res = await service.create(
      {
        companyId,
        projectId,
        bookingId,
        customerId,
        invoiceDate: '2026-07-15',
        cgst: 45_000,
        sgst: 45_000,
        lines: [
          {
            description: 'Tower A — Stage 2',
            taxableAmount: 1_000_000,
            taxAmount: 90_000,
            totalAmount: 1_090_000,
          },
        ],
      },
      actorId,
    );

    expect(res.data?.totalAmount).toBe(1_090_000);
    expect(res.data?.status).toBe(CustomerInvoiceStatus.Draft);
  });
});
