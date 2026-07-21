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
import { ContractorBillsService } from '../contractor-bills/contractor-bills.service';
import {
  ContractorRecovery,
  ContractorRecoveryStatus,
  ContractorRecoveryType,
} from '../contractor-recoveries/schemas/contractor-recovery.schema';
import type {
  CreateMaterialReconciliationDto,
  ListMaterialReconciliationsQueryDto,
  PostMaterialReconciliationToBillDto,
  UpdateMaterialReconciliationDto,
} from './dto/material-reconciliation.dto';
import { toPublicMaterialReconciliation } from './material-reconciliation.mapper';
import { computeMaterialReconciliationMetrics } from './material-reconciliation.validation';
import {
  ContractorMaterialReconciliation,
  ContractorMaterialReconciliationStatus,
} from './schemas/contractor-material-reconciliation.schema';

@Injectable()
export class MaterialReconciliationService {
  constructor(
    @InjectModel(ContractorMaterialReconciliation.name)
    private readonly model: Model<ContractorMaterialReconciliation>,
    @InjectModel(ContractorRecovery.name)
    private readonly recoveryModel: Model<ContractorRecovery>,
    private readonly billsService: ContractorBillsService,
  ) {}

  async create(dto: CreateMaterialReconciliationDto, actorId: string) {
    this.assertPeriod(dto.period.from, dto.period.to);
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: dto.issuedQuantity,
      theoreticalConsumption: dto.theoreticalConsumption,
      approvedWastage: dto.approvedWastage,
      returnedQuantity: dto.returnedQuantity,
      unitRate: dto.unitRate ?? 0,
    });

    const row = await this.model.create({
      projectId: new Types.ObjectId(dto.projectId),
      contractorId: new Types.ObjectId(dto.contractorId),
      workOrderId: dto.workOrderId
        ? new Types.ObjectId(dto.workOrderId)
        : null,
      materialId: new Types.ObjectId(dto.materialId),
      period: {
        from: new Date(dto.period.from),
        to: new Date(dto.period.to),
      },
      ...metrics,
      status: ContractorMaterialReconciliationStatus.Draft,
      billId: null,
      recoveryId: null,
      notes: dto.notes?.trim() ?? null,
      approvedBy: null,
      approvedAt: null,
      postedBy: null,
      postedAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMaterialReconciliation(row),
      'Material reconciliation created',
    );
  }

  async update(
    id: string,
    dto: UpdateMaterialReconciliationDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== ContractorMaterialReconciliationStatus.Draft) {
      throw new BadRequestException(
        'Only draft reconciliations can be updated',
      );
    }

    if (dto.workOrderId !== undefined) {
      row.workOrderId = dto.workOrderId
        ? new Types.ObjectId(dto.workOrderId)
        : null;
    }
    if (dto.period !== undefined) {
      this.assertPeriod(dto.period.from, dto.period.to);
      row.period = {
        from: new Date(dto.period.from),
        to: new Date(dto.period.to),
      };
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: dto.issuedQuantity ?? row.issuedQuantity,
      theoreticalConsumption:
        dto.theoreticalConsumption ?? row.theoreticalConsumption,
      approvedWastage: dto.approvedWastage ?? row.approvedWastage,
      returnedQuantity: dto.returnedQuantity ?? row.returnedQuantity,
      unitRate: dto.unitRate ?? row.unitRate,
    });
    Object.assign(row, metrics);

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicMaterialReconciliation(row),
      'Material reconciliation updated',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== ContractorMaterialReconciliationStatus.Draft) {
      throw new BadRequestException(
        'Only draft reconciliations can be approved',
      );
    }

    // Recompute before lock-in.
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: row.issuedQuantity,
      theoreticalConsumption: row.theoreticalConsumption,
      approvedWastage: row.approvedWastage,
      returnedQuantity: row.returnedQuantity,
      unitRate: row.unitRate,
    });
    Object.assign(row, metrics);

    if (metrics.recoveryAmount > 0 && !row.recoveryId) {
      const recovery = await this.recoveryModel.create({
        projectId: row.projectId,
        contractorId: row.contractorId,
        workOrderId: row.workOrderId,
        type: ContractorRecoveryType.Material,
        amount: metrics.recoveryAmount,
        description: `Material reconciliation recovery (${metrics.recoverableDifference} units)`,
        notes: row.notes,
        billId: null,
        materialReconciliationId: row._id,
        status: ContractorRecoveryStatus.Approved,
        approvedBy: new Types.ObjectId(actorId),
        approvedAt: new Date(),
        postedBy: null,
        postedAt: null,
        createdBy: new Types.ObjectId(actorId),
      });
      row.recoveryId = recovery._id as Types.ObjectId;
    }

    row.status = ContractorMaterialReconciliationStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialReconciliation(row),
      'Material reconciliation approved',
    );
  }

  async postToBill(
    id: string,
    dto: PostMaterialReconciliationToBillDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== ContractorMaterialReconciliationStatus.Approved) {
      throw new BadRequestException(
        'Only approved reconciliations can be posted to a bill',
      );
    }

    const billRes = await this.billsService.getById(dto.billId, actorId);
    const bill = billRes.data!;
    if (String(bill.projectId) !== String(row.projectId)) {
      throw new BadRequestException(
        'Bill projectId does not match reconciliation project',
      );
    }
    if (String(bill.contractorId) !== String(row.contractorId)) {
      throw new BadRequestException(
        'Bill contractorId does not match reconciliation contractor',
      );
    }

    const recoveryAmount = Number(row.recoveryAmount ?? 0);
    if (recoveryAmount > 0) {
      const nextMaterialRecovery =
        Number(bill.materialRecovery ?? 0) + recoveryAmount;
      await this.billsService.update(
        dto.billId,
        { materialRecovery: nextMaterialRecovery },
        actorId,
      );
    }

    row.billId = new Types.ObjectId(dto.billId);
    row.status = ContractorMaterialReconciliationStatus.PostedToBill;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    if (row.recoveryId) {
      await this.recoveryModel
        .updateOne(
          { _id: row.recoveryId },
          {
            $set: {
              billId: row.billId,
              status: ContractorRecoveryStatus.Posted,
              postedBy: new Types.ObjectId(actorId),
              postedAt: new Date(),
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    return createSuccessResponse(
      toPublicMaterialReconciliation(row),
      'Material reconciliation posted to bill',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicMaterialReconciliation(row),
      'Material reconciliation fetched',
    );
  }

  async list(query: ListMaterialReconciliationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorMaterialReconciliation> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.materialId) {
      filter.materialId = new Types.ObjectId(query.materialId);
    }
    if (query.workOrderId) {
      filter.workOrderId = new Types.ObjectId(query.workOrderId);
    }
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { createdAt: -1 };
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicMaterialReconciliation(row)),
      'Material reconciliations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private assertPeriod(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid period dates');
    }
    if (fromDate > toDate) {
      throw new BadRequestException('period.from must be on or before period.to');
    }
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid material reconciliation id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Material reconciliation not found');
    }
    return row;
  }
}
