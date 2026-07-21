import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { MaterialStockTransaction } from '../material-master/schemas/material-stock-transaction.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import { Project } from '../projects/schemas/project.schema';
import { SiteAccessService } from '../sites/site-access.service';
import { SitesService } from '../sites/sites.service';
import type {
  ApprovePurchaseRequestDto,
  CreatePurchaseRequestDto,
  ListPurchaseRequestsQueryDto,
  PurchaseRequestItemInputDto,
  RejectPurchaseRequestDto,
  ReturnPurchaseRequestDto,
  ReviewPurchaseRequestDto,
  UpdatePurchaseRequestDto,
} from './dto/purchase-request.dto';
import { toPublicPurchaseRequest } from './purchase-requests.mapper';
import {
  assertApprovedQuantity,
  assertMaterialUnitAllowed,
  assertRequestedQuantity,
  buildQuantityWarnings,
  convertBaseToUnit,
} from './purchase-requests.validation';
import {
  PurchaseRequest,
  PurchaseRequestLineStatus,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
  type PurchaseRequestItem,
} from './schemas/purchase-request.schema';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    @InjectModel(PurchaseRequest.name)
    private readonly requestModel: Model<PurchaseRequest>,
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly stockTxnModel: Model<MaterialStockTransaction>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly numberingService: NumberingService,
    private readonly projectScope: ProjectScopedDataHelper,
    private readonly sitesService: SitesService,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(dto: CreatePurchaseRequestDto, actorId: string) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'purchase-request' },
    );
    await this.requireProject(dto.projectId);
    const siteId = await this.resolveSiteForProject(
      dto.siteId,
      dto.projectId,
      'siteId',
    );
    const warehouseSiteId = await this.resolveSiteForProject(
      dto.warehouseSiteId,
      dto.projectId,
      'warehouseSiteId',
    );
    if (siteId) {
      await this.siteAccessService.assertSiteAccessIfScoped({
        userId: actorId,
        projectId: dto.projectId,
        siteId: String(siteId),
      });
    }
    const requiredByDate = this.assertRequiredByDate(dto.requiredByDate);
    const built = await this.buildItems(dto.items, dto.projectId);

    const requestNumber = await this.numberingService.nextCode(
      NumberEntityType.PURCHASE_REQUEST,
      {
        asOf: requiredByDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.requestModel.create({
      requestNumber,
      projectId: new Types.ObjectId(dto.projectId),
      siteId,
      warehouseSiteId,
      sourceReorderAlertId: dto.sourceReorderAlertId
        ? new Types.ObjectId(dto.sourceReorderAlertId)
        : null,
      requestedBy: new Types.ObjectId(actorId),
      requiredByDate,
      priority: dto.priority ?? PurchaseRequestPriority.Normal,
      items: built.items,
      justification: dto.justification.trim(),
      status: PurchaseRequestStatus.Draft,
      warnings: built.headerWarnings,
      isPartiallyApproved: false,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request created as draft',
    );
  }

  async update(id: string, dto: UpdatePurchaseRequestDto, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    this.assertEditable(row);

    if (dto.projectId && dto.projectId !== String(row.projectId)) {
      await this.requireProject(dto.projectId);
      row.projectId = new Types.ObjectId(dto.projectId);
    }
    const projectId = String(row.projectId);
    if (dto.siteId !== undefined) {
      row.siteId = await this.resolveSiteForProject(
        dto.siteId,
        projectId,
        'siteId',
      );
      if (row.siteId) {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: actorId,
          projectId,
          siteId: String(row.siteId),
        });
      }
    }
    if (dto.warehouseSiteId !== undefined) {
      row.warehouseSiteId = await this.resolveSiteForProject(
        dto.warehouseSiteId,
        projectId,
        'warehouseSiteId',
      );
    }
    if (dto.sourceReorderAlertId !== undefined) {
      row.sourceReorderAlertId = dto.sourceReorderAlertId
        ? new Types.ObjectId(dto.sourceReorderAlertId)
        : null;
    }
    if (dto.requiredByDate !== undefined) {
      row.requiredByDate = this.assertRequiredByDate(dto.requiredByDate);
    }
    if (dto.priority !== undefined) row.priority = dto.priority;
    if (dto.justification !== undefined) {
      row.justification = dto.justification.trim();
    }
    if (dto.items !== undefined) {
      const built = await this.buildItems(dto.items, projectId);
      row.items = built.items as PurchaseRequestItem[];
      row.warnings = built.headerWarnings;
      row.isPartiallyApproved = false;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    if (row.status === PurchaseRequestStatus.Returned) {
      row.status = PurchaseRequestStatus.Draft;
      row.rejectionReason = null;
    }
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request updated',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'read');
    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request fetched',
    );
  }

  async list(query: ListPurchaseRequestsQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'purchase-request' },
      );
    }
    let filter: FilterQuery<PurchaseRequest> = {};
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.requestedBy) {
      filter.requestedBy = new Types.ObjectId(query.requestedBy);
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { requestNumber: { $regex: search, $options: 'i' } },
        { justification: { $regex: search, $options: 'i' } },
      ];
    }

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.requestModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicPurchaseRequest(item)),
      'Purchase requests fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (
      row.status !== PurchaseRequestStatus.Draft &&
      row.status !== PurchaseRequestStatus.Returned
    ) {
      throw new BadRequestException(
        'Only draft or returned requests can be submitted',
      );
    }
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }

    // Refresh stock snapshots + warnings at submit time (preserve line ids)
    const refreshed = await this.refreshItemSnapshotsInPlace(
      row,
      String(row.projectId),
    );
    row.warnings = refreshed.headerWarnings;
    row.status = PurchaseRequestStatus.Submitted;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request submitted for review',
    );
  }

  async review(id: string, dto: ReviewPurchaseRequestDto, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (row.status !== PurchaseRequestStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted requests can be marked reviewed',
      );
    }

    row.status = PurchaseRequestStatus.Reviewed;
    row.reviewedBy = new Types.ObjectId(actorId);
    row.reviewedAt = new Date();
    row.reviewNotes = dto.notes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request reviewed; approval required next',
    );
  }

  /**
   * Partial approval supported: each line gets approvedQuantity (0..requested).
   * Header becomes Approved when at least one line has approvedQuantity > 0.
   */
  async approve(id: string, dto: ApprovePurchaseRequestDto, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (row.status !== PurchaseRequestStatus.Reviewed) {
      throw new BadRequestException(
        'Approval required after review — only reviewed requests can be approved',
      );
    }

    const byId = new Map(
      row.items.map((item) => [String(item._id), item]),
    );
    const seen = new Set<string>();

    for (const decision of dto.items) {
      if (seen.has(decision.lineId)) {
        throw new BadRequestException(`Duplicate lineId ${decision.lineId}`);
      }
      seen.add(decision.lineId);
      const line = byId.get(decision.lineId);
      if (!line) {
        throw new BadRequestException(`Unknown lineId ${decision.lineId}`);
      }
      assertApprovedQuantity(decision.approvedQuantity, line.requestedQuantity);
      line.approvedQuantity = decision.approvedQuantity;
      if (decision.approvedQuantity <= 0) {
        line.lineStatus = PurchaseRequestLineStatus.Rejected;
      } else if (
        decision.approvedQuantity + 1e-9 < line.requestedQuantity
      ) {
        line.lineStatus = PurchaseRequestLineStatus.PartiallyApproved;
      } else {
        line.lineStatus = PurchaseRequestLineStatus.Approved;
      }
    }

    // Lines not included in the payload are treated as rejected (0)
    for (const line of row.items) {
      const lineId = String(line._id);
      if (!seen.has(lineId)) {
        line.approvedQuantity = 0;
        line.lineStatus = PurchaseRequestLineStatus.Rejected;
      }
    }

    const approvedLines = row.items.filter(
      (l) => (l.approvedQuantity ?? 0) > 0,
    );
    if (approvedLines.length === 0) {
      throw new BadRequestException(
        'Approval requires at least one line with approvedQuantity > 0; use reject instead',
      );
    }

    const isPartial = row.items.some(
      (l) =>
        l.lineStatus === PurchaseRequestLineStatus.PartiallyApproved ||
        l.lineStatus === PurchaseRequestLineStatus.Rejected,
    );

    row.status = PurchaseRequestStatus.Approved;
    row.isPartiallyApproved = isPartial;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.approvalNotes = dto.notes?.trim() || null;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      isPartial
        ? 'Purchase request partially approved'
        : 'Purchase request fully approved',
    );
  }

  async reject(id: string, dto: RejectPurchaseRequestDto, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (
      row.status !== PurchaseRequestStatus.Submitted &&
      row.status !== PurchaseRequestStatus.Reviewed
    ) {
      throw new BadRequestException(
        'Only submitted or reviewed requests can be rejected',
      );
    }

    row.status = PurchaseRequestStatus.Rejected;
    row.rejectionReason = dto.reason.trim();
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.isPartiallyApproved = false;
    for (const line of row.items) {
      line.approvedQuantity = 0;
      line.lineStatus = PurchaseRequestLineStatus.Rejected;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request rejected',
    );
  }

  async returnForCorrection(
    id: string,
    dto: ReturnPurchaseRequestDto,
    actorId: string,
  ) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (
      row.status !== PurchaseRequestStatus.Submitted &&
      row.status !== PurchaseRequestStatus.Reviewed
    ) {
      throw new BadRequestException(
        'Only submitted or reviewed requests can be returned',
      );
    }

    row.status = PurchaseRequestStatus.Returned;
    row.reviewNotes = dto.notes?.trim() || null;
    row.reviewedBy = new Types.ObjectId(actorId);
    row.reviewedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request returned for correction',
    );
  }

  async startSourcing(id: string, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (row.status !== PurchaseRequestStatus.Approved) {
      throw new BadRequestException(
        'Only approved requests can move to sourcing',
      );
    }
    row.status = PurchaseRequestStatus.Sourcing;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request moved to sourcing',
    );
  }

  async close(id: string, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (
      row.status !== PurchaseRequestStatus.Sourcing &&
      row.status !== PurchaseRequestStatus.Approved
    ) {
      throw new BadRequestException(
        'Only approved or sourcing requests can be closed',
      );
    }
    row.status = PurchaseRequestStatus.Closed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request closed',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRequest(id, actorId, 'update');
    if (
      row.status === PurchaseRequestStatus.Closed ||
      row.status === PurchaseRequestStatus.Cancelled
    ) {
      throw new BadRequestException('Request is already closed/cancelled');
    }
    if (
      row.status === PurchaseRequestStatus.Sourcing ||
      row.status === PurchaseRequestStatus.Approved
    ) {
      throw new BadRequestException(
        'Approved/sourcing requests cannot be cancelled; close instead',
      );
    }
    row.status = PurchaseRequestStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseRequest(row),
      'Purchase request cancelled',
    );
  }

  private async buildItems(
    inputs: PurchaseRequestItemInputDto[],
    projectId: string,
  ) {
    if (!inputs.length) {
      throw new BadRequestException('At least one item is required');
    }

    const items = [];
    const headerWarnings: string[] = [];

    for (const input of inputs) {
      const material = await this.requireActiveMaterial(input.materialId);
      assertRequestedQuantity(input.requestedQuantity);
      assertMaterialUnitAllowed(input.unit, material);

      const currentStockInBase = await this.getCurrentStockInBase(
        input.materialId,
        projectId,
      );
      const currentStock = convertBaseToUnit(
        currentStockInBase,
        input.unit,
        material.baseUnit,
        material.conversionFactors ?? [],
      );
      const reorderLevel = convertBaseToUnit(
        material.reorderLevel ?? 0,
        input.unit,
        material.baseUnit,
        material.conversionFactors ?? [],
      );
      const minimumStock = convertBaseToUnit(
        material.minimumStock ?? 0,
        input.unit,
        material.baseUnit,
        material.conversionFactors ?? [],
      );
      const maximumStock = convertBaseToUnit(
        material.maximumStock ?? 0,
        input.unit,
        material.baseUnit,
        material.conversionFactors ?? [],
      );

      const warnings = buildQuantityWarnings({
        requestedQuantity: input.requestedQuantity,
        unit: input.unit,
        baseUnit: material.baseUnit,
        conversionFactors: material.conversionFactors ?? [],
        currentStockInBase,
        reorderLevel: material.reorderLevel ?? 0,
        minimumStock: material.minimumStock ?? 0,
        maximumStock: material.maximumStock ?? 0,
      });

      headerWarnings.push(
        ...warnings.map(
          (w) => `${material.materialCode ?? material.name}: ${w}`,
        ),
      );

      items.push({
        materialId: material._id,
        materialCode: material.materialCode,
        materialName: material.name,
        requestedQuantity: input.requestedQuantity,
        unit: input.unit,
        currentStock: roundQty(currentStock),
        reorderLevel: roundQty(reorderLevel),
        minimumStock: roundQty(minimumStock),
        maximumStock: roundQty(maximumStock),
        estimatedRate: input.estimatedRate ?? material.standardRate ?? null,
        boqItemId: input.boqItemId
          ? new Types.ObjectId(input.boqItemId)
          : null,
        remarks: input.remarks?.trim() || null,
        approvedQuantity: null,
        lineStatus: PurchaseRequestLineStatus.Pending,
        warnings,
      });
    }

    return {
      items,
      headerWarnings: [...new Set(headerWarnings)],
    };
  }

  private async refreshItemSnapshotsInPlace(
    row: PurchaseRequest,
    projectId: string,
  ) {
    const headerWarnings: string[] = [];

    for (const item of row.items) {
      const material = await this.requireActiveMaterial(String(item.materialId));
      assertMaterialUnitAllowed(item.unit, material);

      const currentStockInBase = await this.getCurrentStockInBase(
        String(item.materialId),
        projectId,
      );
      item.currentStock = roundQty(
        convertBaseToUnit(
          currentStockInBase,
          item.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        ),
      );
      item.reorderLevel = roundQty(
        convertBaseToUnit(
          material.reorderLevel ?? 0,
          item.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        ),
      );
      item.minimumStock = roundQty(
        convertBaseToUnit(
          material.minimumStock ?? 0,
          item.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        ),
      );
      item.maximumStock = roundQty(
        convertBaseToUnit(
          material.maximumStock ?? 0,
          item.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        ),
      );
      item.materialCode = material.materialCode;
      item.materialName = material.name;

      const warnings = buildQuantityWarnings({
        requestedQuantity: item.requestedQuantity,
        unit: item.unit,
        baseUnit: material.baseUnit,
        conversionFactors: material.conversionFactors ?? [],
        currentStockInBase,
        reorderLevel: material.reorderLevel ?? 0,
        minimumStock: material.minimumStock ?? 0,
        maximumStock: material.maximumStock ?? 0,
      });
      item.warnings = warnings;
      headerWarnings.push(
        ...warnings.map(
          (w) => `${material.materialCode ?? material.name}: ${w}`,
        ),
      );
    }

    return { headerWarnings: [...new Set(headerWarnings)] };
  }

  private async getCurrentStockInBase(
    materialId: string,
    projectId?: string,
  ): Promise<number> {
    const match: Record<string, unknown> = {
      materialId: new Types.ObjectId(materialId),
    };
    if (projectId && Types.ObjectId.isValid(projectId)) {
      match.$or = [
        { projectId: new Types.ObjectId(projectId) },
        { projectId: null },
      ];
    }

    const [agg] = await this.stockTxnModel
      .aggregate<{ total: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: '$quantityInBaseUnit' },
          },
        },
      ])
      .exec();

    return roundQty(agg?.total ?? 0);
  }

  private assertEditable(row: PurchaseRequest) {
    if (
      row.status !== PurchaseRequestStatus.Draft &&
      row.status !== PurchaseRequestStatus.Returned
    ) {
      throw new BadRequestException(
        'Only draft or returned purchase requests can be edited',
      );
    }
  }

  private assertRequiredByDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid requiredByDate');
    }
    return date;
  }

  private async requireRequest(
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase request id');
    }
    const row = await this.requestModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Purchase request not found');
    }

    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        String(row.projectId),
        action,
        { resourceType: 'purchase-request', resourceId: id },
      );
    }
    return row;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  /**
   * Validates optional site belongs to the given project.
   */
  private async resolveSiteForProject(
    siteId: string | null | undefined,
    projectId: string,
    fieldName: string,
  ): Promise<Types.ObjectId | null> {
    if (siteId === undefined || siteId === null || siteId === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(siteId)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    const site = await this.sitesService.findById(siteId);
    if (!site) {
      throw new BadRequestException(`${fieldName} site not found`);
    }
    if (String(site.projectId) !== projectId) {
      throw new BadRequestException(
        `${fieldName} does not belong to the purchase request project`,
      );
    }
    return site._id as Types.ObjectId;
  }

  private async requireActiveMaterial(materialId: string) {
    if (!Types.ObjectId.isValid(materialId)) {
      throw new BadRequestException('Invalid materialId');
    }
    const material = await this.materialModel.findById(materialId).exec();
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    if (material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material is inactive');
    }
    return material;
  }
}

function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}
