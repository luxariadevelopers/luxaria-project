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
  Customer,
  CustomerFundingType,
  CustomerStatus,
} from '../customers/schemas/customer.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import type {
  AddLeadAttachmentDto,
  AddLeadFollowUpDto,
  AddLeadTaskDto,
  ConvertLeadDto,
  CreateLeadDto,
  ListLeadsQueryDto,
  TransitionLeadDto,
  UpdateLeadDto,
  UpdateLeadTaskDto,
} from './dto/lead.dto';
import { toPublicLead } from './leads.mapper';
import {
  LEAD_HAPPY_PATH,
  Lead,
  LeadStatus,
  LeadTaskStatus,
  TERMINAL_LEAD_STATUSES,
} from './schemas/lead.schema';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private readonly model: Model<Lead>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreateLeadDto, actorId: string) {
    this.assertBudgetRange(dto.budgetMin, dto.budgetMax);

    const leadNumber = await this.nextLeadNumber(dto.companyId ?? null);
    const row = await this.model.create({
      leadNumber,
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : null,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      source: dto.source,
      campaignName: dto.campaignName?.trim() ?? null,
      status: LeadStatus.New,
      contact: {
        fullName: dto.contact.fullName.trim(),
        email: dto.contact.email?.trim().toLowerCase() ?? null,
        phone: dto.contact.phone?.trim() ?? null,
        alternatePhone: dto.contact.alternatePhone?.trim() ?? null,
      },
      familyDetails: dto.familyDetails?.trim() ?? null,
      budgetMin: dto.budgetMin ?? null,
      budgetMax: dto.budgetMax ?? null,
      preferredLocation: dto.preferredLocation?.trim() ?? null,
      unitPreference: dto.unitPreference?.trim() ?? null,
      fundingSource: dto.fundingSource?.trim() ?? null,
      loanRequired: dto.loanRequired ?? false,
      assignedTo: dto.assignedTo ? new Types.ObjectId(dto.assignedTo) : null,
      convertedCustomerId: null,
      lostReason: null,
      notes: dto.notes?.trim() ?? null,
      followUps: [],
      tasks: [],
      attachments: [],
      siteVisitAt: null,
      wonAt: null,
      lostAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicLead(row), 'Lead created');
  }

  async update(id: string, dto: UpdateLeadDto, actorId: string) {
    const row = await this.requireRow(id);
    this.assertEditable(row);

    if (dto.budgetMin !== undefined || dto.budgetMax !== undefined) {
      this.assertBudgetRange(
        dto.budgetMin ?? row.budgetMin,
        dto.budgetMax ?? row.budgetMax,
      );
    }

    if (dto.companyId !== undefined) {
      row.companyId = dto.companyId ? new Types.ObjectId(dto.companyId) : null;
    }
    if (dto.projectId !== undefined) {
      row.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.source !== undefined) row.source = dto.source;
    if (dto.campaignName !== undefined) {
      row.campaignName = dto.campaignName?.trim() ?? null;
    }
    if (dto.contact !== undefined) {
      row.contact = {
        fullName: dto.contact.fullName.trim(),
        email: dto.contact.email?.trim().toLowerCase() ?? null,
        phone: dto.contact.phone?.trim() ?? null,
        alternatePhone: dto.contact.alternatePhone?.trim() ?? null,
      };
    }
    if (dto.familyDetails !== undefined) {
      row.familyDetails = dto.familyDetails?.trim() ?? null;
    }
    if (dto.budgetMin !== undefined) row.budgetMin = dto.budgetMin ?? null;
    if (dto.budgetMax !== undefined) row.budgetMax = dto.budgetMax ?? null;
    if (dto.preferredLocation !== undefined) {
      row.preferredLocation = dto.preferredLocation?.trim() ?? null;
    }
    if (dto.unitPreference !== undefined) {
      row.unitPreference = dto.unitPreference?.trim() ?? null;
    }
    if (dto.fundingSource !== undefined) {
      row.fundingSource = dto.fundingSource?.trim() ?? null;
    }
    if (dto.loanRequired !== undefined) row.loanRequired = dto.loanRequired;
    if (dto.assignedTo !== undefined) {
      row.assignedTo = dto.assignedTo
        ? new Types.ObjectId(dto.assignedTo)
        : null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicLead(row), 'Lead updated');
  }

  async transition(id: string, dto: TransitionLeadDto, actorId: string) {
    const row = await this.requireRow(id);
    this.assertTransitionAllowed(row.status, dto.status, dto.lostReason);

    const now = new Date();
    row.status = dto.status;

    if (dto.status === LeadStatus.Lost) {
      row.lostReason = dto.lostReason?.trim() ?? null;
      row.lostAt = now;
    } else {
      row.lostReason = null;
      row.lostAt = null;
    }

    if (dto.status === LeadStatus.Won) {
      row.wonAt = now;
    } else if (dto.status !== LeadStatus.Lost) {
      row.wonAt = null;
    }

    if (dto.status === LeadStatus.SiteVisit) {
      row.siteVisitAt = now;
    }

    if (dto.note?.trim()) {
      row.followUps.push({
        at: now,
        note: dto.note.trim(),
        by: new Types.ObjectId(actorId),
        nextFollowUpAt: null,
      });
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicLead(row), 'Lead status updated');
  }

  async addFollowUp(id: string, dto: AddLeadFollowUpDto, actorId: string) {
    const row = await this.requireRow(id);
    if (TERMINAL_LEAD_STATUSES.includes(row.status)) {
      throw new BadRequestException('Cannot add follow-ups to a closed lead');
    }

    row.followUps.push({
      at: new Date(dto.at),
      note: dto.note.trim(),
      by: new Types.ObjectId(actorId),
      nextFollowUpAt: dto.nextFollowUpAt
        ? new Date(dto.nextFollowUpAt)
        : null,
    });
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicLead(row), 'Follow-up added');
  }

  async addTask(id: string, dto: AddLeadTaskDto, actorId: string) {
    const row = await this.requireRow(id);
    if (TERMINAL_LEAD_STATUSES.includes(row.status)) {
      throw new BadRequestException('Cannot add tasks to a closed lead');
    }

    row.tasks.push({
      title: dto.title.trim(),
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      completedAt: null,
      completedBy: null,
      status: LeadTaskStatus.Open,
    });
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicLead(row), 'Task added');
  }

  async updateTask(
    id: string,
    taskId: string,
    dto: UpdateLeadTaskDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    const task = row.tasks.find((item) => String(item._id) === taskId);
    if (!task) throw new NotFoundException('Lead task not found');

    task.status = dto.status;
    if (dto.status === LeadTaskStatus.Done) {
      task.completedAt = new Date();
      task.completedBy = new Types.ObjectId(actorId);
    } else {
      task.completedAt = null;
      task.completedBy = null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicLead(row), 'Task updated');
  }

  async convert(id: string, dto: ConvertLeadDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status === LeadStatus.Won) {
      throw new BadRequestException('Lead is already won');
    }
    if (row.status === LeadStatus.Lost) {
      throw new BadRequestException('Cannot convert a lost lead');
    }

    let customerId: Types.ObjectId;
    if (dto.customerId) {
      if (!Types.ObjectId.isValid(dto.customerId)) {
        throw new BadRequestException('Invalid customerId');
      }
      const customer = await this.customerModel.findById(dto.customerId).exec();
      if (!customer) throw new NotFoundException('Customer not found');
      customerId = customer._id as Types.ObjectId;
    } else {
      customerId = await this.createCustomerFromLead(row, actorId);
    }

    const now = new Date();
    row.status = LeadStatus.Won;
    row.convertedCustomerId = customerId;
    row.wonAt = now;
    row.lostReason = null;
    row.lostAt = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicLead(row),
      'Lead converted to customer',
    );
  }

  async addAttachment(
    id: string,
    dto: AddLeadAttachmentDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    row.attachments.push({
      fileName: dto.fileName.trim(),
      filePath: dto.filePath.trim(),
      mimeType: dto.mimeType.trim(),
      sizeBytes: dto.sizeBytes,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(actorId),
    });
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicLead(row), 'Attachment added');
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(toPublicLead(row), 'Lead fetched');
  }

  async list(query: ListLeadsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<Lead> = {};

    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.assignedTo) {
      filter.assignedTo = new Types.ObjectId(query.assignedTo);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { 'contact.fullName': regex },
        { 'contact.phone': regex },
        { 'contact.alternatePhone': regex },
        { 'contact.email': regex },
      ];
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
      items.map((row) => toPublicLead(row)),
      'Leads fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────

  assertTransitionAllowed(
    current: LeadStatus,
    target: LeadStatus,
    lostReason?: string | null,
  ) {
    if (TERMINAL_LEAD_STATUSES.includes(current)) {
      throw new BadRequestException(
        `Cannot transition from terminal status ${current}`,
      );
    }
    if (current === target) {
      throw new BadRequestException('Lead is already in the requested status');
    }

    if (target === LeadStatus.Lost) {
      if (!lostReason?.trim()) {
        throw new BadRequestException('lostReason is required when marking lost');
      }
      return;
    }

    if (target === LeadStatus.Won) {
      if (
        current !== LeadStatus.Negotiation &&
        current !== LeadStatus.Proposal
      ) {
        throw new BadRequestException(
          'Lead can only be marked won from proposal or negotiation',
        );
      }
      return;
    }

    const currentIdx = LEAD_HAPPY_PATH.indexOf(current);
    const targetIdx = LEAD_HAPPY_PATH.indexOf(target);
    if (currentIdx < 0 || targetIdx < 0 || targetIdx !== currentIdx + 1) {
      throw new BadRequestException(
        `Invalid transition from ${current} to ${target}`,
      );
    }
  }

  private assertEditable(row: Lead) {
    if (TERMINAL_LEAD_STATUSES.includes(row.status)) {
      throw new BadRequestException('Closed leads cannot be updated');
    }
  }

  private assertBudgetRange(
    budgetMin?: number | null,
    budgetMax?: number | null,
  ) {
    if (
      budgetMin != null &&
      budgetMax != null &&
      Number.isFinite(budgetMin) &&
      Number.isFinite(budgetMax) &&
      budgetMin > budgetMax
    ) {
      throw new BadRequestException('budgetMin cannot exceed budgetMax');
    }
  }

  private async createCustomerFromLead(row: Lead, actorId: string) {
    const customerCode = await this.numberingService.nextCode(
      NumberEntityType.CUSTOMER,
    );
    const fundingType = row.loanRequired
      ? CustomerFundingType.BankLoan
      : CustomerFundingType.OwnFunds;

    const customer = await this.customerModel.create({
      companyId: row.companyId,
      customerCode,
      fullName: row.contact.fullName,
      contact: {
        email: row.contact.email,
        phone: row.contact.phone,
        alternatePhone: row.contact.alternatePhone,
      },
      fundingType,
      loanBank: row.loanRequired ? row.fundingSource : null,
      status: CustomerStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
    });

    return customer._id as Types.ObjectId;
  }

  private async nextLeadNumber(companyId: string | null): Promise<string> {
    const year = new Date().getFullYear();
    const filter: FilterQuery<Lead> = companyId
      ? { companyId: new Types.ObjectId(companyId) }
      : {};
    const count = await this.model
      .countDocuments(filter)
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `LD-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lead id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Lead not found');
    return row;
  }
}
