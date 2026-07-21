import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ContractorStatus } from '../contractors/schemas/contractor.schema';
import { BoqUnit } from '../boq/schemas/boq.schema';
import { RateContractsService } from './rate-contracts.service';
import {
  RateContractScope,
  RateContractStatus,
} from './schemas/rate-contract.schema';

describe('RateContractsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const contractorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    const doc = {
      _id: new Types.ObjectId(),
      contractNumber: 'RC-2026-000001',
      version: 1,
      supersedesId: null,
      companyId,
      contractorId: new Types.ObjectId(contractorId),
      projectId: null,
      scope: RateContractScope.Company,
      title: 'Company SOR',
      boqItemRates: [
        {
          _id: new Types.ObjectId(),
          boqItemId: null,
          boqCode: 'RCC-001',
          description: 'RCC columns',
          unit: BoqUnit.CubicMetre,
          rate: 450,
          remarks: null,
        },
      ],
      labourRates: [],
      materialInclusiveRates: [],
      equipmentRates: [],
      validityFrom: new Date('2026-08-01'),
      validityTo: new Date('2027-07-31'),
      escalationClauses: [],
      taxConfig: {
        gstPercent: 18,
        gstInclusive: false,
        tdsPercent: 1,
        notes: null,
      },
      retentionPercent: 5,
      securityDeposit: {
        amount: 100000,
        percent: null,
        instrumentType: 'bank_guarantee',
        notes: null,
      },
      advanceRecovery: {
        method: 'percent_per_bill',
        percentPerBill: 20,
        startAfterBillNumber: 1,
        notes: null,
      },
      penaltyRules: {
        ldPercentPerDay: 0.1,
        ldCapPercent: 5,
        description: 'Standard LD',
        notes: null,
      },
      status: RateContractStatus.Draft,
      activatedBy: null,
      activatedAt: null,
      terminatedBy: null,
      terminatedAt: null,
      terminationReason: null,
      notes: null,
      createdBy: new Types.ObjectId(actorId),
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      markModified: jest.fn(),
      ...overrides,
    };
    return doc;
  }

  function buildService(opts?: {
    doc?: Record<string, unknown> | null;
    openDraft?: Record<string, unknown> | null;
    contractorStatus?: ContractorStatus;
  }) {
    const doc =
      opts?.doc === undefined ? mockDoc() : opts.doc === null ? null : opts.doc;

    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(opts?.openDraft ?? null),
      }),
      create: jest.fn().mockImplementation(async (payload) =>
        mockDoc({
          ...payload,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue(undefined),
          set: jest.fn(),
          markModified: jest.fn(),
        }),
      ),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      updateMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
      find: jest.fn(),
    };

    const contractorModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: contractorId,
          companyId,
          status: opts?.contractorStatus ?? ContractorStatus.Active,
        }),
      }),
    };

    const projectModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: projectId }),
      }),
    };

    const service = new RateContractsService(
      model as never,
      contractorModel as never,
      projectModel as never,
    );
    return { service, model, contractorModel, projectModel, doc };
  }

  it('rejects company scope with projectId', async () => {
    const { service } = buildService();

    await expect(
      service.create(
        {
          contractorId,
          scope: RateContractScope.Company,
          projectId,
          validityFrom: '2026-08-01',
          validityTo: '2027-07-31',
          boqItemRates: [
            {
              description: 'RCC',
              unit: BoqUnit.CubicMetre,
              rate: 100,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires projectId for project scope', async () => {
    const { service } = buildService();

    await expect(
      service.create(
        {
          contractorId,
          scope: RateContractScope.Project,
          validityFrom: '2026-08-01',
          validityTo: '2027-07-31',
          labourRates: [
            { skill: 'mason', unit: BoqUnit.Day, rate: 850 },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates company-wide draft with rates', async () => {
    const { service, model } = buildService();

    const res = await service.create(
      {
        contractorId,
        scope: RateContractScope.Company,
        validityFrom: '2026-08-01',
        validityTo: '2027-07-31',
        retentionPercent: 5,
        boqItemRates: [
          {
            description: 'RCC columns',
            unit: BoqUnit.CubicMetre,
            rate: 450,
          },
        ],
      },
      actorId,
    );

    expect(model.create).toHaveBeenCalled();
    expect(res.data?.scope).toBe(RateContractScope.Company);
    expect(res.data?.projectId).toBeNull();
    expect(res.data?.status).toBe(RateContractStatus.Draft);
    expect(res.data?.contractNumber).toMatch(/^RC-\d{4}-\d{6}$/);
  });

  it('activates draft and marks prior active superseded', async () => {
    const doc = mockDoc();
    const { service, model } = buildService({ doc });

    const res = await service.activate(String(doc._id), actorId);

    expect(res.data?.status).toBe(RateContractStatus.Active);
    expect(model.updateMany).toHaveBeenCalled();
    expect(doc.save).toHaveBeenCalled();
  });

  it('rejects activate when already active', async () => {
    const doc = mockDoc({ status: RateContractStatus.Active });
    const { service } = buildService({ doc });

    await expect(
      service.activate(String(doc._id), actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supersede creates next draft version from active', async () => {
    const doc = mockDoc({ status: RateContractStatus.Active });
    const { service, model } = buildService({ doc });

    const res = await service.supersede(
      String(doc._id),
      {
        retentionPercent: 7,
        labourRates: [
          { skill: 'helper', unit: BoqUnit.Day, rate: 500 },
        ],
      },
      actorId,
    );

    expect(model.create).toHaveBeenCalled();
    expect(res.data?.version).toBe(2);
    expect(res.data?.status).toBe(RateContractStatus.Draft);
    expect(res.data?.supersedesId).toBe(String(doc._id));
    expect(res.data?.retentionPercent).toBe(7);
  });

  it('rejects supersede when open draft already exists', async () => {
    const doc = mockDoc({ status: RateContractStatus.Active });
    const { service } = buildService({
      doc,
      openDraft: mockDoc({ version: 2 }),
    });

    await expect(
      service.supersede(String(doc._id), {}, actorId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('terminates active rate contract', async () => {
    const doc = mockDoc({ status: RateContractStatus.Active });
    const { service } = buildService({ doc });

    const res = await service.terminate(
      String(doc._id),
      { reason: 'Contractor blacklisted' },
      actorId,
    );

    expect(res.data?.status).toBe(RateContractStatus.Terminated);
    expect(res.data?.terminationReason).toBe('Contractor blacklisted');
  });
});
