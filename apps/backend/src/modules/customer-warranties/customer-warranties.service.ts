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
import { toPublicCustomerWarranty } from './customer-warranties.mapper';
import type {
  AddCompletionPhotoDto,
  AddMaterialUsageDto,
  AssignCustomerWarrantyDto,
  CreateCustomerWarrantyDto,
  ListCustomerWarrantyQueryDto,
  TransitionCustomerWarrantyDto,
  UpdateCustomerWarrantyDto,
} from './dto/customer-warranty.dto';
import {
  CustomerWarranty,
  WarrantyStatus,
} from './schemas/customer-warranty.schema';

const TERMINAL: WarrantyStatus[] = [
  WarrantyStatus.Closed,
  WarrantyStatus.Rejected,
];

const ALLOWED_TRANSITIONS: Record<WarrantyStatus, WarrantyStatus[]> = {
  [WarrantyStatus.Complaint]: [
    WarrantyStatus.Inspection,
    WarrantyStatus.Rejected,
  ],
  [WarrantyStatus.Inspection]: [
    WarrantyStatus.Assigned,
    WarrantyStatus.Rejected,
  ],
  [WarrantyStatus.Assigned]: [
    WarrantyStatus.Rectified,
    WarrantyStatus.Rejected,
  ],
  [WarrantyStatus.Rectified]: [
    WarrantyStatus.Verified,
    WarrantyStatus.Rejected,
  ],
  [WarrantyStatus.Verified]: [WarrantyStatus.Closed],
  [WarrantyStatus.Closed]: [],
  [WarrantyStatus.Rejected]: [],
};

@Injectable()
export class CustomerWarrantiesService {
  constructor(
    @InjectModel(CustomerWarranty.name)
    private readonly model: Model<CustomerWarranty>,
  ) {}

  async create(dto: CreateCustomerWarrantyDto, actorId: string) {
    const ticketNumber = await this.nextNumber(dto.projectId);
    const row = await this.model.create({
      ticketNumber,
      projectId: new Types.ObjectId(dto.projectId),
      bookingId: new Types.ObjectId(dto.bookingId),
      customerId: new Types.ObjectId(dto.customerId),
      unitId: new Types.ObjectId(dto.unitId),
      handoverId: dto.handoverId
        ? new Types.ObjectId(dto.handoverId)
        : null,
      category: dto.category,
      description: dto.description.trim(),
      slaDueAt: dto.slaDueAt ? new Date(dto.slaDueAt) : null,
      status: WarrantyStatus.Complaint,
      assignedContractorId: null,
      assignedUserId: null,
      materialUsage: [],
      completionPhotos: [],
      inspectionNotes: null,
      rectificationNotes: null,
      verificationNotes: null,
      raisedAt: dto.raisedAt ? new Date(dto.raisedAt) : new Date(),
      closedAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Warranty ticket created',
    );
  }

  async update(id: string, dto: UpdateCustomerWarrantyDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== WarrantyStatus.Complaint) {
      throw new BadRequestException(
        'Only complaint-stage tickets can be updated',
      );
    }

    if (dto.handoverId !== undefined) {
      row.handoverId = dto.handoverId
        ? new Types.ObjectId(dto.handoverId)
        : null;
    }
    if (dto.category !== undefined) row.category = dto.category;
    if (dto.description !== undefined) {
      row.description = dto.description.trim();
    }
    if (dto.slaDueAt !== undefined) {
      row.slaDueAt = dto.slaDueAt ? new Date(dto.slaDueAt) : null;
    }
    if (dto.raisedAt !== undefined) {
      row.raisedAt = dto.raisedAt ? new Date(dto.raisedAt) : row.raisedAt;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Warranty ticket updated',
    );
  }

  async transition(
    id: string,
    dto: TransitionCustomerWarrantyDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (TERMINAL.includes(row.status)) {
      throw new BadRequestException(`Ticket is already ${row.status}`);
    }

    const allowed = ALLOWED_TRANSITIONS[row.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${row.status} to ${dto.status}`,
      );
    }

    if (
      dto.status === WarrantyStatus.Assigned &&
      !row.assignedContractorId &&
      !row.assignedUserId
    ) {
      throw new BadRequestException(
        'Assign a contractor or user before moving to assigned',
      );
    }

    row.status = dto.status;
    if (
      dto.status === WarrantyStatus.Closed ||
      dto.status === WarrantyStatus.Rejected
    ) {
      row.closedAt = new Date();
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Warranty status updated',
    );
  }

  async assign(id: string, dto: AssignCustomerWarrantyDto, actorId: string) {
    const row = await this.requireRow(id);
    if (TERMINAL.includes(row.status)) {
      throw new BadRequestException('Cannot assign a closed ticket');
    }
    if (!dto.assignedContractorId && !dto.assignedUserId) {
      throw new BadRequestException(
        'Provide assignedContractorId or assignedUserId',
      );
    }

    if (dto.assignedContractorId !== undefined) {
      row.assignedContractorId = dto.assignedContractorId
        ? new Types.ObjectId(dto.assignedContractorId)
        : null;
    }
    if (dto.assignedUserId !== undefined) {
      row.assignedUserId = dto.assignedUserId
        ? new Types.ObjectId(dto.assignedUserId)
        : null;
    }

    if (
      row.status === WarrantyStatus.Inspection &&
      (row.assignedContractorId || row.assignedUserId)
    ) {
      row.status = WarrantyStatus.Assigned;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Warranty ticket assigned',
    );
  }

  async addMaterial(id: string, dto: AddMaterialUsageDto, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== WarrantyStatus.Assigned &&
      row.status !== WarrantyStatus.Rectified
    ) {
      throw new BadRequestException(
        'Material can only be added during assigned or rectified stages',
      );
    }

    row.materialUsage.push({
      materialName: dto.materialName.trim(),
      quantity: dto.quantity,
      unit: dto.unit?.trim() ?? null,
    });

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Material usage added',
    );
  }

  async addPhoto(id: string, dto: AddCompletionPhotoDto, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== WarrantyStatus.Rectified &&
      row.status !== WarrantyStatus.Verified
    ) {
      throw new BadRequestException(
        'Photos can only be added during rectified or verified stages',
      );
    }

    row.completionPhotos.push({
      filePath: dto.filePath.trim(),
      caption: dto.caption?.trim() ?? null,
    });

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Completion photo added',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicCustomerWarranty(row),
      'Warranty ticket fetched',
    );
  }

  async list(query: ListCustomerWarrantyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CustomerWarranty> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.unitId) filter.unitId = new Types.ObjectId(query.unitId);
    if (query.handoverId) {
      filter.handoverId = new Types.ObjectId(query.handoverId);
    }
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.assignedContractorId) {
      filter.assignedContractorId = new Types.ObjectId(
        query.assignedContractorId,
      );
    }
    if (query.assignedUserId) {
      filter.assignedUserId = new Types.ObjectId(query.assignedUserId);
    }

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

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
      items.map((row) => toPublicCustomerWarranty(row)),
      'Warranty tickets fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `WR-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid warranty ticket id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Warranty ticket not found');
    return row;
  }
}
