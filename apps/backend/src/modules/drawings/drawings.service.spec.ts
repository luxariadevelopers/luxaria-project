import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DrawingsService } from './drawings.service';
import { DrawingStatus } from './schemas/drawing.schema';

describe('DrawingsService', () => {
  const projectId = '507f1f77bcf86cd799439011';
  const actorId = '507f1f77bcf86cd799439012';
  const documentId = '507f1f77bcf86cd799439013';
  const drawingId = '507f1f77bcf86cd799439014';

  function buildService(overrides?: {
    findById?: jest.Mock;
    create?: jest.Mock;
    findOne?: jest.Mock;
    requireActiveDocument?: jest.Mock;
    assertSiteAccessIfScoped?: jest.Mock;
    withTransaction?: jest.Mock;
  }) {
    const findOne = overrides?.findOne ?? jest.fn().mockReturnValue({
      session: () => ({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    const drawingModel = {
      create: overrides?.create ?? jest.fn(),
      findById: overrides?.findById ?? jest.fn(),
      findOne,
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    const documentsService = {
      requireActiveDocument:
        overrides?.requireActiveDocument ??
        jest.fn().mockResolvedValue({
          projectId: new Types.ObjectId(projectId),
        }),
    };
    const siteAccessService = {
      assertSiteAccessIfScoped:
        overrides?.assertSiteAccessIfScoped ??
        jest.fn().mockResolvedValue(undefined),
    };
    const databaseService = {
      withTransaction:
        overrides?.withTransaction ??
        jest.fn(async (fn: (session: unknown) => Promise<void>) =>
          fn({}),
        ),
    };

    return {
      service: new DrawingsService(
        drawingModel as never,
        documentsService as never,
        siteAccessService as never,
        databaseService as never,
      ),
      drawingModel,
      documentsService,
      siteAccessService,
      databaseService,
    };
  }

  it('rejects create when document project does not match', async () => {
    const { service } = buildService({
      requireActiveDocument: jest.fn().mockResolvedValue({
        projectId: new Types.ObjectId('507f1f77bcf86cd799439099'),
      }),
    });

    await expect(
      service.create(
        {
          projectId,
          drawingNumber: 'A-101',
          title: 'Floor plan',
          revision: '0',
          documentId,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supersedes previous revision on createRevision', async () => {
    const previous = {
      _id: new Types.ObjectId(drawingId),
      projectId: new Types.ObjectId(projectId),
      siteId: null,
      drawingNumber: 'A-101',
      title: 'Floor plan',
      discipline: 'architectural',
      revision: '0',
      isLatest: true,
      supersededById: null,
      status: DrawingStatus.Issued,
      documentId: new Types.ObjectId(documentId),
      markupDocumentIds: [],
      issuedAt: new Date('2026-01-01'),
      notes: null,
      createdBy: new Types.ObjectId(actorId),
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const nextId = new Types.ObjectId();
    const createdRow = {
      _id: nextId,
      projectId: previous.projectId,
      siteId: null,
      drawingNumber: 'A-101',
      title: 'Floor plan',
      discipline: 'architectural',
      revision: 'A',
      isLatest: true,
      supersededById: null,
      status: DrawingStatus.Issued,
      documentId: new Types.ObjectId(documentId),
      markupDocumentIds: [],
      issuedAt: new Date(),
      notes: null,
      createdBy: new Types.ObjectId(actorId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const findById = jest
      .fn()
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(previous) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(createdRow) });

    const create = jest.fn().mockResolvedValue([createdRow]);

    const { service, siteAccessService, databaseService } = buildService({
      findById,
      create,
    });

    const result = await service.createRevision(
      drawingId,
      {
        revision: 'A',
        documentId,
        status: DrawingStatus.Issued,
      },
      actorId,
    );

    expect(siteAccessService.assertSiteAccessIfScoped).toHaveBeenCalled();
    expect(databaseService.withTransaction).toHaveBeenCalled();
    expect(previous.isLatest).toBe(false);
    expect(previous.status).toBe(DrawingStatus.Superseded);
    expect(String(previous.supersededById)).toBe(String(nextId));
    expect(result.data?.revision).toBe('A');
    expect(result.data?.isLatest).toBe(true);
  });

  it('rejects revising a superseded drawing', async () => {
    const previous = {
      _id: new Types.ObjectId(drawingId),
      projectId: new Types.ObjectId(projectId),
      siteId: null,
      isLatest: false,
      status: DrawingStatus.Superseded,
    };
    const { service } = buildService({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(previous),
      }),
    });

    await expect(
      service.createRevision(
        drawingId,
        { revision: 'B', documentId },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires projectId when listing by siteId', async () => {
    const { service } = buildService();

    await expect(
      service.list({ siteId: '507f1f77bcf86cd799439015' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
