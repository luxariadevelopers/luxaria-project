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
import { convertToBaseUnit } from '../material-master/materials.validation';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import type {
  AttachMaterialIssueSignaturesDto,
  CreateMaterialIssueDto,
  CreateMaterialReturnDto,
  ListMaterialIssuesQueryDto,
  MaterialIssueItemDto,
  UpdateMaterialIssueDto,
} from './dto/material-issue.dto';
import { toPublicMaterialIssue } from './material-issues.mapper';
import {
  assertBoqItemId,
  assertPositiveQuantity,
  assertRecipientSignaturePresent,
  assertReturnWithinIssued,
  assertWorkLocation,
  normalizeLocation,
  roundQty,
} from './material-issues.validation';
import {
  MaterialIssue,
  MaterialIssueItem,
  MaterialIssueStatus,
  MaterialReturnItem,
} from './schemas/material-issue.schema';

@Injectable()
export class MaterialIssuesService {
  constructor(
    @InjectModel(MaterialIssue.name)
    private readonly issueModel: Model<MaterialIssue>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  async create(dto: CreateMaterialIssueDto, actorId: string) {
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    if (!Types.ObjectId.isValid(dto.receivedBy)) {
      throw new BadRequestException('Invalid receivedBy');
    }

    const issuedBy = dto.issuedBy ?? actorId;
    if (!Types.ObjectId.isValid(issuedBy)) {
      throw new BadRequestException('Invalid issuedBy');
    }

    const issueDate = new Date(dto.issueDate);
    if (Number.isNaN(issueDate.getTime())) {
      throw new BadRequestException('Invalid issueDate');
    }

    const workLocation = assertWorkLocation(dto.workLocation);
    const boqItemId = assertBoqItemId(dto.boqItemId);
    if (!Types.ObjectId.isValid(boqItemId)) {
      throw new BadRequestException('Invalid boqItemId');
    }

    const storeLocation = normalizeLocation(dto.storeLocation);
    const items = await this.buildItems(dto.items);

    const issueNumber = await this.numberingService.nextCode(
      NumberEntityType.MATERIAL_ISSUE,
      {
        asOf: issueDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.issueModel.create({
      issueNumber,
      projectId: new Types.ObjectId(dto.projectId),
      issueDate,
      issuedBy: new Types.ObjectId(issuedBy),
      receivedBy: new Types.ObjectId(dto.receivedBy),
      contractorId: dto.contractorId
        ? new Types.ObjectId(dto.contractorId)
        : null,
      blockId: dto.blockId ? new Types.ObjectId(dto.blockId) : null,
      floorId: dto.floorId?.trim() || null,
      boqItemId: new Types.ObjectId(boqItemId),
      workLocation,
      storeLocation,
      items,
      signatures: {
        recipientSignatureDocumentId: null,
        recipientSignatureChecksum: null,
        issuerSignatureDocumentId: null,
        issuerSignatureChecksum: null,
        recipientSignedAt: null,
      },
      status: MaterialIssueStatus.Draft,
      returns: [],
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material issue created as draft',
    );
  }

  async update(id: string, dto: UpdateMaterialIssueDto, actorId: string) {
    const row = await this.requireIssue(id);
    if (row.status !== MaterialIssueStatus.Draft) {
      throw new BadRequestException('Only draft material issues can be updated');
    }

    if (dto.issueDate) {
      const issueDate = new Date(dto.issueDate);
      if (Number.isNaN(issueDate.getTime())) {
        throw new BadRequestException('Invalid issueDate');
      }
      row.issueDate = issueDate;
    }
    if (dto.receivedBy !== undefined) {
      if (!Types.ObjectId.isValid(dto.receivedBy)) {
        throw new BadRequestException('Invalid receivedBy');
      }
      row.receivedBy = new Types.ObjectId(dto.receivedBy);
    }
    if (dto.contractorId !== undefined) {
      row.contractorId = dto.contractorId
        ? new Types.ObjectId(dto.contractorId)
        : null;
    }
    if (dto.blockId !== undefined) {
      row.blockId = dto.blockId ? new Types.ObjectId(dto.blockId) : null;
    }
    if (dto.floorId !== undefined) {
      row.floorId = dto.floorId?.trim() || null;
    }
    if (dto.boqItemId !== undefined) {
      const boqItemId = assertBoqItemId(dto.boqItemId);
      if (!Types.ObjectId.isValid(boqItemId)) {
        throw new BadRequestException('Invalid boqItemId');
      }
      row.boqItemId = new Types.ObjectId(boqItemId);
    }
    if (dto.workLocation !== undefined) {
      row.workLocation = assertWorkLocation(dto.workLocation);
    }
    if (dto.storeLocation !== undefined) {
      row.storeLocation = normalizeLocation(dto.storeLocation);
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }
    if (dto.items) {
      row.items = await this.buildItems(dto.items);
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material issue updated',
    );
  }

  async attachSignatures(
    id: string,
    dto: AttachMaterialIssueSignaturesDto,
    actorId: string,
  ) {
    const row = await this.requireIssue(id);
    if (
      row.status !== MaterialIssueStatus.Draft &&
      row.status !== MaterialIssueStatus.Submitted
    ) {
      throw new BadRequestException(
        'Signatures can only be attached before confirmation',
      );
    }

    if (
      dto.issuerSignatureDocumentId &&
      !dto.issuerSignatureChecksum?.trim()
    ) {
      throw new BadRequestException(
        'issuerSignatureChecksum is required when issuerSignatureDocumentId is provided',
      );
    }

    row.signatures = {
      recipientSignatureDocumentId: new Types.ObjectId(
        dto.recipientSignatureDocumentId,
      ),
      recipientSignatureChecksum: dto.recipientSignatureChecksum.toLowerCase(),
      issuerSignatureDocumentId: dto.issuerSignatureDocumentId
        ? new Types.ObjectId(dto.issuerSignatureDocumentId)
        : (row.signatures?.issuerSignatureDocumentId ?? null),
      issuerSignatureChecksum: dto.issuerSignatureChecksum
        ? dto.issuerSignatureChecksum.toLowerCase()
        : (row.signatures?.issuerSignatureChecksum ?? null),
      recipientSignedAt: new Date(),
    };

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Recipient signature captured',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireIssue(id);
    if (row.status !== MaterialIssueStatus.Draft) {
      throw new BadRequestException(
        'Only draft material issues can be submitted',
      );
    }
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }

    assertWorkLocation(row.workLocation);
    assertBoqItemId(String(row.boqItemId));
    assertRecipientSignaturePresent(row.signatures);
    await this.assertAvailableStock(row);

    row.status = MaterialIssueStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material issue submitted',
    );
  }

  /**
   * Confirmation posts MaterialIssue ledger rows and reduces stock.
   */
  async confirm(id: string, actorId: string) {
    const row = await this.requireIssue(id);
    if (row.status !== MaterialIssueStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted material issues can be confirmed',
      );
    }

    assertRecipientSignaturePresent(row.signatures);
    await this.assertAvailableStock(row);

    for (const item of row.items) {
      const entry = await this.stockLedgerService.postEntry({
        projectId: String(row.projectId),
        materialId: String(item.materialId),
        transactionType: StockTransactionType.MaterialIssue,
        quantityIn: 0,
        quantityOut: item.quantity,
        unit: item.unit,
        referenceType: 'material_issue',
        referenceId: String(row._id),
        transactionDate: row.issueDate,
        location: row.storeLocation || null,
        batch: item.batch,
        notes: `Issue ${row.issueNumber} → ${row.workLocation}`,
        allowNegative: false,
        actorId,
      });
      item.stockLedgerEntryId = entry._id as Types.ObjectId;
    }

    row.status = MaterialIssueStatus.Confirmed;
    row.confirmedBy = new Types.ObjectId(actorId);
    row.confirmedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material issue confirmed; stock reduced',
    );
  }

