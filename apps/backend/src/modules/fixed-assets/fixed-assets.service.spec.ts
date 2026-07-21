import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { JournalService } from '../journal/journal.service';
import { FixedAssetsService } from './fixed-assets.service';
import {
  DepreciationMethod,
  FixedAssetStatus,
} from './schemas/fixed-asset.schema';
import { FixedAssetDepreciationStatus } from './schemas/fixed-asset-depreciation.schema';

describe('FixedAssetsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const depExpenseId = new Types.ObjectId().toHexString();
  const accumDepId = new Types.ObjectId().toHexString();

  function assetDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      assetNumber: 'FA-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: null,
      name: 'Excavator',
      grossBlock: 1_200_000,
      salvageValue: 200_000,
      usefulLifeMonths: 60,
      depreciationMethod: DepreciationMethod.StraightLine,
      depreciationRatePercent: null,
      accumulatedDepreciation: 0,
      glDepExpenseAccountId: new Types.ObjectId(depExpenseId),
      glAccumDepAccountId: new Types.ObjectId(accumDepId),
      glAssetAccountId: null,
      status: FixedAssetStatus.Active,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('computes straight-line monthly depreciation', () => {
    const service = new FixedAssetsService(
      {} as never,
      {} as never,
    );
    const amount = service.computeDepreciationAmount(
      assetDoc() as never,
    );
    expect(amount).toBe(16_666.67);
  });

  it('activates draft asset', async () => {
    const doc = assetDoc({ status: FixedAssetStatus.Draft });
    const assetModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new FixedAssetsService(
      assetModel as never,
      {} as never,
    );

    const res = await service.activate(String(doc._id), actorId);
    expect(res.data?.status).toBe(FixedAssetStatus.Active);
    expect(doc.save).toHaveBeenCalled();
  });

  it('records depreciation and posts journal when configured', async () => {
    const asset = assetDoc();
    const depreciation = {
      _id: new Types.ObjectId(),
      depreciationNumber: 'FAD-2026-000001',
      amount: 16_666.67,
      periodMonth: 4,
      periodYear: 2026,
      status: FixedAssetDepreciationStatus.Draft,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const journalService = {
      create: jest.fn().mockResolvedValue({
        data: { id: new Types.ObjectId().toHexString() },
      }),
    } as unknown as JournalService;

    const assetModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(asset),
      }),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const depreciationModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockResolvedValue(depreciation),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };

    const service = new FixedAssetsService(
      assetModel as never,
      depreciationModel as never,
      journalService,
    );

    await service.depreciate(
      String(asset._id),
      { periodMonth: 4, periodYear: 2026 },
      actorId,
    );

    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'fixed_asset',
        post: true,
        lines: expect.arrayContaining([
          expect.objectContaining({
            accountId: depExpenseId,
            debit: 16_666.67,
            credit: 0,
          }),
          expect.objectContaining({
            accountId: accumDepId,
            debit: 0,
            credit: 16_666.67,
          }),
        ]),
      }),
      actorId,
      expect.any(String),
    );
    expect(depreciation.status).toBe(FixedAssetDepreciationStatus.Posted);
    expect(asset.accumulatedDepreciation).toBe(16_666.67);
  });

  it('rejects depreciation on non-active asset', async () => {
    const asset = assetDoc({ status: FixedAssetStatus.Draft });
    const assetModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(asset),
      }),
    };
    const service = new FixedAssetsService(
      assetModel as never,
      {} as never,
    );

    await expect(
      service.depreciate(
        String(asset._id),
        { periodMonth: 4, periodYear: 2026 },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
