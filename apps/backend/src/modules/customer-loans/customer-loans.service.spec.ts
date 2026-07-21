import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CustomerLoansService } from './customer-loans.service';
import {
  CorrespondenceDirection,
  CustomerLoanStatus,
} from './schemas/customer-loan.schema';

describe('CustomerLoansService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const bookingId = new Types.ObjectId().toHexString();
  const customerId = new Types.ObjectId().toHexString();
  const unitId = new Types.ObjectId().toHexString();

  function mockLoan(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      loanNumber: 'LN-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: new Types.ObjectId(projectId),
      bookingId: new Types.ObjectId(bookingId),
      customerId: new Types.ObjectId(customerId),
      unitId: new Types.ObjectId(unitId),
      bankName: 'HDFC Bank',
      bankBranch: null,
      loanAccountNumber: null,
      sanctionAmount: 5_000_000,
      sanctionedAt: null,
      sanctionLetterPath: null,
      interestRate: null,
      tenureMonths: null,
      emiAmount: null,
      emiStartDate: null,
      status: CustomerLoanStatus.Draft,
      pendingDocuments: [],
      disbursements: [],
      correspondence: [],
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('creates a draft loan', async () => {
    const created = mockLoan();
    const model = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = new CustomerLoansService(model as never);

    const res = await service.create(
      {
        companyId,
        projectId,
        bookingId,
        customerId,
        unitId,
        bankName: 'HDFC Bank',
      },
      actorId,
    );

    expect(res.data?.status).toBe(CustomerLoanStatus.Draft);
    expect(res.data?.loanNumber).toMatch(/^LN-/);
    expect(model.create).toHaveBeenCalled();
  });

  it('rejects update on non-draft loan', async () => {
    const doc = mockLoan({ status: CustomerLoanStatus.Applied });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerLoansService(model as never);

    await expect(
      service.update(String(doc._id), { bankName: 'ICICI' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes totalDisbursed from disbursements', async () => {
    const doc = mockLoan({
      status: CustomerLoanStatus.Sanctioned,
      disbursements: [],
    });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerLoansService(model as never);

    const res = await service.addDisbursement(
      String(doc._id),
      {
        stage: 'First',
        amount: 2_000_000,
        disbursedAt: new Date().toISOString(),
      },
      actorId,
    );

    expect(res.data?.totalDisbursed).toBe(2_000_000);
    expect(res.data?.status).toBe(CustomerLoanStatus.Disbursing);
    expect(doc.disbursements).toHaveLength(1);
  });

  it('rejects invalid status transition', async () => {
    const doc = mockLoan();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerLoansService(model as never);

    await expect(
      service.transitionStatus(
        String(doc._id),
        { status: CustomerLoanStatus.Closed },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds correspondence to active loan', async () => {
    const doc = mockLoan({ status: CustomerLoanStatus.Applied });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerLoansService(model as never);

    const res = await service.addCorrespondence(
      String(doc._id),
      {
        at: new Date().toISOString(),
        subject: 'Document request',
        body: 'Please submit NOC',
        direction: CorrespondenceDirection.Outbound,
      },
      actorId,
    );

    expect(res.data?.correspondence).toHaveLength(1);
    expect(doc.save).toHaveBeenCalled();
  });

  it('lists loans with pagination', async () => {
    const rows = [mockLoan(), mockLoan({ loanNumber: 'LN-2026-000002' })];
    const model = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(rows),
            }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      }),
    };
    const service = new CustomerLoansService(model as never);

    const res = await service.list({ projectId, page: 1, limit: 10 });
    expect(res.data?.length).toBe(2);
    expect(res.meta?.total).toBe(2);
  });
});
