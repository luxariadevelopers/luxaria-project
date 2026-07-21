import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CostCentresService } from './cost-centres.service';
import {
  CostCentreKind,
  CostCentreStatus,
} from './schemas/cost-centre.schema';

describe('CostCentresService', () => {
  const actorId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      code: 'CC-TOWER-A',
      name: 'Tower A',
      kind: CostCentreKind.CostCentre,
      companyId: null,
      projectId: null,
      parentId: null,
      status: CostCentreStatus.Active,
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function buildService(model: Record<string, unknown>) {
    return new CostCentresService(model as never, {} as never, {} as never);
  }

  it('creates an active cost centre with uppercase code', async () => {
    const created = mockDoc();
    const model = {
      create: jest.fn().mockResolvedValue(created),
      findOne: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
      }),
    };
    const service = buildService(model);

    const res = await service.create(
      {
        code: 'cc-tower-a',
        name: 'Tower A',
        kind: CostCentreKind.CostCentre,
      },
      actorId,
    );

    expect(res.data?.code).toBe('CC-TOWER-A');
    expect(res.data?.status).toBe(CostCentreStatus.Active);
    expect(model.create).toHaveBeenCalled();
  });

  it('rejects duplicate codes', async () => {
    const model = {
      findOne: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
          }),
        }),
      }),
    };
    const service = buildService(model);

    await expect(
      service.create(
        {
          code: 'cc-001',
          name: 'Duplicate',
          kind: CostCentreKind.CostCentre,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('assertActive rejects inactive centres', async () => {
    const id = new Types.ObjectId().toHexString();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          mockDoc({
            _id: new Types.ObjectId(id),
            status: CostCentreStatus.Inactive,
          }),
        ),
      }),
    };
    const service = buildService(model);

    await expect(service.assertActive(id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('assertActive returns active centre', async () => {
    const id = new Types.ObjectId().toHexString();
    const row = mockDoc({ _id: new Types.ObjectId(id) });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = buildService(model);

    const result = await service.assertActive(id);
    expect(String(result._id)).toBe(id);
  });
});
