import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SiteSafetyService } from './site-safety.service';
import {
  SiteSafetySeverity,
  SiteSafetyStatus,
  SiteSafetyType,
} from './schemas/site-safety.schema';

describe('SiteSafetyService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();

  it('requires ppeChecklist for PPE type', async () => {
    const service = new SiteSafetyService({} as never);

    await expect(
      service.create(
        {
          projectId,
          type: SiteSafetyType.Ppe,
          title: 'Morning PPE check',
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires attendees for toolbox talk', async () => {
    const service = new SiteSafetyService({} as never);

    await expect(
      service.create(
        {
          projectId,
          type: SiteSafetyType.ToolboxTalk,
          title: 'Weekly toolbox',
          attendees: [],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves open → investigating → closed', async () => {
    const doc = {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(projectId),
      siteId: null,
      dprId: null,
      type: SiteSafetyType.NearMiss,
      title: 'Near miss at hoist',
      description: '',
      severity: SiteSafetySeverity.High,
      status: SiteSafetyStatus.Open,
      ppeChecklist: null,
      attendees: [],
      photoDocumentIds: [],
      investigationNotes: null,
      createdBy: new Types.ObjectId(actorId),
      closedBy: null,
      closedAt: null,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new SiteSafetyService(model as never);

    const investigating = await service.investigate(String(doc._id), {
      investigationNotes: 'Reviewing CCTV',
    });
    expect(investigating.data?.status).toBe(SiteSafetyStatus.Investigating);

    const closed = await service.close(String(doc._id), actorId);
    expect(closed.data?.status).toBe(SiteSafetyStatus.Closed);
    expect(closed.data?.closedBy).toBe(actorId);
  });
});
