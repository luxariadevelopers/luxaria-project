import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectScopedDataHelper } from './project-scoped-data.helper';

describe('ProjectScopedDataHelper (service bypass)', () => {
  const projectAccessService = {
    assertCanAccessProject: jest.fn(),
    buildAuthorisedProjectFilter: jest.fn(),
  };

  let helper: ProjectScopedDataHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new ProjectScopedDataHelper(projectAccessService as never);
    projectAccessService.buildAuthorisedProjectFilter.mockResolvedValue({
      projectId: { $in: [new Types.ObjectId()] },
    });
    projectAccessService.assertCanAccessProject.mockResolvedValue(undefined);
  });

  it('fails closed when actorId is missing on findOneForActor', async () => {
    const model = { findOne: jest.fn() };
    await expect(
      helper.findOneForActor(model as never, '', new Types.ObjectId().toHexString()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('never queries project-owned records by _id alone', async () => {
    const resourceId = new Types.ObjectId().toHexString();
    const projectId = new Types.ObjectId();
    projectAccessService.buildAuthorisedProjectFilter.mockResolvedValue({
      projectId: { $in: [projectId] },
    });
    const exec = jest.fn().mockResolvedValue({
      _id: resourceId,
      projectId,
    });
    const model = {
      findOne: jest.fn().mockReturnValue({ exec }),
    };

    await helper.findOneForActor(model as never, 'actor-1', resourceId, {
      resourceType: 'journal',
    });

    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(Types.ObjectId),
        projectId: { $in: [projectId] },
      }),
    );
    expect(projectAccessService.assertCanAccessProject).toHaveBeenCalled();
  });

  it('rejects foreign-project resource when scoped query returns null', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    const model = {
      findOne: jest.fn().mockReturnValue({ exec }),
    };

    await expect(
      helper.findOneForActor(
        model as never,
        'actor-1',
        new Types.ObjectId().toHexString(),
        { notFoundMessage: 'Journal not found' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assertOwnedResource fails closed when projectId is missing', async () => {
    await expect(
      helper.assertOwnedResource('actor-1', { _id: 'x' }, 'read', 'journal'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('buildScopedIdFilter rejects invalid ids', async () => {
    await expect(
      helper.buildScopedIdFilter('actor-1', 'not-an-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
