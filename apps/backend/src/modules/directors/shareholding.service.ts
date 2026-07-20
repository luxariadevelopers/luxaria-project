import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { Company } from '../company/schemas/company.schema';
import type { ApproveShareholdingDto } from './dto/approve-shareholding.dto';
import type { ProposeShareholdingDto } from './dto/propose-shareholding.dto';
import type { RejectShareholdingDto } from './dto/reject-shareholding.dto';
import type {
  PublicShareholding,
  PublicShareholdingChangeRequest,
} from './directors.mapper';
import { DirectorsService } from './directors.service';
import { CompanyShareholding } from './schemas/company-shareholding.schema';
import { DirectorFile } from './schemas/director-document.schema';
import { Director, DirectorStatus } from './schemas/director.schema';
import {
  ShareholdingChangeRequest,
  ShareholdingChangeStatus,
} from './schemas/shareholding-change-request.schema';
import { assertShareholdingTotals100 } from './shareholding.validation';

/**
 * Company equity shareholding service.
 * Intentionally separate from project investment modules.
 */
@Injectable()
export class ShareholdingService {
  constructor(
    @InjectModel(CompanyShareholding.name)
    private readonly shareholdingModel: Model<CompanyShareholding>,
    @InjectModel(ShareholdingChangeRequest.name)
    private readonly changeRequestModel: Model<ShareholdingChangeRequest>,
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(DirectorFile.name) private readonly documentModel: Model<DirectorFile>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly directorsService: DirectorsService,
  ) {}

  async listActive(companyId?: string | null) {
    const resolvedCompanyId = await this.resolveCompanyId(companyId);
    const items = await this.shareholdingModel
      .find({
        companyId: resolvedCompanyId,
        effectiveTo: null,
      })
      .sort({ percentage: -1 })
      .exec();

    const totalPercentage = items.reduce((sum, row) => sum + row.percentage, 0);

    return createSuccessResponse(
      {
        holdings: items.map((item) => this.toPublicHolding(item)),
        totalPercentage,
        isBalanced: Math.abs(totalPercentage - 100) < 0.0001,
        note: 'Company shareholding only — not project investment',
      },
      'Active company shareholding fetched successfully',
    );
  }

