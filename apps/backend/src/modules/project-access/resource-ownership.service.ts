import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import {
  RESOURCE_OWNERSHIP_REGISTRY,
  type ResourceOwnershipDefinition,
} from './resource-ownership.registry';

export type ResourceOwnership = {
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  companyId: string | null;
  found: boolean;
};

@Injectable()
export class ResourceOwnershipService {
  private readonly logger = new Logger(ResourceOwnershipService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  getDefinition(resourceType: string): ResourceOwnershipDefinition | null {
    return RESOURCE_OWNERSHIP_REGISTRY[resourceType] ?? null;
  }

  /**
   * Load minimum ownership fields for a resource. Returns found=false when
   * the model is unavailable or the document does not exist.
   */
  async resolveOwnership(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourceOwnership> {
    const empty: ResourceOwnership = {
      resourceType,
      resourceId,
      projectId: null,
      companyId: null,
      found: false,
    };

    if (!Types.ObjectId.isValid(resourceId)) {
      return empty;
    }

    const definition = this.getDefinition(resourceType);
    if (!definition) {
      this.logger.warn(`No ownership registry entry for resourceType=${resourceType}`);
      return empty;
    }

    if (definition.idIsProjectId) {
      const projectModel = this.connection.models.Project;
      if (!projectModel) {
        return empty;
      }
      const project = await projectModel
        .findById(resourceId)
        .select('_id companyId')
        .lean<{ _id: Types.ObjectId; companyId?: Types.ObjectId | null }>()
        .exec();
      if (!project) {
        return empty;
      }
      return {
        resourceType,
        resourceId,
        projectId: String(project._id),
        companyId: project.companyId ? String(project.companyId) : null,
        found: true,
      };
    }

    const model = this.connection.models[definition.modelName];
    if (!model) {
      this.logger.warn(
        `Mongoose model ${definition.modelName} not registered for ${resourceType}`,
      );
      return empty;
    }

    const selectFields = [definition.projectIdField];
    if (definition.companyIdField) {
      selectFields.push(definition.companyIdField);
    }

    const doc = await model
      .findById(resourceId)
      .select(selectFields.join(' '))
      .lean<Record<string, Types.ObjectId | null | undefined>>()
      .exec();

    if (!doc) {
      return empty;
    }

    const rawProject = doc[definition.projectIdField];
    const rawCompany = definition.companyIdField
      ? doc[definition.companyIdField]
      : null;

    return {
      resourceType,
      resourceId,
      projectId: rawProject ? String(rawProject) : null,
      companyId: rawCompany ? String(rawCompany) : null,
      found: true,
    };
  }
}