  async createReturn(
    id: string,
    dto: CreateMaterialReturnDto,
    actorId: string,
  ) {
    const row = await this.requireIssue(id);
    if (row.status !== MaterialIssueStatus.Confirmed) {
      throw new BadRequestException(
        'Material returns are only allowed on confirmed issues',
      );
    }

    const returnedBy = dto.returnedBy ?? actorId;
    if (!Types.ObjectId.isValid(returnedBy)) {
      throw new BadRequestException('Invalid returnedBy');
    }

    const returnDate = new Date(dto.returnDate);
    if (Number.isNaN(returnDate.getTime())) {
      throw new BadRequestException('Invalid returnDate');
    }

    const returnItems: MaterialReturnItem[] = [];
    const issueItemByMaterial = new Map(
      row.items.map((item) => [String(item.materialId), item]),
    );

    for (const dtoItem of dto.items) {
      assertPositiveQuantity(dtoItem.quantity);
      const issueItem = issueItemByMaterial.get(dtoItem.materialId);
      if (!issueItem) {
        throw new BadRequestException(
          `Material ${dtoItem.materialId} was not part of this issue`,
        );
      }

      const material = await this.requireActiveMaterial(dtoItem.materialId);
      const baseUnitQuantity = roundQty(
        convertToBaseUnit(
          dtoItem.quantity,
          dtoItem.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        ),
      );

      assertReturnWithinIssued({
        materialCode: issueItem.materialCode,
        issuedBase: issueItem.baseUnitQuantity,
        alreadyReturnedBase: issueItem.returnedBaseQuantity ?? 0,
        returnBase: baseUnitQuantity,
      });

      const entry = await this.stockLedgerService.postEntry({
        projectId: String(row.projectId),
        materialId: dtoItem.materialId,
        transactionType: StockTransactionType.ReturnFromWork,
        quantityIn: dtoItem.quantity,
        quantityOut: 0,
        unit: dtoItem.unit,
        referenceType: 'material_return',
        referenceId: String(row._id),
        transactionDate: returnDate,
        location: row.storeLocation || null,
        notes: `Return against ${row.issueNumber}`,
        allowNegative: false,
        actorId,
      });

      issueItem.returnedBaseQuantity = roundQty(
        (issueItem.returnedBaseQuantity ?? 0) + baseUnitQuantity,
      );

      returnItems.push({
        materialId: material._id as Types.ObjectId,
        unit: dtoItem.unit,
        quantity: roundQty(dtoItem.quantity),
        baseUnitQuantity,
        reason: dtoItem.reason?.trim() ?? null,
        stockLedgerEntryId: entry._id as Types.ObjectId,
      });
    }

    const returnNumber = await this.numberingService.nextCode(
      NumberEntityType.MATERIAL_RETURN,
      {
        asOf: returnDate,
        projectId: String(row.projectId),
        projectScoped: true,
      },
    );

    row.returns.push({
      returnNumber,
      returnDate,
      returnedBy: new Types.ObjectId(returnedBy),
      items: returnItems,
      notes: dto.notes?.trim() ?? null,
      postedAt: new Date(),
    });

    row.markModified('items');
    row.markModified('returns');
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material return posted; stock increased',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireIssue(id);
    if (
      row.status !== MaterialIssueStatus.Draft &&
      row.status !== MaterialIssueStatus.Submitted
    ) {
      throw new BadRequestException(
        'Only draft or submitted material issues can be cancelled',
      );
    }

    row.status = MaterialIssueStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material issue cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireIssue(id);
    return createSuccessResponse(
      toPublicMaterialIssue(row),
      'Material issue fetched successfully',
    );
  }

