import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GstService } from './gst.service';
import {
  GstDirection,
  GstDocumentStatus,
} from './schemas/gst-document.schema';
import { GstReturnStatus, GstReturnType } from './schemas/gst-return.schema';

describe('GstService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();

  function mockReturnDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      returnNumber: 'GST-GSTR3B-202604-001',
      companyId: new Types.ObjectId(companyId),
      returnType: GstReturnType.Gstr3b,
      periodMonth: 4,
      periodYear: 2026,
      status: GstReturnStatus.Draft,
      taxableOutward: 0,
      cgstOutward: 0,
      sgstOutward: 0,
      igstOutward: 0,
      taxableInward: 0,
      cgstInward: 0,
      sgstInward: 0,
      igstInward: 0,
      itcAvailable: 0,
      taxPayable: 0,
      filedAt: null,
      acknowledgementNumber: null,
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('computes return totals from posted documents in period', async () => {
    const row = mockReturnDoc();
    const documentModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              direction: GstDirection.Outward,
              taxableValue: 100_000,
              cgst: 9_000,
              sgst: 9_000,
              igst: 0,
            },
            {
              direction: GstDirection.Inward,
              taxableValue: 50_000,
              cgst: 4_500,
              sgst: 4_500,
              igst: 0,
            },
          ]),
        }),
      }),
    };
    const returnModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = new GstService(documentModel as never, returnModel as never);

    const res = await service.computeReturn(String(row._id), actorId);

    expect(res.data?.status).toBe(GstReturnStatus.Computed);
    expect(res.data?.taxableOutward).toBe(100_000);
    expect(res.data?.taxableInward).toBe(50_000);
    expect(res.data?.itcAvailable).toBe(9_000);
    expect(res.data?.taxPayable).toBe(9_000);
    expect(row.save).toHaveBeenCalled();
  });

  it('files a computed return', async () => {
    const row = mockReturnDoc({ status: GstReturnStatus.Computed });
    const returnModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = new GstService({} as never, returnModel as never);

    const res = await service.fileReturn(
      String(row._id),
      { acknowledgementNumber: 'ARN123456' },
      actorId,
    );

    expect(res.data?.status).toBe(GstReturnStatus.Filed);
    expect(res.data?.acknowledgementNumber).toBe('ARN123456');
    expect(row.filedAt).toEqual(expect.any(Date));
  });

  it('rejects filing a draft return', async () => {
    const row = mockReturnDoc({ status: GstReturnStatus.Draft });
    const returnModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = new GstService({} as never, returnModel as never);

    await expect(
      service.fileReturn(String(row._id), {}, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('syncs from source idempotently', async () => {
    const existing = {
      _id: new Types.ObjectId(),
      documentNumber: 'GST-DOC-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: null,
      documentType: 'tax_invoice',
      direction: GstDirection.Outward,
      partyType: 'other',
      partyId: null,
      partyGstin: null,
      partyName: 'Synced vendor_invoice',
      documentDate: new Date(),
      supplyType: 'intra',
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      totalValue: 0,
      hsnSac: null,
      placeOfSupply: null,
      sourceModule: 'vendor_invoice',
      sourceEntityType: null,
      sourceEntityId: 'inv-001',
      status: GstDocumentStatus.Draft,
      journalEntryId: null,
      createdBy: new Types.ObjectId(actorId),
    };
    const documentModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      }),
      create: jest.fn(),
    };
    const service = new GstService(documentModel as never, {} as never);

    const res = await service.syncFromSource(
      {
        companyId,
        sourceModule: 'vendor_invoice',
        sourceEntityId: 'inv-001',
      },
      actorId,
    );

    expect(res.message).toContain('existing');
    expect(documentModel.create).not.toHaveBeenCalled();
  });
});