  async listHistory(
    query: {
      page?: number;
      limit?: number;
      companyId?: string | null;
      directorId?: string;
    },
  ) {
    const resolvedCompanyId = await this.resolveCompanyId(query.companyId);
    const filter: FilterQuery<CompanyShareholding> = {
      companyId: resolvedCompanyId,
    };
    if (query.directorId) {
      filter.directorId = new Types.ObjectId(query.directorId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.shareholdingModel
        .find(filter)
        .sort({ version: -1, effectiveFrom: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.shareholdingModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublicHolding(item)),
      'Company shareholding history fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async propose(dto: ProposeShareholdingDto, actorId: string) {
    const companyId = await this.resolveCompanyId(dto.companyId);
    assertShareholdingTotals100(dto.proposedHoldings);

    const pending = await this.changeRequestModel
      .findOne({
        companyId,
        status: ShareholdingChangeStatus.Pending,
      })
      .exec();
    if (pending) {
      throw new ConflictException(
        'A pending shareholding change request already exists for this company',
      );
    }

    for (const line of dto.proposedHoldings) {
      await this.directorsService.requireDirector(line.directorId);
      const director = await this.directorModel.findById(line.directorId).exec();
      if (director?.status !== DirectorStatus.Active) {
        throw new BadRequestException(
          `Director ${line.directorId} must be active to hold company shares`,
        );
      }
      if (line.documentId) {
        const doc = await this.documentModel.findById(line.documentId).lean().exec();
        if (!doc || String(doc.directorId) !== line.directorId) {
          throw new BadRequestException(
            `documentId ${line.documentId} is invalid for director ${line.directorId}`,
          );
        }
      }
    }

    const request = await this.changeRequestModel.create({
      companyId,
      reason: dto.reason.trim(),
      approvalReference: dto.approvalReference?.trim() ?? null,
      proposedHoldings: dto.proposedHoldings.map((line) => ({
        directorId: new Types.ObjectId(line.directorId),
        numberOfShares: line.numberOfShares,
        faceValue: line.faceValue,
        percentage: line.percentage,
        documentId: line.documentId ? new Types.ObjectId(line.documentId) : null,
      })),
      status: ShareholdingChangeStatus.Pending,
      requestedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      this.toPublicChangeRequest(request),
      'Shareholding change proposed; awaiting approval',
    );
  }

  /**
   * Approves a proposal: closes active rows (effectiveTo) and inserts a new version.
   * Previous shareholding rows are never overwritten.
   */
  async approve(
    requestId: string,
    dto: ApproveShareholdingDto,
    actorId: string,
  ) {
    const request = await this.requireChangeRequest(requestId);
    if (request.status !== ShareholdingChangeStatus.Pending) {
      throw new BadRequestException('Change request is not pending');
    }
    if (String(request.requestedBy) === actorId) {
      throw new ForbiddenException(
        'Approver cannot be the same user who proposed the shareholding change',
      );
    }

    assertShareholdingTotals100(
      request.proposedHoldings.map((line) => ({
        directorId: String(line.directorId),
        numberOfShares: line.numberOfShares,
        faceValue: line.faceValue,
        percentage: line.percentage,
      })),
    );

    const effectiveFrom = new Date();
    const nextVersion = await this.nextVersion(request.companyId);

    const active = await this.shareholdingModel
      .find({
        companyId: request.companyId,
        effectiveTo: null,
      })
      .exec();

    // Close current versions — do not mutate share counts / percentages on those rows
    for (const row of active) {
      await this.shareholdingModel
        .updateOne(
          { _id: row._id },
          {
            $set: {
              effectiveTo: effectiveFrom,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    const approvalReference =
      dto.approvalReference?.trim() ?? request.approvalReference ?? null;

    await this.shareholdingModel.insertMany(
      request.proposedHoldings.map((line) => ({
        companyId: request.companyId,
        directorId: line.directorId,
        effectiveFrom,
        effectiveTo: null,
        numberOfShares: line.numberOfShares,
        faceValue: line.faceValue,
        percentage: line.percentage,
        approvalReference,
        documentId: line.documentId,
        version: nextVersion,
        changeRequestId: request._id,
        createdBy: new Types.ObjectId(actorId),
      })),
    );

    request.status = ShareholdingChangeStatus.Approved;
    request.approvedBy = new Types.ObjectId(actorId);
    request.approvedAt = effectiveFrom;
    request.approvalNote = dto.approvalNote?.trim() ?? null;
    if (dto.approvalReference !== undefined) {
      request.approvalReference = approvalReference;
    }
    request.appliedVersion = nextVersion;
    await request.save();

    const activeAfter = await this.listActive(String(request.companyId));

    return createSuccessResponse(
      {
        changeRequest: this.toPublicChangeRequest(request),
        activeShareholding: activeAfter.data,
      },
      'Shareholding change approved; new version recorded',
    );
  }

  async reject(requestId: string, dto: RejectShareholdingDto, actorId: string) {
    const request = await this.requireChangeRequest(requestId);
    if (request.status !== ShareholdingChangeStatus.Pending) {
      throw new BadRequestException('Change request is not pending');
    }

    request.status = ShareholdingChangeStatus.Rejected;
    request.rejectedBy = new Types.ObjectId(actorId);
    request.rejectedAt = new Date();
    request.rejectionReason = dto.rejectionReason.trim();
    await request.save();

    return createSuccessResponse(
      this.toPublicChangeRequest(request),
      'Shareholding change request rejected',
    );
  }

  async listChangeRequests(query: {
    page?: number;
    limit?: number;
    companyId?: string | null;
    status?: ShareholdingChangeStatus;
  }) {
    const companyId = await this.resolveCompanyId(query.companyId);
    const filter: FilterQuery<ShareholdingChangeRequest> = { companyId };
    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.changeRequestModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.changeRequestModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublicChangeRequest(item)),
      'Shareholding change requests fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async nextVersion(companyId: Types.ObjectId): Promise<number> {
    const latest = await this.shareholdingModel
      .findOne({ companyId })
      .sort({ version: -1 })
      .select('version')
      .lean()
      .exec();
    return (latest?.version ?? 0) + 1;
  }

  private async requireChangeRequest(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid change request id');
    }
    const request = await this.changeRequestModel.findById(id).exec();
    if (!request) {
      throw new NotFoundException('Shareholding change request not found');
    }
    return request;
  }

  private async resolveCompanyId(
    companyId?: string | null,
  ): Promise<Types.ObjectId> {
    if (companyId) {
      const company = await this.companyModel.findById(companyId).select('_id').lean().exec();
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      return company._id as Types.ObjectId;
    }
    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    if (!primary) {
      throw new NotFoundException('Primary company not found');
    }
    return primary._id as Types.ObjectId;
  }

  private toPublicHolding(row: {
    _id: Types.ObjectId;
    companyId: Types.ObjectId;
    directorId: Types.ObjectId;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    numberOfShares: number;
    faceValue: number;
    percentage: number;
    approvalReference?: string | null;
    documentId?: Types.ObjectId | null;
    version: number;
    changeRequestId?: Types.ObjectId | null;
    createdAt?: Date;
  }): PublicShareholding {
    return {
      id: String(row._id),
      companyId: String(row.companyId),
      directorId: String(row.directorId),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? null,
      numberOfShares: row.numberOfShares,
      faceValue: row.faceValue,
      percentage: row.percentage,
      approvalReference: row.approvalReference ?? null,
      documentId: row.documentId ? String(row.documentId) : null,
      version: row.version,
      changeRequestId: row.changeRequestId ? String(row.changeRequestId) : null,
      createdAt: row.createdAt,
    };
  }

  private toPublicChangeRequest(request: {
    _id: Types.ObjectId;
    companyId: Types.ObjectId;
    reason: string;
    approvalReference?: string | null;
    proposedHoldings: Array<{
      directorId: Types.ObjectId;
      numberOfShares: number;
      faceValue: number;
      percentage: number;
      documentId?: Types.ObjectId | null;
    }>;
    status: ShareholdingChangeStatus;
    requestedBy: Types.ObjectId;
    approvedBy?: Types.ObjectId | null;
    approvedAt?: Date | null;
    approvalNote?: string | null;
    rejectedBy?: Types.ObjectId | null;
    rejectedAt?: Date | null;
    rejectionReason?: string | null;
    appliedVersion?: number | null;
    createdAt?: Date;
  }): PublicShareholdingChangeRequest {
    return {
      id: String(request._id),
      companyId: String(request.companyId),
      reason: request.reason,
      approvalReference: request.approvalReference ?? null,
      proposedHoldings: request.proposedHoldings.map((line) => ({
        directorId: String(line.directorId),
        numberOfShares: line.numberOfShares,
        faceValue: line.faceValue,
        percentage: line.percentage,
        documentId: line.documentId ? String(line.documentId) : null,
      })),
      status: request.status,
      requestedBy: String(request.requestedBy),
      approvedBy: request.approvedBy ? String(request.approvedBy) : null,
      approvedAt: request.approvedAt ?? null,
      approvalNote: request.approvalNote ?? null,
      rejectedBy: request.rejectedBy ? String(request.rejectedBy) : null,
      rejectedAt: request.rejectedAt ?? null,
      rejectionReason: request.rejectionReason ?? null,
      appliedVersion: request.appliedVersion ?? null,
      createdAt: request.createdAt,
    };
  }
}
