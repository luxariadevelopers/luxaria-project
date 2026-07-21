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
import { toPublicContractorRecovery } from './contractor-recoveries.mapper';
import type {
  CreateContractorRecoveryDto,
  ListContractorRecoveriesQueryDto,
  PostContractorRecoveryDto,
  UpdateContractorRecoveryDto,
} from './dto/contractor-recovery.dto';
import {
  ContractorRecovery,
  ContractorRecoveryStatus,
} from './schemas/contractor-recovery.schema';

@Injectable()
export class ContractorRecoveriesService {
  constructor(
    @InjectModel(ContractorRecovery.name)
    private readonly model: Model<ContractorRecovery>,
  ) {}

  async create(dto: CreateContractorRecoveryDto, actorId: string) {
    const row = await this.model.create({
      projectId: new Types.ObjectId(dto.projectId),
      contractorId: new Types.ObjectId(dto.contractorId),
      workOrderId: dto.workOrderId
        ? new Types.ObjectId(dto.workOrderId)
        : null,
      type: dto.type,
      amount: dto.amount,
      description: dto.description?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
      billId: dto.billId ? new Types.ObjectId(dto.billId) : null,
      materialReconciliationId: dto.materialReconciliationId
        ? new Types.ObjectId(dto.materialReconciliationId)
        : null,
      status: ContractorRecoveryStatus.Draft,
      approvedBy: null,
      approvedAt: null,
      postedBy: null,
      postedAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorRecovery(row),
      'Contractor recovery created',
    );
  }

  async update(id: string, dto: UpdateContractorRecoveryDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== ContractorRecoveryStatus.Draft) {
      throw new BadRequestException('Only draft recoveries can be updated');
    }

    if (dto.workOrderId !== undefined) {
      row.workOrderId = dto.workOrderId
        ? new Types.ObjectId(dto.workOrderId)
        : null;
    }
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.amount !== undefined) row.amount = dto.amount;
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;
    if (dto.billId !== undefined) {
      row.billId = dto.billId ? new Types.ObjectId(dto.billId) : null;
    }
    if (dto.materialReconciliationId !== undefined) {
      row.materialReconciliationId = dto.materialReconciliationId
        ? new Types.ObjectId(dto.materialReconciliationId)
        : null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRecovery(row),
      'Contractor recovery updated',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== ContractorRecoveryStatus.Draft) {
      throw new BadRequestException('Only draft recoveries can be approved');
    }
    row.status = ContractorRecoveryStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorRecovery(row),
      'Contractor recovery approved',
    );
  }

  async post(id: string, dto: PostContractorRecoveryDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== ContractorRecoveryStatus.Approved) {
      throw new BadRequestException('Only approved recoveries can be posted');
    }
    if (dto.billId !== undefined) {
      row.billId = dto.billId ? new Types.ObjectId(dto.billId) : null;
    }
    row.status = ContractorRecoveryStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorRecovery(row),
      'Contractor recovery posted',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicContractorRecovery(row),
      'Contractor recovery fetched',
    );
  }

  async list(query: ListContractorRecoveriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorRecovery> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.billId) filter.billId = new Types.ObjectId(query.billId);
    if (query.type) filter.type = query.type;
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
      items.map((row) => toPublicContractorRecovery(row)),
      'Contractor recoveries fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contractor recovery id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Contractor recovery not found');
    return row;
  }
}
