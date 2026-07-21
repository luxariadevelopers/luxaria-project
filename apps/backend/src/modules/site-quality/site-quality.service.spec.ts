import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SiteQualityService } from './site-quality.service';
import { SiteQualityStatus } from './schemas/site-quality.schema';

describe('SiteQualityService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    const doc = {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(projectId),
      siteId: null,
      dprId: null,
      boqItemId: null,
      title: 'Slab finish check',
      description: '',
      status: SiteQualityStatus.Inspection,
      photoDocumentIds: [],
      findings: null,
      ncrNumber: null,
      punchItems: [],
      rectificationNotes: null,
      reinspectedAt: null,
      createdBy: new Types.ObjectId(actorId),
      closedBy: null,
      closedAt: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    return doc;
  }

  it('rejects invalid workflow transition from inspection to punch_list', async () => {
    const doc = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new SiteQualityService(model as never);

    await expect(
      service.setPunchList(String(doc._id), {
        punchItems: [{ description: 'Honeycomb patch' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('raises NCR and assigns ncrNumber', async () => {
    const doc = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = new SiteQualityService(model as never);

    const res = await service.raiseNcr(String(doc._id), {
      findings: 'Surface cracks',
    });

    expect(res.data?.status).toBe(SiteQualityStatus.Ncr);
    expect(res.data?.ncrNumber).toMatch(/^NCR-\d{4}-0001$/);
    expect(res.data?.findings).toBe('Surface cracks');
    expect(doc.save).toHaveBeenCalled();
  });

  it('closes from re_inspection', async () => {
    const doc = mockDoc({ status: SiteQualityStatus.ReInspection });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new SiteQualityService(model as never);

    const res = await service.close(String(doc._id), actorId);
    expect(res.data?.status).toBe(SiteQualityStatus.Closed);
    expect(res.data?.closedBy).toBe(actorId);
  });
});
