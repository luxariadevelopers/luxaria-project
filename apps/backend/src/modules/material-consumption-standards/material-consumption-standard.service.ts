import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { BoqItem } from '../boq/schemas/boq.schema';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import {
  ApproveMaterialConsumptionStandardDto,
  CreateMaterialConsumptionStandardDto,
  ListMaterialConsumptionStandardsQueryDto,
  RejectMaterialConsumptionStandardDto,
  ResolveMaterialConsumptionStandardQueryDto,
  UpdateMaterialConsumptionStandardDto,
} from './dto/material-consumption-standard.dto';
import {
  toPublicMaterialConsumptionStandard,
  type PublicMaterialConsumptionStandard,
} from './material-consumption-standard.mapper';
import {
  assertBoqOrWorkType,
  assertEditable,
  assertQuantityAndWastage,
  buildScopeKey,
  normalizeEffectiveDate,
  normalizeWorkType,
  requireObjectId,
  roundPct,
  roundQty,
} from './material-consumption-standard.validation';
import {
  MaterialConsumptionStandard,
  MaterialConsumptionStandardDocument,
  MaterialConsumptionStandardStatus,
} from './schemas/material-consumption-standard.schema';

@Injectable()
export class MaterialConsumptionStandardService {
  constructor(
    @InjectModel(MaterialConsumptionStandard.name)
    private readonly standardModel: Model<MaterialConsumptionStandard>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(BoqItem.name)
    private readonly boqItemModel: Model<BoqItem>,
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreateMaterialConsumptionStandardDto, actorId: string) {
    assertBoqOrWorkType(dto);
    assertQuantityAndWastage(dto.quantityPerUnit, dto.wastagePercentage);

    const projectId = dto.projectId || null;
    if (projectId) {
      await this.requireProject(projectId);
    }

    const material = await this.requireActiveMaterial(dto.materialId);
    if (dto.boqItemId) {
      await this.requireBoqItem(dto.boqItemId, projectId);
    }

    const workType = dto.workType ? normalizeWorkType(dto.workType) : null;
    const effectiveDate = normalizeEffectiveDate(dto.effectiveDate);
    const scopeKey = buildScopeKey({
      projectId,
      boqItemId: dto.boqItemId,
      workType,
      materialId: dto.materialId,
      outputUnit: dto.outputUnit,
    });

    await this.assertNoOpenVersion(scopeKey);

    const latest = await this.standardModel
      .findOne({ scopeKey })
      .sort({ version: -1 })
      .lean()
      .exec();
    const version = (latest?.version ?? 0) + 1;

    let overridesStandardId: Types.ObjectId | null = null;
    if (projectId) {
      if (dto.overridesStandardId) {
        const global = await this.requireStandard(dto.overridesStandardId);
        if (global.projectId) {
          throw new BadRequestException(
            'overridesStandardId must reference a company-wide standard',
          );
        }
        overridesStandardId = global._id;
      } else {
        const globalKey = buildScopeKey({
          projectId: null,
          boqItemId: dto.boqItemId,
          workType,
          materialId: dto.materialId,
          outputUnit: dto.outputUnit,
        });
        const globalActive = await this.standardModel
          .findOne({
            scopeKey: globalKey,
            status: MaterialConsumptionStandardStatus.Active,
          })
          .exec();
        if (globalActive) {
          overridesStandardId = globalActive._id;
        }
      }
    }

    const standardNumber = await this.numberingService.nextCode(
      NumberEntityType.MATERIAL_CONSUMPTION_STANDARD,
      { asOf: effectiveDate },
    );

    const row = await this.standardModel.create({
      standardNumber,
      scopeKey,
      projectId: projectId ? new Types.ObjectId(projectId) : null,
      isProjectOverride: Boolean(projectId),
      overridesStandardId,
      boqItemId: dto.boqItemId
        ? new Types.ObjectId(dto.boqItemId)
        : null,
      workType,
      outputUnit: dto.outputUnit,
      materialId: material._id,
      materialCode: material.materialCode,
      materialName: material.name,
      quantityPerUnit: roundQty(dto.quantityPerUnit),
      wastagePercentage: roundPct(dto.wastagePercentage),
      effectiveDate,
      version,
      status: MaterialConsumptionStandardStatus.Draft,
      basedOnStandardId: latest?._id
        ? new Types.ObjectId(String(latest._id))
        : null,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      'Material consumption standard created (draft)',
    );
  }

  async update(
    id: string,
    dto: UpdateMaterialConsumptionStandardDto,
    actorId: string,
  ) {
    const row = await this.requireStandard(id);
    assertEditable(row.status);

    const projectId =
      dto.projectId !== undefined
        ? dto.projectId || null
        : row.projectId
          ? String(row.projectId)
          : null;
    if (projectId) {
      await this.requireProject(projectId);
    }

    const materialId = dto.materialId ?? String(row.materialId);
    const material = await this.requireActiveMaterial(materialId);

    const boqItemId =
      dto.boqItemId !== undefined
        ? dto.boqItemId || null
        : row.boqItemId
          ? String(row.boqItemId)
          : null;
    const workTypeRaw =
      dto.workType !== undefined ? dto.workType : row.workType;
    const workType = workTypeRaw ? normalizeWorkType(workTypeRaw) : null;
    assertBoqOrWorkType({ boqItemId, workType });

    if (boqItemId) {
      await this.requireBoqItem(boqItemId, projectId);
    }

    const outputUnit = dto.outputUnit ?? row.outputUnit;
    const quantityPerUnit = roundQty(
      dto.quantityPerUnit ?? row.quantityPerUnit,
    );
    const wastagePercentage = roundPct(
      dto.wastagePercentage ?? row.wastagePercentage,
    );
    assertQuantityAndWastage(quantityPerUnit, wastagePercentage);

    const effectiveDate = dto.effectiveDate
      ? normalizeEffectiveDate(dto.effectiveDate)
      : row.effectiveDate;

    const scopeKey = buildScopeKey({
      projectId,
      boqItemId,
      workType,
      materialId,
      outputUnit,
    });

    if (scopeKey !== row.scopeKey) {
      await this.assertNoOpenVersion(scopeKey, String(row._id));
    }

    row.scopeKey = scopeKey;
    row.projectId = projectId ? new Types.ObjectId(projectId) : null;
    row.isProjectOverride = Boolean(projectId);
    row.boqItemId = boqItemId ? new Types.ObjectId(boqItemId) : null;
    row.workType = workType;
    row.outputUnit = outputUnit;
    row.materialId = material._id;
    row.materialCode = material.materialCode;
    row.materialName = material.name;
    row.quantityPerUnit = quantityPerUnit;
    row.wastagePercentage = wastagePercentage;
    row.effectiveDate = effectiveDate;
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || null;
    }
    if (dto.overridesStandardId !== undefined) {
      row.overridesStandardId = dto.overridesStandardId
        ? new Types.ObjectId(dto.overridesStandardId)
        : null;
    }

    if (row.status === MaterialConsumptionStandardStatus.Rejected) {
      row.status = MaterialConsumptionStandardStatus.Draft;
      row.rejectedBy = null;
      row.rejectedAt = null;
      row.rejectionReason = null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      'Material consumption standard updated',
    );
  }

