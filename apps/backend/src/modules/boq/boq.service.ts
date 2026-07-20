import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import { BoqExcelService, type BoqExcelRow } from './boq-excel.service';
import {
  toPublicBoqBlock,
  toPublicBoqFloor,
  toPublicBoqItem,
  toPublicBoqVersion,
  toPublicBoqWorkCategory,
} from './boq.mapper';
import {
  assertBoqVersionEditable,
  requiresApprovalToActivate,
} from './boq-version.helpers';
import {
  assertBoqItemTotals,
  assertDateRange,
  computePlannedRate,
  computePlannedValue,
  normalizeCode,
  roundMoney,
  roundQty,
  validateBoqItemTotals,
} from './boq.validation';
import type {
  BoqMaterialCoefficientDto,
  CreateBoqBlockDto,
  CreateBoqFloorDto,
  CreateBoqItemDto,
  CreateBoqWorkCategoryDto,
  ListBoqItemsQueryDto,
  UpdateBoqBlockDto,
  UpdateBoqFloorDto,
  UpdateBoqItemDto,
  UpdateBoqWorkCategoryDto,
} from './dto/boq.dto';
import type {
  ActivateBoqVersionDto,
  ApproveBoqVersionDto,
  CreateBoqVersionDto,
  RejectBoqVersionDto,
  UpdateBoqVersionDto,
} from './dto/boq-version.dto';
import {
  BoqBlock,
  BoqFloor,
  BoqHierarchyStatus,
  BoqItem,
  BoqItemStatus,
  BoqMaterialCoefficient,
  BoqVersion,
  BoqVersionDocument,
  BoqVersionStatus,
  BoqVersionType,
  BoqWorkCategory,
} from './schemas/boq.schema';

@Injectable()
export class BoqService {
  constructor(
    @InjectModel(BoqBlock.name)
    private readonly blockModel: Model<BoqBlock>,
    @InjectModel(BoqFloor.name)
    private readonly floorModel: Model<BoqFloor>,
    @InjectModel(BoqWorkCategory.name)
    private readonly categoryModel: Model<BoqWorkCategory>,
    @InjectModel(BoqItem.name)
    private readonly itemModel: Model<BoqItem>,
    @InjectModel(BoqVersion.name)
    private readonly versionModel: Model<BoqVersion>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    private readonly numberingService: NumberingService,
    private readonly excelService: BoqExcelService,
  ) {}

  // ── Hierarchy: Blocks ──────────────────────────────────────────────

