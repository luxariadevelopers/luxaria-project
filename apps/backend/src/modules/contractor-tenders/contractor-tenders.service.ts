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
import { SiteAccessService } from '../sites/site-access.service';
import type {
  AddNegotiationNoteDto,
  AwardTenderDto,
  CancelTenderDto,
  CreateContractorTenderDto,
  InviteContractorsDto,
  ListContractorTendersQueryDto,
  RecommendTenderDto,
  RecordBidDto,
  TenderCommercialBidLineDto,
} from './dto/contractor-tender.dto';
import {
  buildBidComparison,
  toPublicContractorTender,
} from './contractor-tenders.mapper';
import {
  ContractorTender,
  ContractorTenderStatus,
} from './schemas/contractor-tender.schema';

const OPEN_STATUSES = new Set<ContractorTenderStatus>([
  ContractorTenderStatus.Draft,
  ContractorTenderStatus.Invited,
  ContractorTenderStatus.Bidding,
  ContractorTenderStatus.UnderEvaluation,
]);

@Injectable()
export class ContractorTendersService {
  constructor(
    @InjectModel(ContractorTender.name)
    private readonly tenderModel: Model<ContractorTender>,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(dto: CreateContractorTenderDto, actorId: string) {
    await this.assertSiteAccess(actorId, dto.projectId, dto.siteId);

    const tenderNumber = await this.nextTenderNumber(dto.projectId);
    const row = await this.tenderModel.create({
      tenderNumber,
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      boqPackageIds: (dto.boqPackageIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      status: ContractorTenderStatus.Draft,
      invitedContractorIds: [],
      technicalBids: [],
      commercialBids: [],
      negotiationNotes: [],
      recommendation: null,
      awardedContractorId: null,
      awardedRateContractId: null,
      awardedAgreementId: null,
      invitationDate: null,
      bidDeadline: dto.bidDeadline ? new Date(dto.bidDeadline) : null,
      evaluationStartedAt: null,
      awardedAt: null,
      awardedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Contractor tender created',
    );
  }

  async invite(id: string, dto: InviteContractorsDto, actorId: string) {
    const row = await this.requireTender(id);
    if (
      row.status !== ContractorTenderStatus.Draft &&
      row.status !== ContractorTenderStatus.Invited
    ) {
      throw new BadRequestException(
        'Only draft or invited tenders can invite contractors',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    const existing = new Set(row.invitedContractorIds.map(String));
    for (const contractorId of dto.contractorIds) {
      existing.add(contractorId);
    }
    row.invitedContractorIds = [...existing].map(
      (cid) => new Types.ObjectId(cid),
    );
    if (dto.bidDeadline !== undefined) {
      row.bidDeadline = dto.bidDeadline ? new Date(dto.bidDeadline) : null;
    }
    if (!row.bidDeadline) {
      throw new BadRequestException(
        'bidDeadline is required before inviting contractors',
      );
    }
    if (row.invitedContractorIds.length === 0) {
      throw new BadRequestException('At least one contractor must be invited');
    }

    row.status = ContractorTenderStatus.Invited;
    row.invitationDate = row.invitationDate ?? new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Contractors invited',
    );
  }

  async recordBid(id: string, dto: RecordBidDto, actorId: string) {
    const row = await this.requireTender(id);
    if (
      row.status !== ContractorTenderStatus.Invited &&
      row.status !== ContractorTenderStatus.Bidding
    ) {
      throw new BadRequestException(
        'Bids can only be recorded while tender is invited or bidding',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    const invited = new Set(row.invitedContractorIds.map(String));
    if (!invited.has(dto.contractorId)) {
      throw new BadRequestException(
        'Contractor is not invited to this tender',
      );
    }
    if (!dto.technical && !dto.commercial) {
      throw new BadRequestException(
        'Provide technical and/or commercial bid payload',
      );
    }

    const now = new Date();
    const actorOid = new Types.ObjectId(actorId);
    const contractorOid = new Types.ObjectId(dto.contractorId);

    if (dto.technical) {
      const nextTech = {
        contractorId: contractorOid,
        complianceNotes: dto.technical.complianceNotes?.trim() ?? null,
        technicalScore: dto.technical.technicalScore ?? null,
        documentIds: (dto.technical.documentIds ?? []).map(
          (docId) => new Types.ObjectId(docId),
        ),
        submittedAt: now,
        recordedBy: actorOid,
      };
      const idx = row.technicalBids.findIndex(
        (b) => String(b.contractorId) === dto.contractorId,
      );
      if (idx >= 0) {
        row.technicalBids[idx] = {
          ...row.technicalBids[idx],
          ...nextTech,
          _id: row.technicalBids[idx]._id,
        };
      } else {
        row.technicalBids.push(nextTech as never);
      }
      row.markModified('technicalBids');
    }

    if (dto.commercial) {
      const lines = dto.commercial.lines.map((line) =>
        this.buildCommercialLine(line),
      );
      const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
      const nextCommercial = {
        contractorId: contractorOid,
        lines,
        totalAmount,
        validityDays: dto.commercial.validityDays ?? null,
        notes: dto.commercial.notes?.trim() ?? null,
        submittedAt: now,
        recordedBy: actorOid,
      };
      const idx = row.commercialBids.findIndex(
        (b) => String(b.contractorId) === dto.contractorId,
      );
      if (idx >= 0) {
        row.commercialBids[idx] = {
          ...row.commercialBids[idx],
          ...nextCommercial,
          _id: row.commercialBids[idx]._id,
        };
      } else {
        row.commercialBids.push(nextCommercial as never);
      }
      row.markModified('commercialBids');
    }

    row.status = ContractorTenderStatus.Bidding;
    row.set('updatedBy', actorOid);
    await row.save();

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Bid recorded',
    );
  }

  async compare(id: string, actorId: string) {
    const row = await this.requireTender(id);
    if (
      row.status !== ContractorTenderStatus.Bidding &&
      row.status !== ContractorTenderStatus.UnderEvaluation &&
      row.status !== ContractorTenderStatus.Awarded
    ) {
      throw new BadRequestException(
        'Compare is available after at least one bid is recorded',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    if (row.status === ContractorTenderStatus.Bidding) {
      if (row.commercialBids.length === 0 && row.technicalBids.length === 0) {
        throw new BadRequestException('No bids available to compare');
      }
      row.status = ContractorTenderStatus.UnderEvaluation;
      row.evaluationStartedAt = row.evaluationStartedAt ?? new Date();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
    }

    return createSuccessResponse(
      {
        tender: toPublicContractorTender(row),
        comparison: buildBidComparison(row),
      },
      'Bid comparison ready',
    );
  }

  async recommend(id: string, dto: RecommendTenderDto, actorId: string) {
    const row = await this.requireTender(id);
    if (row.status !== ContractorTenderStatus.UnderEvaluation) {
      throw new BadRequestException(
        'Recommendation requires under_evaluation status',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    const invited = new Set(row.invitedContractorIds.map(String));
    if (!invited.has(dto.recommendedContractorId)) {
      throw new BadRequestException(
        'Recommended contractor must be invited to the tender',
      );
    }

    row.recommendation = {
      recommendedContractorId: new Types.ObjectId(dto.recommendedContractorId),
      rationale: dto.rationale.trim(),
      recommendedBy: new Types.ObjectId(actorId),
      recommendedAt: new Date(),
    };
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Recommendation recorded',
    );
  }

  async award(id: string, dto: AwardTenderDto, actorId: string) {
    const row = await this.requireTender(id);
    if (row.status !== ContractorTenderStatus.UnderEvaluation) {
      throw new BadRequestException(
        'Only under_evaluation tenders can be awarded',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    const invited = new Set(row.invitedContractorIds.map(String));
    if (!invited.has(dto.awardedContractorId)) {
      throw new BadRequestException(
        'Awarded contractor must be invited to the tender',
      );
    }

    row.status = ContractorTenderStatus.Awarded;
    row.awardedContractorId = new Types.ObjectId(dto.awardedContractorId);
    row.awardedRateContractId = dto.awardedRateContractId
      ? new Types.ObjectId(dto.awardedRateContractId)
      : null;
    row.awardedAgreementId = dto.awardedAgreementId
      ? new Types.ObjectId(dto.awardedAgreementId)
      : null;
    row.awardedAt = new Date();
    row.awardedBy = new Types.ObjectId(actorId);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Tender awarded',
    );
  }

  async cancel(id: string, dto: CancelTenderDto, actorId: string) {
    const row = await this.requireTender(id);
    if (!OPEN_STATUSES.has(row.status)) {
      throw new BadRequestException(
        'Only open tenders (not awarded/cancelled) can be cancelled',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    row.status = ContractorTenderStatus.Cancelled;
    row.cancelledAt = new Date();
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancellationReason = dto.reason?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Tender cancelled',
    );
  }

  async addNegotiationNote(
    id: string,
    dto: AddNegotiationNoteDto,
    actorId: string,
  ) {
    const row = await this.requireTender(id);
    if (
      row.status === ContractorTenderStatus.Cancelled ||
      row.status === ContractorTenderStatus.Draft
    ) {
      throw new BadRequestException(
        'Negotiation notes are not allowed on draft or cancelled tenders',
      );
    }
    await this.assertSiteAccessForRow(actorId, row);

    row.negotiationNotes.push({
      note: dto.note.trim(),
      createdBy: new Types.ObjectId(actorId),
      createdAt: new Date(),
    });
    row.markModified('negotiationNotes');
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorTender(row),
      'Negotiation note added',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireTender(id);
    await this.assertSiteAccessForRow(actorId, row);
    return createSuccessResponse(
      toPublicContractorTender(row),
      'Contractor tender fetched',
    );
  }

  async list(query: ListContractorTendersQueryDto, actorId: string) {
    if (query.siteId && query.projectId) {
      await this.assertSiteAccess(actorId, query.projectId, query.siteId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorTender> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.status) filter.status = query.status;
    if (query.awardedContractorId) {
      filter.awardedContractorId = new Types.ObjectId(query.awardedContractorId);
    }

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.tenderModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.tenderModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicContractorTender(row)),
      'Contractor tenders fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private buildCommercialLine(line: TenderCommercialBidLineDto) {
    const quantity = line.quantity;
    const rate = line.rate;
    return {
      boqItemId: line.boqItemId ? new Types.ObjectId(line.boqItemId) : null,
      boqCode: line.boqCode?.trim() ?? null,
      description: line.description.trim(),
      unit: line.unit,
      quantity,
      rate,
      amount: quantity * rate,
    };
  }

  private async nextTenderNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.tenderModel
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `TND-${year}-${seq}`;
  }

  private async assertSiteAccess(
    userId: string,
    projectId: string,
    siteId?: string | null,
  ) {
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId,
      projectId,
      siteId: siteId ?? null,
    });
  }

  private async assertSiteAccessForRow(
    userId: string,
    row: { projectId: Types.ObjectId | string; siteId?: Types.ObjectId | string | null },
  ) {
    await this.assertSiteAccess(
      userId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
  }

  private async requireTender(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contractor tender id');
    }
    const row = await this.tenderModel.findById(id).exec();
    if (!row) throw new NotFoundException('Contractor tender not found');
    return row;
  }
}