  /**
   * Create next draft version from an existing standard (any non-open status).
   */
  async createVersion(id: string, actorId: string) {
    const source = await this.requireStandard(id);
    if (
      source.status === MaterialConsumptionStandardStatus.Draft ||
      source.status === MaterialConsumptionStandardStatus.PendingApproval
    ) {
      throw new BadRequestException(
        'An open draft/pending version already exists for this standard',
      );
    }

    await this.assertNoOpenVersion(source.scopeKey);

    const effectiveDate = source.effectiveDate;
    const standardNumber = await this.numberingService.nextCode(
      NumberEntityType.MATERIAL_CONSUMPTION_STANDARD,
      { asOf: effectiveDate },
    );

    const row = await this.standardModel.create({
      standardNumber,
      scopeKey: source.scopeKey,
      projectId: source.projectId,
      isProjectOverride: source.isProjectOverride,
      overridesStandardId: source.overridesStandardId,
      boqItemId: source.boqItemId,
      workType: source.workType,
      outputUnit: source.outputUnit,
      materialId: source.materialId,
      materialCode: source.materialCode,
      materialName: source.materialName,
      quantityPerUnit: source.quantityPerUnit,
      wastagePercentage: source.wastagePercentage,
      effectiveDate,
      version: source.version + 1,
      status: MaterialConsumptionStandardStatus.Draft,
      basedOnStandardId: source._id,
      notes: source.notes,
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      `Material consumption standard v${row.version} created (draft)`,
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireStandard(id);
    if (
      row.status !== MaterialConsumptionStandardStatus.Draft &&
      row.status !== MaterialConsumptionStandardStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected standards can be submitted for approval',
      );
    }

    row.status = MaterialConsumptionStandardStatus.PendingApproval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      'Material consumption standard submitted for approval',
    );
  }

