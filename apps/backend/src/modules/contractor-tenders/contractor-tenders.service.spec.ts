import { BadRequestException } from '@nestjs/common';
import { ContractorTendersService } from './contractor-tenders.service';
import { ContractorTenderStatus } from './schemas/contractor-tender.schema';
import { BoqUnit } from '../boq/schemas/boq.schema';

describe('ContractorTendersService', () => {
  const siteAccessService = {
    assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
  };

  const projectId = '507f1f77bcf86cd799439012';
  const actorId = '507f1f77bcf86cd799439013';
  const contractorId = '507f1f77bcf86cd799439014';
  const tenderId = '507f1f77bcf86cd799439011';

  function buildService(overrides?: {
    create?: jest.Mock;
    findById?: jest.Mock;
    countDocuments?: jest.Mock;
  }) {
    const tenderModel = {
      create: overrides?.create ?? jest.fn(),
      findById: overrides?.findById ?? jest.fn(),
      countDocuments: overrides?.countDocuments
        ? (() => {
            const chain = {
              setOptions: jest.fn().mockReturnThis(),
              exec: overrides.countDocuments,
            };
            return jest.fn().mockReturnValue(chain);
          })()
        : jest.fn().mockReturnValue({
            setOptions: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(0),
          }),
    };
    return new ContractorTendersService(
      tenderModel as never,
      siteAccessService as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a draft tender with generated tenderNumber', async () => {
    const created = {
      _id: tenderId,
      tenderNumber: 'TND-2026-000001',
      projectId,
      siteId: null,
      title: 'Structural package',
      description: null,
      boqPackageIds: [],
      status: ContractorTenderStatus.Draft,
      invitedContractorIds: [],
      technicalBids: [],
      commercialBids: [],
      negotiationNotes: [],
      recommendation: null,
      awardedContractorId: null,
      awardedRateContractId: null,
      awardedAgreementId: null,
      invitationDate: null,
      bidDeadline: null,
      evaluationStartedAt: null,
      awardedAt: null,
      awardedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: actorId,
    };
    const create = jest.fn().mockResolvedValue(created);
    const service = buildService({ create });

    const res = await service.create(
      { projectId, title: 'Structural package' },
      actorId,
    );

    expect(res.data?.status).toBe(ContractorTenderStatus.Draft);
    expect(res.data?.tenderNumber).toBe('TND-2026-000001');
    expect(siteAccessService.assertSiteAccessIfScoped).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('rejects invite without bidDeadline', async () => {
    const row = {
      status: ContractorTenderStatus.Draft,
      projectId,
      siteId: null,
      invitedContractorIds: [],
      invitationDate: null,
      bidDeadline: null,
      save: jest.fn(),
      set: jest.fn(),
    };
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(row),
    });
    const service = buildService({ findById });

    await expect(
      service.invite(tenderId, { contractorIds: [contractorId] }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records a commercial bid and moves to bidding', async () => {
    const row = {
      status: ContractorTenderStatus.Invited,
      projectId,
      siteId: null,
      invitedContractorIds: [contractorId],
      technicalBids: [] as unknown[],
      commercialBids: [] as unknown[],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      _id: tenderId,
      tenderNumber: 'TND-2026-000001',
      title: 'Structural package',
      description: null,
      boqPackageIds: [],
      negotiationNotes: [],
      recommendation: null,
      awardedContractorId: null,
      awardedRateContractId: null,
      awardedAgreementId: null,
      invitationDate: new Date(),
      bidDeadline: new Date(),
      evaluationStartedAt: null,
      awardedAt: null,
      awardedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: actorId,
    };
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(row),
    });
    const service = buildService({ findById });

    const res = await service.recordBid(
      tenderId,
      {
        contractorId,
        commercial: {
          lines: [
            {
              description: 'RCC M25',
              unit: BoqUnit.CubicMetre,
              quantity: 10,
              rate: 8500,
            },
          ],
        },
      },
      actorId,
    );

    expect(res.data?.status).toBe(ContractorTenderStatus.Bidding);
    expect(row.commercialBids).toHaveLength(1);
    expect(row.save).toHaveBeenCalled();
  });

  it('rejects award unless under_evaluation', async () => {
    const row = {
      status: ContractorTenderStatus.Bidding,
      projectId,
      siteId: null,
      invitedContractorIds: [contractorId],
      save: jest.fn(),
      set: jest.fn(),
    };
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(row),
    });
    const service = buildService({ findById });

    await expect(
      service.award(
        tenderId,
        { awardedContractorId: contractorId },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancel when already awarded', async () => {
    const row = {
      status: ContractorTenderStatus.Awarded,
      projectId,
      siteId: null,
      save: jest.fn(),
      set: jest.fn(),
    };
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(row),
    });
    const service = buildService({ findById });

    await expect(
      service.cancel(tenderId, { reason: 'n/a' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