  async createBlock(
    projectId: string,
    dto: CreateBoqBlockDto,
    actorId: string,
  ) {
    await this.requireProject(projectId);
    const blockCode = normalizeCode(dto.blockCode, 'blockCode');
    await this.assertUniqueBlockCode(projectId, blockCode);

    const row = await this.blockModel.create({
      projectId: new Types.ObjectId(projectId),
      blockCode,
      name: dto.name.trim(),
      sortOrder: dto.sortOrder ?? 0,
      status: BoqHierarchyStatus.Active,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicBoqBlock(row), 'BOQ block created');
  }

  async listBlocks(projectId: string) {
    await this.requireProject(projectId);
    const rows = await this.blockModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ sortOrder: 1, blockCode: 1 })
      .exec();
    return createSuccessResponse(
      rows.map(toPublicBoqBlock),
      'BOQ blocks fetched successfully',
    );
  }

  async updateBlock(id: string, dto: UpdateBoqBlockDto, actorId: string) {
    const row = await this.requireBlock(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicBoqBlock(row), 'BOQ block updated');
  }

  // ── Hierarchy: Floors ──────────────────────────────────────────────

  async createFloor(blockId: string, dto: CreateBoqFloorDto, actorId: string) {
    const block = await this.requireBlock(blockId);
    const floorCode = normalizeCode(dto.floorCode, 'floorCode');
    await this.assertUniqueFloorCode(blockId, floorCode);

    const row = await this.floorModel.create({
      projectId: block.projectId,
      blockId: block._id,
      floorCode,
      name: dto.name.trim(),
      level: dto.level ?? 0,
      sortOrder: dto.sortOrder ?? 0,
      status: BoqHierarchyStatus.Active,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicBoqFloor(row), 'BOQ floor created');
  }

  async listFloors(blockId: string) {
    await this.requireBlock(blockId);
    const rows = await this.floorModel
      .find({ blockId: new Types.ObjectId(blockId) })
      .sort({ sortOrder: 1, level: 1, floorCode: 1 })
      .exec();
    return createSuccessResponse(
      rows.map(toPublicBoqFloor),
      'BOQ floors fetched successfully',
    );
  }

  async updateFloor(id: string, dto: UpdateBoqFloorDto, actorId: string) {
    const row = await this.requireFloor(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.level !== undefined) row.level = dto.level;
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicBoqFloor(row), 'BOQ floor updated');
  }

  // ── Hierarchy: Work categories ─────────────────────────────────────

  async createWorkCategory(
    floorId: string,
    dto: CreateBoqWorkCategoryDto,
    actorId: string,
  ) {
    const floor = await this.requireFloor(floorId);
    const categoryCode = normalizeCode(dto.categoryCode, 'categoryCode');
    await this.assertUniqueCategoryCode(floorId, categoryCode);

    const row = await this.categoryModel.create({
      projectId: floor.projectId,
      blockId: floor.blockId,
      floorId: floor._id,
      categoryCode,
      name: dto.name.trim(),
      sortOrder: dto.sortOrder ?? 0,
      status: BoqHierarchyStatus.Active,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicBoqWorkCategory(row),
      'BOQ work category created',
    );
  }

  async listWorkCategories(floorId: string) {
    await this.requireFloor(floorId);
    const rows = await this.categoryModel
      .find({ floorId: new Types.ObjectId(floorId) })
      .sort({ sortOrder: 1, categoryCode: 1 })
      .exec();
    return createSuccessResponse(
      rows.map(toPublicBoqWorkCategory),
      'BOQ work categories fetched successfully',
    );
  }

  async updateWorkCategory(
    id: string,
    dto: UpdateBoqWorkCategoryDto,
    actorId: string,
  ) {
    const row = await this.requireCategory(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBoqWorkCategory(row),
      'BOQ work category updated',
    );
  }


  // ── Versions ───────────────────────────────────────────────────────

  async createVersion(
    projectId: string,
    dto: CreateBoqVersionDto,
    actorId: string,
  ) {
    await this.requireProject(projectId);

    if (dto.versionType === BoqVersionType.Original) {
      const existing = await this.versionModel
        .countDocuments({ projectId: new Types.ObjectId(projectId) })
        .exec();
      if (existing > 0) {
        throw new BadRequestException(
          'Original BOQ version already exists for this project; create a revision, variation, or change order',
        );
      }
    } else {
      let basedOnId = dto.basedOnVersionId;
      if (!basedOnId) {
        basedOnId = String(
          (await this.requireActiveVersion(projectId))._id,
        );
      }
      const basedOn = await this.requireVersion(basedOnId);
      if (String(basedOn.projectId) !== projectId) {
        throw new BadRequestException(
          'basedOnVersionId does not belong to this project',
        );
      }
      if (
        basedOn.status !== BoqVersionStatus.Active &&
        basedOn.status !== BoqVersionStatus.Superseded
      ) {
        throw new BadRequestException(
          'New versions must be based on an active or superseded (approved) version',
        );
      }
    }

    const openDraft = await this.versionModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        status: {
          $in: [BoqVersionStatus.Draft, BoqVersionStatus.PendingApproval],
        },
      })
      .lean()
      .exec();
    if (openDraft) {
      throw new ConflictException(
        `Project already has an open BOQ version v${openDraft.versionNumber} (${openDraft.status})`,
      );
    }

    const versionNumber = await this.nextVersionNumber(projectId);
    const effectiveDate = this.parseDate(dto.effectiveDate, 'effectiveDate');
    let basedOnVersionId: Types.ObjectId | null = null;
    let costImpact = dto.costImpact ?? 0;
    let totalPlannedValue = 0;

    if (dto.versionType !== BoqVersionType.Original) {
      let basedOnId = dto.basedOnVersionId;
      if (!basedOnId) {
        basedOnId = String(
          (await this.requireActiveVersion(projectId))._id,
        );
      }
      basedOnVersionId = new Types.ObjectId(basedOnId);
    }

    const row = await this.versionModel.create({
      projectId: new Types.ObjectId(projectId),
      versionNumber,
      versionType: dto.versionType,
      effectiveDate,
      reason: dto.reason.trim(),
      costImpact: roundMoney(costImpact),
      timeImpact: dto.timeImpact ?? 0,
      approvalReference: null,
      status: BoqVersionStatus.Draft,
      basedOnVersionId,
      totalPlannedValue: 0,
      createdBy: new Types.ObjectId(actorId),
    });

    if (basedOnVersionId) {
      totalPlannedValue = await this.snapshotItemsFromVersion(
        String(basedOnVersionId),
        String(row._id),
        projectId,
        actorId,
      );
      const baseTotal = await this.sumVersionPlannedValue(
        String(basedOnVersionId),
      );
      if (dto.costImpact === undefined) {
        costImpact = roundMoney(totalPlannedValue - baseTotal);
      }
      row.totalPlannedValue = totalPlannedValue;
      row.costImpact = roundMoney(costImpact);
      await row.save();
    }

    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version created as draft',
    );
  }

  async listVersions(projectId: string) {
    await this.requireProject(projectId);
    const rows = await this.versionModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ versionNumber: -1 })
      .exec();
    return createSuccessResponse(
      rows.map(toPublicBoqVersion),
      'BOQ versions fetched successfully',
    );
  }

  async getVersion(id: string) {
    const row = await this.requireVersion(id);
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version fetched successfully',
    );
  }

  async getActiveVersion(projectId: string) {
    await this.requireProject(projectId);
    const row = await this.versionModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        status: BoqVersionStatus.Active,
      })
      .exec();
    if (!row) {
      throw new NotFoundException('No active BOQ version for this project');
    }
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'Active BOQ version fetched successfully',
    );
  }

  async updateVersion(id: string, dto: UpdateBoqVersionDto, actorId: string) {
    const row = await this.requireVersion(id);
    assertBoqVersionEditable(row);
    if (dto.effectiveDate !== undefined) {
      row.effectiveDate = this.parseDate(dto.effectiveDate, 'effectiveDate');
    }
    if (dto.reason !== undefined) row.reason = dto.reason.trim();
    if (dto.costImpact !== undefined) row.costImpact = roundMoney(dto.costImpact);
    if (dto.timeImpact !== undefined) row.timeImpact = dto.timeImpact;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version updated',
    );
  }

  /** Draft → Pending approval (required for variations). */
  async submitVersion(id: string, actorId: string) {
    const row = await this.requireVersion(id);
    if (
      row.status !== BoqVersionStatus.Draft &&
      row.status !== BoqVersionStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected BOQ versions can be submitted',
      );
    }
    const itemCount = await this.itemModel
      .countDocuments({ versionId: row._id })
      .exec();
    if (itemCount === 0) {
      throw new BadRequestException(
        'BOQ version must have at least one item before submission',
      );
    }
    row.totalPlannedValue = await this.sumVersionPlannedValue(String(row._id));
    if (row.basedOnVersionId) {
      const baseTotal = await this.sumVersionPlannedValue(
        String(row.basedOnVersionId),
      );
      row.costImpact = roundMoney(row.totalPlannedValue - baseTotal);
    }
    row.status = BoqVersionStatus.PendingApproval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version submitted for approval',
    );
  }

  /**
   * Pending approval → Active.
   * Variation must use this path. Sets approvalReference. Supersedes prior active.
   */
  async approveVersion(
    id: string,
    dto: ApproveBoqVersionDto,
    actorId: string,
  ) {
    const row = await this.requireVersion(id);
    if (row.status !== BoqVersionStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval BOQ versions can be approved',
      );
    }
    const approvalReference = dto.approvalReference?.trim();
    if (!approvalReference) {
      throw new BadRequestException('approvalReference is required');
    }

    await this.activateVersionInternal(row, actorId, approvalReference);
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version approved and set active',
    );
  }

  async rejectVersion(id: string, dto: RejectBoqVersionDto, actorId: string) {
    const row = await this.requireVersion(id);
    if (row.status !== BoqVersionStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval BOQ versions can be rejected',
      );
    }
    row.status = BoqVersionStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version rejected',
    );
  }

  /**
   * Activate a draft version without approval — blocked for Variation.
   */
  async activateVersion(
    id: string,
    dto: ActivateBoqVersionDto,
    actorId: string,
  ) {
    const row = await this.requireVersion(id);
    if (requiresApprovalToActivate(row.versionType)) {
      throw new BadRequestException(
        'Variation versions require approval before activation',
      );
    }
    if (
      row.status !== BoqVersionStatus.Draft &&
      row.status !== BoqVersionStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected versions can be activated directly',
      );
    }
    const itemCount = await this.itemModel
      .countDocuments({ versionId: row._id })
      .exec();
    if (itemCount === 0) {
      throw new BadRequestException(
        'BOQ version must have at least one item before activation',
      );
    }
    await this.activateVersionInternal(
      row,
      actorId,
      dto.approvalReference?.trim() || null,
    );
    return createSuccessResponse(
      toPublicBoqVersion(row),
      'BOQ version activated',
    );
  }

  async compareVersions(
    projectId: string,
    fromVersionId: string,
    toVersionId: string,
  ) {
    await this.requireProject(projectId);
    const from = await this.requireVersion(fromVersionId);
    const to = await this.requireVersion(toVersionId);
    if (
      String(from.projectId) !== projectId ||
      String(to.projectId) !== projectId
    ) {
      throw new BadRequestException(
        'Both versions must belong to the given project',
      );
    }

    const [fromItems, toItems] = await Promise.all([
      this.itemModel
        .find({
          versionId: from._id,
          status: { $ne: BoqItemStatus.Cancelled },
        })
        .lean()
        .exec(),
      this.itemModel
        .find({
          versionId: to._id,
          status: { $ne: BoqItemStatus.Cancelled },
        })
        .lean()
        .exec(),
    ]);

    const fromMap = new Map(fromItems.map((i) => [i.boqCode, i]));
    const toMap = new Map(toItems.map((i) => [i.boqCode, i]));

    const added = [];
    const removed = [];
    const changed = [];
    const unchanged = [];

    for (const [code, item] of toMap) {
      const prev = fromMap.get(code);
      if (!prev) {
        added.push({
          boqCode: code,
          description: item.description,
          plannedQuantity: item.plannedQuantity,
          plannedRate: item.plannedRate,
          plannedValue: item.plannedValue,
        });
        continue;
      }
      const deltas = {
        plannedQuantity: roundQty(item.plannedQuantity - prev.plannedQuantity),
        materialCost: roundMoney(item.materialCost - prev.materialCost),
        labourCost: roundMoney(item.labourCost - prev.labourCost),
        subcontractCost: roundMoney(
          item.subcontractCost - prev.subcontractCost,
        ),
        otherCost: roundMoney(item.otherCost - prev.otherCost),
        plannedRate: roundMoney(item.plannedRate - prev.plannedRate),
        plannedValue: roundMoney(item.plannedValue - prev.plannedValue),
      };
      const hasChange = Object.values(deltas).some((v) => Math.abs(v) > 0.005);
      if (hasChange) {
        changed.push({
          boqCode: code,
          description: item.description,
          from: {
            plannedQuantity: prev.plannedQuantity,
            plannedRate: prev.plannedRate,
            plannedValue: prev.plannedValue,
            materialCost: prev.materialCost,
            labourCost: prev.labourCost,
            subcontractCost: prev.subcontractCost,
            otherCost: prev.otherCost,
          },
          to: {
            plannedQuantity: item.plannedQuantity,
            plannedRate: item.plannedRate,
            plannedValue: item.plannedValue,
            materialCost: item.materialCost,
            labourCost: item.labourCost,
            subcontractCost: item.subcontractCost,
            otherCost: item.otherCost,
          },
          deltas,
        });
      } else {
        unchanged.push({ boqCode: code });
      }
    }

    for (const [code, item] of fromMap) {
      if (!toMap.has(code)) {
        removed.push({
          boqCode: code,
          description: item.description,
          plannedQuantity: item.plannedQuantity,
          plannedRate: item.plannedRate,
          plannedValue: item.plannedValue,
        });
      }
    }

    const fromTotal = roundMoney(
      fromItems.reduce((s, i) => s + i.plannedValue, 0),
    );
    const toTotal = roundMoney(toItems.reduce((s, i) => s + i.plannedValue, 0));

    return createSuccessResponse(
      {
        fromVersion: toPublicBoqVersion(from),
        toVersion: toPublicBoqVersion(to),
        summary: {
          addedCount: added.length,
          removedCount: removed.length,
          changedCount: changed.length,
          unchangedCount: unchanged.length,
          fromTotalPlannedValue: fromTotal,
          toTotalPlannedValue: toTotal,
          costImpact: roundMoney(toTotal - fromTotal),
        },
        added,
        removed,
        changed,
      },
      'BOQ version comparison generated',
    );
  }

  // ── BOQ items ──────────────────────────────────────────────────────

  async createItem(projectId: string, dto: CreateBoqItemDto, actorId: string) {
    await this.requireProject(projectId);
    const version = await this.resolveEditableVersion(
      projectId,
      dto.versionId,
      actorId,
    );
    const category = await this.requireCategory(dto.workCategoryId);
    if (String(category.projectId) !== projectId) {
      throw new BadRequestException(
        'workCategoryId does not belong to this project',
      );
    }

    const costs = this.resolveCosts(dto);
    const boqCode = dto.boqCode?.trim()
      ? normalizeCode(dto.boqCode, 'boqCode')
      : await this.numberingService.nextCode(NumberEntityType.BOQ, {
          asOf: new Date(),
          projectId,
          projectScoped: true,
        });
    await this.assertUniqueBoqCode(String(version._id), boqCode);

    const startDate = this.parseOptionalDate(dto.startDate, 'startDate');
    const endDate = this.parseOptionalDate(dto.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    const row = await this.itemModel.create({
      projectId: new Types.ObjectId(projectId),
      versionId: version._id,
      blockId: category.blockId,
      floorId: category.floorId,
      workCategoryId: category._id,
      boqCode,
      description: dto.description.trim(),
      unit: dto.unit,
      plannedQuantity: costs.plannedQuantity,
      materialCost: costs.materialCost,
      labourCost: costs.labourCost,
      subcontractCost: costs.subcontractCost,
      otherCost: costs.otherCost,
      plannedRate: costs.plannedRate,
      plannedValue: costs.plannedValue,
      startDate,
      endDate,
      materialCoefficients: this.mapCoefficients(dto.materialCoefficients),
      status: dto.status ?? BoqItemStatus.Draft,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    await this.refreshVersionTotals(String(version._id));
    return createSuccessResponse(toPublicBoqItem(row), 'BOQ item created');
  }

  async updateItem(id: string, dto: UpdateBoqItemDto, actorId: string) {
    const row = await this.requireItem(id);
    const version = await this.requireVersion(String(row.versionId));
    assertBoqVersionEditable(version);
    if (row.status === BoqItemStatus.Cancelled) {
      throw new BadRequestException('Cancelled BOQ items cannot be updated');
    }

    if (dto.description !== undefined) row.description = dto.description.trim();
    if (dto.unit !== undefined) row.unit = dto.unit;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    if (dto.materialCoefficients !== undefined) {
      row.materialCoefficients = this.mapCoefficients(dto.materialCoefficients);
    }

    const costs = this.resolveCosts({
      plannedQuantity: dto.plannedQuantity ?? row.plannedQuantity,
      materialCost: dto.materialCost ?? row.materialCost,
      labourCost: dto.labourCost ?? row.labourCost,
      subcontractCost: dto.subcontractCost ?? row.subcontractCost,
      otherCost: dto.otherCost ?? row.otherCost,
      plannedRate: dto.plannedRate,
      plannedValue: dto.plannedValue,
    });
    row.plannedQuantity = costs.plannedQuantity;
    row.materialCost = costs.materialCost;
    row.labourCost = costs.labourCost;
    row.subcontractCost = costs.subcontractCost;
    row.otherCost = costs.otherCost;
    row.plannedRate = costs.plannedRate;
    row.plannedValue = costs.plannedValue;

    if (dto.startDate !== undefined) {
      row.startDate = this.parseOptionalDate(dto.startDate, 'startDate');
    }
    if (dto.endDate !== undefined) {
      row.endDate = this.parseOptionalDate(dto.endDate, 'endDate');
    }
    assertDateRange(row.startDate, row.endDate);

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    await this.refreshVersionTotals(String(row.versionId));
    return createSuccessResponse(toPublicBoqItem(row), 'BOQ item updated');
  }

  async getItem(id: string) {
    const row = await this.requireItem(id);
    return createSuccessResponse(
      toPublicBoqItem(row),
      'BOQ item fetched successfully',
    );
  }

  async listItems(projectId: string, query: ListBoqItemsQueryDto) {
    await this.requireProject(projectId);
    const version = query.versionId
      ? await this.requireVersion(query.versionId)
      : await this.resolveDefaultVersion(projectId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<BoqItem> = {
      projectId: new Types.ObjectId(projectId),
      versionId: version._id,
    };
    if (query.blockId) filter.blockId = new Types.ObjectId(query.blockId);
    if (query.floorId) filter.floorId = new Types.ObjectId(query.floorId);
    if (query.workCategoryId) {
      filter.workCategoryId = new Types.ObjectId(query.workCategoryId);
    }
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const sort: Record<string, SortOrder> = { boqCode: 1 };
    const [items, total] = await Promise.all([
      this.itemModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.itemModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map(toPublicBoqItem),
      'BOQ items fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getHierarchy(projectId: string) {
    await this.requireProject(projectId);
    const pid = new Types.ObjectId(projectId);
    const version = await this.resolveDefaultVersion(projectId);
    const [blocks, floors, categories, items] = await Promise.all([
      this.blockModel.find({ projectId: pid }).sort({ sortOrder: 1 }).exec(),
      this.floorModel.find({ projectId: pid }).sort({ sortOrder: 1 }).exec(),
      this.categoryModel.find({ projectId: pid }).sort({ sortOrder: 1 }).exec(),
      this.itemModel
        .find({
          projectId: pid,
          versionId: version._id,
          status: { $ne: BoqItemStatus.Cancelled },
        })
        .sort({ boqCode: 1 })
        .exec(),
    ]);

    const tree = blocks.map((block) => ({
      ...toPublicBoqBlock(block),
      floors: floors
        .filter((f) => String(f.blockId) === String(block._id))
        .map((floor) => ({
          ...toPublicBoqFloor(floor),
          workCategories: categories
            .filter((c) => String(c.floorId) === String(floor._id))
            .map((category) => ({
              ...toPublicBoqWorkCategory(category),
              items: items
                .filter(
                  (i) => String(i.workCategoryId) === String(category._id),
                )
                .map(toPublicBoqItem),
            })),
        })),
    }));

    return createSuccessResponse(tree, 'BOQ hierarchy fetched successfully');
  }

  /** Validate plannedRate / plannedValue for all (or filtered) items. */
  async validateTotals(projectId: string, versionId?: string) {
    await this.requireProject(projectId);
    const version = versionId
      ? await this.requireVersion(versionId)
      : await this.resolveDefaultVersion(projectId);
    const items = await this.itemModel
      .find({
        projectId: new Types.ObjectId(projectId),
        versionId: version._id,
        status: { $ne: BoqItemStatus.Cancelled },
      })
      .exec();

    const itemResults = items.map((item) => {
      const check = validateBoqItemTotals({
        materialCost: item.materialCost,
        labourCost: item.labourCost,
        subcontractCost: item.subcontractCost,
        otherCost: item.otherCost,
        plannedQuantity: item.plannedQuantity,
        plannedRate: item.plannedRate,
        plannedValue: item.plannedValue,
      });
      return {
        id: String(item._id),
        boqCode: item.boqCode,
        ...check,
      };
    });

    const invalid = itemResults.filter((r) => !r.valid);
    const totals = {
      itemCount: items.length,
      plannedQuantity: roundQty(
        items.reduce((s, i) => s + i.plannedQuantity, 0),
      ),
      materialCost: roundMoney(items.reduce((s, i) => s + i.materialCost, 0)),
      labourCost: roundMoney(items.reduce((s, i) => s + i.labourCost, 0)),
      subcontractCost: roundMoney(
        items.reduce((s, i) => s + i.subcontractCost, 0),
      ),
      otherCost: roundMoney(items.reduce((s, i) => s + i.otherCost, 0)),
      plannedValue: roundMoney(items.reduce((s, i) => s + i.plannedValue, 0)),
    };

    return createSuccessResponse(
      {
        valid: invalid.length === 0,
        totals,
        invalidCount: invalid.length,
        invalidItems: invalid,
      },
      invalid.length === 0
        ? 'BOQ totals are valid'
        : `BOQ totals validation found ${invalid.length} issue(s)`,
    );
  }

  // ── Excel ──────────────────────────────────────────────────────────

  async importFromExcel(
    projectId: string,
    buffer: Buffer,
    actorId: string,
    versionId?: string,
  ) {
    await this.requireProject(projectId);
    const version = await this.resolveEditableVersion(
      projectId,
      versionId,
      actorId,
    );
    const rows = await this.excelService.parseImportBuffer(buffer);
    const created: ReturnType<typeof toPublicBoqItem>[] = [];
    const errors: Array<{ rowNumber: number; message: string }> = [];

    for (const row of rows) {
      try {
        const item = await this.importRow(
          projectId,
          row,
          actorId,
          String(version._id),
        );
        created.push(toPublicBoqItem(item));
      } catch (error) {
        errors.push({
          rowNumber: row.rowNumber,
          message:
            error instanceof Error ? error.message : 'Failed to import row',
        });
      }
    }

    await this.refreshVersionTotals(String(version._id));
    return createSuccessResponse(
      {
        importedCount: created.length,
        errorCount: errors.length,
        versionId: String(version._id),
        items: created,
        errors,
      },
      `Imported ${created.length} BOQ item(s)` +
        (errors.length ? ` with ${errors.length} error(s)` : ''),
    );
  }

  async exportToExcel(projectId: string, versionId?: string): Promise<{
    filename: string;
    buffer: Buffer;
  }> {
    await this.requireProject(projectId);
    const pid = new Types.ObjectId(projectId);
    const version = versionId
      ? await this.requireVersion(versionId)
      : await this.resolveDefaultVersion(projectId);
    const [blocks, floors, categories, items] = await Promise.all([
      this.blockModel.find({ projectId: pid }).lean().exec(),
      this.floorModel.find({ projectId: pid }).lean().exec(),
      this.categoryModel.find({ projectId: pid }).lean().exec(),
      this.itemModel
        .find({
          projectId: pid,
          versionId: version._id,
          status: { $ne: BoqItemStatus.Cancelled },
        })
        .sort({ boqCode: 1 })
        .lean()
        .exec(),
    ]);

    const blockMap = new Map(blocks.map((b) => [String(b._id), b]));
    const floorMap = new Map(floors.map((f) => [String(f._id), f]));
    const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

    const exportRows = items.map((item) => {
      const block = blockMap.get(String(item.blockId));
      const floor = floorMap.get(String(item.floorId));
      const category = categoryMap.get(String(item.workCategoryId));
      return {
        blockCode: block?.blockCode ?? '',
        blockName: block?.name ?? '',
        floorCode: floor?.floorCode ?? '',
        floorName: floor?.name ?? '',
        floorLevel: floor?.level ?? 0,
        categoryCode: category?.categoryCode ?? '',
        categoryName: category?.name ?? '',
        boqCode: item.boqCode,
        description: item.description,
        unit: item.unit,
        plannedQuantity: item.plannedQuantity,
        materialCost: item.materialCost,
        labourCost: item.labourCost,
        subcontractCost: item.subcontractCost,
        otherCost: item.otherCost,
        plannedRate: item.plannedRate,
        plannedValue: item.plannedValue,
        startDate: item.startDate
          ? new Date(item.startDate).toISOString().slice(0, 10)
          : null,
        endDate: item.endDate
          ? new Date(item.endDate).toISOString().slice(0, 10)
          : null,
        materialCoefficients: JSON.stringify(
          (item.materialCoefficients ?? []).map((c) => ({
            materialCode: c.materialCode,
            description: c.description,
            coefficient: c.coefficient,
            unit: c.unit,
          })),
        ),
        status: item.status,
      };
    });

    const buffer = await this.excelService.buildExportBuffer(exportRows);
    return {
      filename: `boq-${projectId}.xlsx`,
      buffer,
    };
  }

  async downloadTemplate(): Promise<{ filename: string; buffer: Buffer }> {
    const buffer = await this.excelService.buildTemplateBuffer();
    return { filename: 'boq-import-template.xlsx', buffer };
  }

  // ── Internals ──────────────────────────────────────────────────────

  private async importRow(
    projectId: string,
    row: BoqExcelRow,
    actorId: string,
    versionId: string,
  ) {
    const block = await this.ensureBlock(
      projectId,
      row.blockCode,
      row.blockName,
      actorId,
    );
    const floor = await this.ensureFloor(
      block,
      row.floorCode,
      row.floorName,
      row.floorLevel,
      actorId,
    );
    const category = await this.ensureCategory(
      floor,
      row.categoryCode,
      row.categoryName,
      actorId,
    );

    const costs = this.resolveCosts({
      plannedQuantity: row.plannedQuantity,
      materialCost: row.materialCost,
      labourCost: row.labourCost,
      subcontractCost: row.subcontractCost,
      otherCost: row.otherCost,
      plannedRate: row.plannedRate ?? undefined,
      plannedValue: row.plannedValue ?? undefined,
    });

    const boqCode = row.boqCode
      ? normalizeCode(row.boqCode, 'boqCode')
      : await this.numberingService.nextCode(NumberEntityType.BOQ, {
          asOf: new Date(),
          projectId,
          projectScoped: true,
        });
    await this.assertUniqueBoqCode(versionId, boqCode);

    const startDate = this.parseOptionalDate(row.startDate, 'startDate');
    const endDate = this.parseOptionalDate(row.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    return this.itemModel.create({
      projectId: new Types.ObjectId(projectId),
      versionId: new Types.ObjectId(versionId),
      blockId: block._id,
      floorId: floor._id,
      workCategoryId: category._id,
      boqCode,
      description: row.description,
      unit: row.unit,
      plannedQuantity: costs.plannedQuantity,
      materialCost: costs.materialCost,
      labourCost: costs.labourCost,
      subcontractCost: costs.subcontractCost,
      otherCost: costs.otherCost,
      plannedRate: costs.plannedRate,
      plannedValue: costs.plannedValue,
      startDate,
      endDate,
      materialCoefficients: this.mapCoefficients(
        row.materialCoefficients.map((c) => ({
          materialCode: c.materialCode,
          description: c.description,
          coefficient: c.coefficient,
          unit: c.unit,
        })),
      ),
      status: row.status,
      notes: null,
      createdBy: new Types.ObjectId(actorId),
    });
  }

  private async ensureBlock(
    projectId: string,
    blockCode: string,
    name: string,
    actorId: string,
  ) {
    const code = normalizeCode(blockCode, 'blockCode');
    let block = await this.blockModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        blockCode: code,
      })
      .exec();
    if (!block) {
      block = await this.blockModel.create({
        projectId: new Types.ObjectId(projectId),
        blockCode: code,
        name: name.trim() || code,
        sortOrder: 0,
        status: BoqHierarchyStatus.Active,
        notes: null,
        createdBy: new Types.ObjectId(actorId),
      });
    }
    return block;
  }

  private async ensureFloor(
    block: BoqBlock & { _id: Types.ObjectId },
    floorCode: string,
    name: string,
    level: number,
    actorId: string,
  ) {
    const code = normalizeCode(floorCode, 'floorCode');
    let floor = await this.floorModel
      .findOne({ blockId: block._id, floorCode: code })
      .exec();
    if (!floor) {
      floor = await this.floorModel.create({
        projectId: block.projectId,
        blockId: block._id,
        floorCode: code,
        name: name.trim() || code,
        level,
        sortOrder: 0,
        status: BoqHierarchyStatus.Active,
        notes: null,
        createdBy: new Types.ObjectId(actorId),
      });
    }
    return floor;
  }

  private async ensureCategory(
    floor: BoqFloor & { _id: Types.ObjectId },
    categoryCode: string,
    name: string,
    actorId: string,
  ) {
    const code = normalizeCode(categoryCode, 'categoryCode');
    let category = await this.categoryModel
      .findOne({ floorId: floor._id, categoryCode: code })
      .exec();
    if (!category) {
      category = await this.categoryModel.create({
        projectId: floor.projectId,
        blockId: floor.blockId,
        floorId: floor._id,
        categoryCode: code,
        name: name.trim() || code,
        sortOrder: 0,
        status: BoqHierarchyStatus.Active,
        notes: null,
        createdBy: new Types.ObjectId(actorId),
      });
    }
    return category;
  }

  private resolveCosts(input: {
    plannedQuantity: number;
    materialCost?: number;
    labourCost?: number;
    subcontractCost?: number;
    otherCost?: number;
    plannedRate?: number;
    plannedValue?: number;
  }) {
    const materialCost = roundMoney(input.materialCost ?? 0);
    const labourCost = roundMoney(input.labourCost ?? 0);
    const subcontractCost = roundMoney(input.subcontractCost ?? 0);
    const otherCost = roundMoney(input.otherCost ?? 0);
    const plannedQuantity = roundQty(input.plannedQuantity);
    const expectedRate = computePlannedRate({
      materialCost,
      labourCost,
      subcontractCost,
      otherCost,
    });
    const plannedRate =
      input.plannedRate === undefined
        ? expectedRate
        : roundMoney(input.plannedRate);
    const plannedValue =
      input.plannedValue === undefined
        ? computePlannedValue(plannedQuantity, plannedRate)
        : roundMoney(input.plannedValue);

    assertBoqItemTotals({
      materialCost,
      labourCost,
      subcontractCost,
      otherCost,
      plannedQuantity,
      plannedRate,
      plannedValue,
    });

    return {
      materialCost,
      labourCost,
      subcontractCost,
      otherCost,
      plannedQuantity,
      plannedRate,
      plannedValue,
    };
  }

  private mapCoefficients(
    dtos?: BoqMaterialCoefficientDto[] | null,
  ): BoqMaterialCoefficient[] {
    if (!dtos?.length) return [];
    return dtos.map((dto) => ({
      materialId: dto.materialId
        ? new Types.ObjectId(dto.materialId)
        : null,
      materialCode: dto.materialCode?.trim().toUpperCase() || null,
      description: dto.description?.trim() || null,
      coefficient: roundQty(dto.coefficient),
      unit: dto.unit ?? null,
    }));
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireBlock(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid block id');
    }
    const row = await this.blockModel.findById(id).exec();
    if (!row) throw new NotFoundException('BOQ block not found');
    return row;
  }

  private async requireFloor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid floor id');
    }
    const row = await this.floorModel.findById(id).exec();
    if (!row) throw new NotFoundException('BOQ floor not found');
    return row;
  }

  private async requireCategory(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid work category id');
    }
    const row = await this.categoryModel.findById(id).exec();
    if (!row) throw new NotFoundException('BOQ work category not found');
    return row;
  }

  private async requireItem(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid BOQ item id');
    }
    const row = await this.itemModel.findById(id).exec();
    if (!row) throw new NotFoundException('BOQ item not found');
    return row;
  }

  private async assertUniqueBlockCode(projectId: string, blockCode: string) {
    const existing = await this.blockModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        blockCode,
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(`Block code already exists: ${blockCode}`);
    }
  }

  private async assertUniqueFloorCode(blockId: string, floorCode: string) {
    const existing = await this.floorModel
      .findOne({
        blockId: new Types.ObjectId(blockId),
        floorCode,
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(`Floor code already exists: ${floorCode}`);
    }
  }

  private async assertUniqueCategoryCode(
    floorId: string,
    categoryCode: string,
  ) {
    const existing = await this.categoryModel
      .findOne({
        floorId: new Types.ObjectId(floorId),
        categoryCode,
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Work category code already exists: ${categoryCode}`,
      );
    }
  }

  private async assertUniqueBoqCode(versionId: string, boqCode: string) {
    const existing = await this.itemModel
      .findOne({
        versionId: new Types.ObjectId(versionId),
        boqCode,
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(`BOQ code already exists: ${boqCode}`);
    }
  }

  private parseOptionalDate(
    value: string | null | undefined,
    field: string,
  ): Date | null {
    if (value == null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async activateVersionInternal(
    row: BoqVersionDocument,
    actorId: string,
    approvalReference: string | null,
  ) {
    row.totalPlannedValue = await this.sumVersionPlannedValue(String(row._id));
    if (row.basedOnVersionId) {
      const baseTotal = await this.sumVersionPlannedValue(
        String(row.basedOnVersionId),
      );
      row.costImpact = roundMoney(row.totalPlannedValue - baseTotal);
    }

    await this.versionModel.updateMany(
      {
        projectId: row.projectId,
        status: BoqVersionStatus.Active,
        _id: { $ne: row._id },
      },
      {
        $set: {
          status: BoqVersionStatus.Superseded,
          updatedBy: new Types.ObjectId(actorId),
        },
      },
    );

    row.status = BoqVersionStatus.Active;
    row.approvalReference = approvalReference;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
  }

  private async snapshotItemsFromVersion(
    fromVersionId: string,
    toVersionId: string,
    projectId: string,
    actorId: string,
  ): Promise<number> {
    const sourceItems = await this.itemModel
      .find({
        versionId: new Types.ObjectId(fromVersionId),
        status: { $ne: BoqItemStatus.Cancelled },
      })
      .lean()
      .exec();

    if (!sourceItems.length) return 0;

    const docs = sourceItems.map((item) => ({
      projectId: new Types.ObjectId(projectId),
      versionId: new Types.ObjectId(toVersionId),
      blockId: item.blockId,
      floorId: item.floorId,
      workCategoryId: item.workCategoryId,
      boqCode: item.boqCode,
      description: item.description,
      unit: item.unit,
      plannedQuantity: item.plannedQuantity,
      materialCost: item.materialCost,
      labourCost: item.labourCost,
      subcontractCost: item.subcontractCost,
      otherCost: item.otherCost,
      plannedRate: item.plannedRate,
      plannedValue: item.plannedValue,
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      materialCoefficients: (item.materialCoefficients ?? []).map((c) => ({
        materialId: c.materialId ?? null,
        materialCode: c.materialCode ?? null,
        description: c.description ?? null,
        coefficient: c.coefficient,
        unit: c.unit ?? null,
      })),
      status: BoqItemStatus.Draft,
      notes: item.notes ?? null,
      createdBy: new Types.ObjectId(actorId),
    }));

    await this.itemModel.insertMany(docs);
    return roundMoney(docs.reduce((s, d) => s + d.plannedValue, 0));
  }

  private async sumVersionPlannedValue(versionId: string): Promise<number> {
    const [agg] = await this.itemModel
      .aggregate<{ total: number }>([
        {
          $match: {
            versionId: new Types.ObjectId(versionId),
            status: { $ne: BoqItemStatus.Cancelled },
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: '$plannedValue' } } },
      ])
      .exec();
    return roundMoney(agg?.total ?? 0);
  }

  private async refreshVersionTotals(versionId: string): Promise<void> {
    const total = await this.sumVersionPlannedValue(versionId);
    const version = await this.versionModel.findById(versionId).exec();
    if (!version) return;
    version.totalPlannedValue = total;
    if (version.basedOnVersionId) {
      const baseTotal = await this.sumVersionPlannedValue(
        String(version.basedOnVersionId),
      );
      version.costImpact = roundMoney(total - baseTotal);
    }
    await version.save();
  }

  private async nextVersionNumber(projectId: string): Promise<number> {
    const latest = await this.versionModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .sort({ versionNumber: -1 })
      .lean()
      .exec();
    return (latest?.versionNumber ?? 0) + 1;
  }

  private async resolveEditableVersion(
    projectId: string,
    versionId: string | undefined,
    actorId: string,
  ) {
    if (versionId) {
      const version = await this.requireVersion(versionId);
      if (String(version.projectId) !== projectId) {
        throw new BadRequestException(
          'versionId does not belong to this project',
        );
      }
      assertBoqVersionEditable(version);
      return version;
    }

    const open = await this.versionModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        status: {
          $in: [BoqVersionStatus.Draft, BoqVersionStatus.Rejected],
        },
      })
      .exec();
    if (open) return open;

    const created = await this.createVersion(
      projectId,
      {
        versionType: BoqVersionType.Original,
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: 'Auto-created original BOQ version',
      },
      actorId,
    );
    return this.requireVersion(created.data!.id);
  }

  private async resolveDefaultVersion(projectId: string) {
    const active = await this.versionModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        status: BoqVersionStatus.Active,
      })
      .exec();
    if (active) return active;

    const draft = await this.versionModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        status: {
          $in: [
            BoqVersionStatus.Draft,
            BoqVersionStatus.PendingApproval,
            BoqVersionStatus.Rejected,
          ],
        },
      })
      .sort({ versionNumber: -1 })
      .exec();
    if (draft) return draft;

    throw new NotFoundException(
      'No BOQ version found for this project; create an Original version first',
    );
  }

  private async requireActiveVersion(projectId: string) {
    const row = await this.versionModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        status: BoqVersionStatus.Active,
      })
      .exec();
    if (!row) {
      throw new NotFoundException(
        'No active BOQ version; approve/activate a version first',
      );
    }
    return row;
  }

  private async requireVersion(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid BOQ version id');
    }
    const row = await this.versionModel.findById(id).exec();
    if (!row) throw new NotFoundException('BOQ version not found');
    return row;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }
}