  async list(query: ListMaterialIssuesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<MaterialIssue> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.boqItemId) {
      filter.boqItemId = new Types.ObjectId(query.boqItemId);
    }
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const sort: Record<string, SortOrder> = { issueDate: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.issueModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.issueModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicMaterialIssue(row)),
      'Material issues fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async buildItems(
    dtos: MaterialIssueItemDto[],
  ): Promise<MaterialIssueItem[]> {
    const seen = new Set<string>();
    const items: MaterialIssueItem[] = [];

    for (const dto of dtos) {
      assertPositiveQuantity(dto.quantity);
      if (seen.has(dto.materialId)) {
        throw new BadRequestException(
          `Duplicate materialId in issue items: ${dto.materialId}`,
        );
      }
      seen.add(dto.materialId);

      const material = await this.requireActiveMaterial(dto.materialId);
      const baseUnitQuantity = roundQty(
        convertToBaseUnit(
          dto.quantity,
          dto.unit,
          material.baseUnit,
          material.conversionFactors ?? [],
        ),
      );

      items.push({
        materialId: material._id as Types.ObjectId,
        materialCode: material.materialCode,
        materialName: material.name,
        unit: dto.unit,
        quantity: roundQty(dto.quantity),
        baseUnit: material.baseUnit,
        baseUnitQuantity,
        returnedBaseQuantity: 0,
        batch: dto.batch?.trim() ?? null,
        notes: dto.notes?.trim() ?? null,
        stockLedgerEntryId: null,
      });
    }

    return items;
  }

  private async assertAvailableStock(row: MaterialIssue): Promise<void> {
    for (const item of row.items) {
      const available = await this.stockLedgerService.getQuantityInBaseUnit({
        materialId: String(item.materialId),
        projectId: String(row.projectId),
        location: row.storeLocation,
      });
      if (item.baseUnitQuantity - available > 1e-9) {
        throw new BadRequestException(
          `Insufficient stock for ${item.materialCode ?? item.materialId}: available ${available}, requested ${item.baseUnitQuantity}`,
        );
      }
    }
  }

  private async requireActiveMaterial(materialId: string) {
    if (!Types.ObjectId.isValid(materialId)) {
      throw new BadRequestException('Invalid materialId');
    }
    const material = await this.materialModel.findById(materialId).exec();
    if (!material || material.status !== MaterialStatus.Active) {
      throw new NotFoundException(`Active material not found: ${materialId}`);
    }
    return material;
  }

  private async requireIssue(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid material issue id');
    }
    const row = await this.issueModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Material issue not found');
    }
    return row;
  }
}
