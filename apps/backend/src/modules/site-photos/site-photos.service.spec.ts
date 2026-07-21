import { BadRequestException } from '@nestjs/common';
import { SitePhotosService } from './site-photos.service';
import { SitePhotoLinkType } from './schemas/site-photo.schema';

describe('SitePhotosService', () => {
  const siteAccessService = {
    assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects lat without lng', async () => {
    const photoModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
    };
    const service = new SitePhotosService(
      photoModel as never,
      siteAccessService as never,
    );

    await expect(
      service.attach(
        {
          projectId: '507f1f77bcf86cd799439012',
          documentId: '507f1f77bcf86cd799439015',
          linkType: SitePhotoLinkType.Issue,
          linkId: '507f1f77bcf86cd799439016',
          lat: 13.08,
        },
        '507f1f77bcf86cd799439013',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(photoModel.create).not.toHaveBeenCalled();
  });

  it('attaches geo metadata for a domain link', async () => {
    const created = {
      _id: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439012',
      siteId: null,
      documentId: '507f1f77bcf86cd799439015',
      linkType: SitePhotoLinkType.Diary,
      linkId: '507f1f77bcf86cd799439016',
      lat: 13.08,
      lng: 80.27,
      capturedAt: new Date('2026-07-21T10:00:00.000Z'),
      version: 1,
      caption: null,
    };
    const photoModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockResolvedValue(created),
    };
    const service = new SitePhotosService(
      photoModel as never,
      siteAccessService as never,
    );

    const res = await service.attach(
      {
        projectId: '507f1f77bcf86cd799439012',
        documentId: '507f1f77bcf86cd799439015',
        linkType: SitePhotoLinkType.Diary,
        linkId: '507f1f77bcf86cd799439016',
        lat: 13.08,
        lng: 80.27,
        capturedAt: '2026-07-21T10:00:00.000Z',
      },
      '507f1f77bcf86cd799439013',
    );

    expect(res.data?.linkType).toBe(SitePhotoLinkType.Diary);
    expect(res.data?.lat).toBe(13.08);
    expect(siteAccessService.assertSiteAccessIfScoped).toHaveBeenCalled();
  });
});