  async approve(
    id: string,
    dto: ApproveMaterialConsumptionStandardDto,
    actorId: string,
  ) {
    const row = await this.requireStandard(id);
    if (row.status !== MaterialConsumptionStandardStatus.PendingApproval) {
      throw new BadRequestException(
        'Only standards pending approval can be approved',
      );
    }

    const approvalReference = dto.approvalReference.trim();
    if (!approvalReference) {
      throw new BadRequestException('approvalReference is required');
    }

    await this.standardModel
      .updateMany(
        {
          scopeKey: row.scopeKey,
          status: MaterialConsumptionStandardStatus.Active,
          _id: { $ne: row._id },
        },
        {
          $set: {
            status: MaterialConsumptionStandardStatus.Superseded,
            updatedBy: new Types.ObjectId(actorId),
          },
        },
      )
      .exec();

    row.status = MaterialConsumptionStandardStatus.Active;
    row.approvalReference = approvalReference;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || row.notes;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      'Material consumption standard approved and activated',
    );
  }

  async reject(
    id: string,
    dto: RejectMaterialConsumptionStandardDto,
    actorId: string,
  ) {
    const row = await this.requireStandard(id);
    if (row.status !== MaterialConsumptionStandardStatus.PendingApproval) {
      throw new BadRequestException(
        'Only standards pending approval can be rejected',
      );
    }

    row.status = MaterialConsumptionStandardStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      'Material consumption standard rejected',
    );
  }

  async getById(id: string) {
    const row = await this.requireStandard(id);
    return createSuccessResponse(
      toPublicMaterialConsumptionStandard(row),
      'Material consumption standard retrieved',
    );
  }

  async list(query: ListMaterialConsumptionStandardsQueryDto) {
    const filter: Record<string, unknown> = {};

    if (query.globalOnly) {
      filter.projectId = null;
    } else if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.boqItemId) {
      filter.boqItemId = new Types.ObjectId(query.boqItemId);
    }
    if (query.workType) {
      filter.workType = new RegExp(
        `^${escapeRegex(normalizeWorkType(query.workType))}$`,
        'i',
      );
    }
    if (query.materialId) {
      filter.materialId = new Types.ObjectId(query.materialId);
    }
    if (query.outputUnit) {
      filter.outputUnit = query.outputUnit;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.standardModel
        .find(filter)
        .sort({ scopeKey: 1, version: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.standardModel.countDocuments(filter).exec(),
    ]);

    const data: PublicMaterialConsumptionStandard[] = rows.map((row) =>
      toPublicMaterialConsumptionStandard(row),
    );

    return createSuccessResponse(data, 'Material consumption standards listed', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }

  /**
   * Resolve applicable standard: project override wins over company-wide.
   */
  async resolve(query: ResolveMaterialConsumptionStandardQueryDto) {
    assertBoqOrWorkType(query);
    const workType = query.workType
      ? normalizeWorkType(query.workType)
      : null;
    const asOf = query.asOf
      ? normalizeEffectiveDate(query.asOf)
      : normalizeEffectiveDate(new Date());

    const candidates: string[] = [];
    if (query.projectId) {
      candidates.push(
        buildScopeKey({
          projectId: query.projectId,
          boqItemId: query.boqItemId,
          workType,
          materialId: query.materialId,
          outputUnit: query.outputUnit,
        }),
      );
    }
    candidates.push(
      buildScopeKey({
        projectId: null,
        boqItemId: query.boqItemId,
        workType,
        materialId: query.materialId,
        outputUnit: query.outputUnit,
      }),
    );

    for (const scopeKey of candidates) {
      const row = await this.standardModel
        .findOne({
          scopeKey,
          status: MaterialConsumptionStandardStatus.Active,
          effectiveDate: { $lte: asOf },
        })
        .exec();
      if (row) {
        return createSuccessResponse(
          {
            ...toPublicMaterialConsumptionStandard(row),
            resolvedFrom: row.isProjectOverride ? 'project' : 'global',
          },
          'Material consumption standard resolved',
        );
      }
    }

    throw new NotFoundException(
      'No active material consumption standard found for the given criteria',
    );
  }

  private async assertNoOpenVersion(scopeKey: string, excludeId?: string) {
    const filter: Record<string, unknown> = {
      scopeKey,
      status: {
        $in: [
          MaterialConsumptionStandardStatus.Draft,
          MaterialConsumptionStandardStatus.PendingApproval,
        ],
      },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const open = await this.standardModel.findOne(filter).lean().exec();
    if (open) {
      throw new ConflictException(
        `An open ${open.status} version already exists for this standard scope (${open.standardNumber})`,
      );
    }
  }

  private async requireStandard(
    id: string,
  ): Promise<MaterialConsumptionStandardDocument> {
    requireObjectId(id, 'standard id');
    const row = await this.standardModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Material consumption standard not found');
    }
    return row;
  }

  private async requireProject(projectId: string) {
    requireObjectId(projectId, 'projectId');
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async requireActiveMaterial(materialId: string) {
    requireObjectId(materialId, 'materialId');
    const material = await this.materialModel.findById(materialId).exec();
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    if (material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material must be active');
    }
    return material;
  }

  private async requireBoqItem(
    boqItemId: string,
    projectId: string | null,
  ) {
    requireObjectId(boqItemId, 'boqItemId');
    const item = await this.boqItemModel.findById(boqItemId).lean().exec();
    if (!item) {
      throw new NotFoundException('BOQ item not found');
    }
    if (projectId && String(item.projectId) !== projectId) {
      throw new BadRequestException(
        'BOQ item does not belong to the specified project',
      );
    }
    return item;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
