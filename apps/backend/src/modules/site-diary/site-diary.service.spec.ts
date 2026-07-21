import { BadRequestException } from '@nestjs/common';
import { SiteDiaryService } from './site-diary.service';
import { SiteDiaryEntryType } from './schemas/site-diary-entry.schema';

describe('SiteDiaryService', () => {
  const siteAccessService = {
    assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a diary entry and asserts site access', async () => {
    const created = {
      _id: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439012',
      siteId: '507f1f77bcf86cd799439014',
      dprId: null,
      entryDate: new Date('2026-07-21'),
      entryType: SiteDiaryEntryType.Meeting,
      title: 'Toolbox talk',
      description: null,
      visitors: [],
      photoDocumentIds: [],
    };
    const diaryModel = {
      create: jest.fn().mockResolvedValue(created),
    };
    const service = new SiteDiaryService(
      diaryModel as never,
      siteAccessService as never,
    );

    const res = await service.create(
      {
        projectId: '507f1f77bcf86cd799439012',
        siteId: '507f1f77bcf86cd799439014',
        entryDate: '2026-07-21',
        entryType: SiteDiaryEntryType.Meeting,
        title: 'Toolbox talk',
      },
      '507f1f77bcf86cd799439013',
    );

    expect(res.data?.entryType).toBe(SiteDiaryEntryType.Meeting);
    expect(siteAccessService.assertSiteAccessIfScoped).toHaveBeenCalledWith({
      userId: '507f1f77bcf86cd799439013',
      projectId: '507f1f77bcf86cd799439012',
      siteId: '507f1f77bcf86cd799439014',
    });
  });

  it('rejects invalid entry ids', async () => {
    const service = new SiteDiaryService(
      { findById: jest.fn() } as never,
      siteAccessService as never,
    );

    await expect(service.getById('not-an-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
