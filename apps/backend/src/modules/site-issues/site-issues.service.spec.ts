import { BadRequestException } from '@nestjs/common';
import { SiteIssuesService } from './site-issues.service';
import {
  SiteIssueSeverity,
  SiteIssueStatus,
  SiteIssueType,
} from './schemas/site-issue.schema';

describe('SiteIssuesService', () => {
  const siteAccessService = {
    assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
  };

  function buildService(overrides?: {
    create?: jest.Mock;
    findById?: jest.Mock;
    countDocuments?: jest.Mock;
  }) {
    const issueModel = {
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
    return new SiteIssuesService(issueModel as never, siteAccessService as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an open issue with generated issueNumber', async () => {
    const created = {
      _id: '507f1f77bcf86cd799439011',
      issueNumber: 'ISS-2026-000001',
      projectId: '507f1f77bcf86cd799439012',
      siteId: null,
      dprId: null,
      type: SiteIssueType.Delay,
      title: 'Concrete pour delayed',
      description: null,
      status: SiteIssueStatus.Open,
      assigneeUserId: null,
      severity: SiteIssueSeverity.Medium,
      resolvedAt: null,
      closedAt: null,
      photoDocumentIds: [],
    };
    const create = jest.fn().mockResolvedValue(created);
    const service = buildService({ create });

    const res = await service.create(
      {
        projectId: '507f1f77bcf86cd799439012',
        type: SiteIssueType.Delay,
        title: 'Concrete pour delayed',
      },
      '507f1f77bcf86cd799439013',
    );

    expect(res.data?.status).toBe(SiteIssueStatus.Open);
    expect(res.data?.issueNumber).toBe('ISS-2026-000001');
    expect(siteAccessService.assertSiteAccessIfScoped).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it('rejects resolve when issue is already closed', async () => {
    const row = {
      status: SiteIssueStatus.Closed,
      projectId: '507f1f77bcf86cd799439012',
      siteId: null,
      save: jest.fn(),
      set: jest.fn(),
    };
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(row),
    });
    const service = buildService({ findById });

    await expect(
      service.resolve('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects close unless status is resolved', async () => {
    const row = {
      status: SiteIssueStatus.Assigned,
      projectId: '507f1f77bcf86cd799439012',
      siteId: null,
      save: jest.fn(),
      set: jest.fn(),
    };
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(row),
    });
    const service = buildService({ findById });

    await expect(
      service.close('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
