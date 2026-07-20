import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import type { ProjectAccessOperation } from './schemas/unauthorized-project-access.schema';
import { ProjectAccessService } from './project-access.service';

/**
 * Service-layer helper for project/company-filtered queries and ownership asserts.
 * Prefer this over trusting controller-only guards for high-risk modules.
 */
@Injectable()
export class ProjectScopedDataHelper {
  constructor(private readonly projectAccessService: ProjectAccessService) {}

  async assertProjectAccess(
    actorId: string,
    projectId: string,
    action: ProjectAccessOperation | string = 'read',
    meta?: {
      resourceType?: string;
      resourceId?: string;
      companyId?: string | null;
    },
  ) {
    return this.projectAccessService.assertCanAccessProject({
      actor: actorId,
      projectId,
      action,
      resourceType: meta?.resourceType,
      resourceId: meta?.resourceId,
      companyId: meta?.companyId,
    });
  }

  async assertOptionalProjectAccess(
    actorId: string,
    projectId: string | null | undefined,
    action: ProjectAccessOperation | string = 'read',
    meta?: {
      resourceType?: string;
      resourceId?: string;
      companyId?: string | null;
    },
  ) {
    if (!projectId) {
      return;
    }
    await this.assertProjectAccess(actorId, String(projectId), action, meta);
  }

  /**
   * Assert access from a loaded document's projectId.
   * Fails closed when projectId is missing on a project-owned resource.
   */
  async assertOwnedResource(
    actorId: string,
    resource: { projectId?: Types.ObjectId | string | null; _id?: unknown },
    action: ProjectAccessOperation | string,
    resourceType: string,
  ) {
    if (!resource?.projectId) {
      throw new ForbiddenException('Access denied');
    }
    await this.assertProjectAccess(actorId, String(resource.projectId), action, {
      resourceType,
      resourceId: resource._id ? String(resource._id) : undefined,
    });
  }

  async mergeAuthorisedProjectFilter<T>(
    actorId: string,
    filter: FilterQuery<T>,
    field = 'projectId',
  ): Promise<FilterQuery<T>> {
    const scope = await this.projectAccessService.buildAuthorisedProjectFilter(
      actorId,
      field,
    );
    return { ...filter, ...scope } as FilterQuery<T>;
  }

  /**
   * Build a findOne filter that never queries project-owned records by `_id` alone.
   */
  async buildScopedIdFilter(
    actorId: string,
    resourceId: string,
    field = 'projectId',
  ): Promise<FilterQuery<Record<string, unknown>>> {
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new NotFoundException('Resource not found');
    }
    const scope = await this.projectAccessService.buildAuthorisedProjectFilter(
      actorId,
      field,
    );
    return {
      _id: new Types.ObjectId(resourceId),
      ...scope,
    };
  }

  /**
   * Load a project-owned document with company/project scope enforced in the query.
   */
  async findOneForActor<T>(
    model: Model<T>,
    actorId: string,
    resourceId: string,
    options?: {
      projectField?: string;
      notFoundMessage?: string;
      action?: ProjectAccessOperation | string;
      resourceType?: string;
    },
  ): Promise<T> {
    if (!actorId) {
      throw new ForbiddenException('Access denied');
    }
    const filter = await this.buildScopedIdFilter(
      actorId,
      resourceId,
      options?.projectField ?? 'projectId',
    );
    const row = await model.findOne(filter as FilterQuery<T>).exec();
    if (!row) {
      throw new NotFoundException(options?.notFoundMessage ?? 'Resource not found');
    }

    const projectId = (row as { projectId?: Types.ObjectId | string | null })
      .projectId;
    if (projectId) {
      await this.assertProjectAccess(
        actorId,
        String(projectId),
        options?.action ?? 'read',
        {
          resourceType: options?.resourceType,
          resourceId,
        },
      );
    }

    return row;
  }

  /**
   * Aggregation `$match` stage for authorised projects (prepend to pipelines).
   */
  async authorisedProjectMatchStage(
    actorId: string,
    field = 'projectId',
  ): Promise<Record<string, unknown>> {
    const scope = await this.projectAccessService.buildAuthorisedProjectFilter(
      actorId,
      field,
    );
    return scope;
  }

  toObjectIdList(projectIds: string[]): Types.ObjectId[] {
    return projectIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }
}
