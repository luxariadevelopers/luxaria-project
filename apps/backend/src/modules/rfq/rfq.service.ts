import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import { Project } from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import { SitesService } from '../sites/sites.service';
import {
  Vendor,
  VendorStatus,
} from '../vendors/schemas/vendor.schema';
import {
  VendorQuotation,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { toPublicVendorQuotation } from '../vendor-quotations/vendor-quotations.mapper';
import type {
  CreateRfqDto,
  ListRfqsQueryDto,
  UpdateRfqDto,
} from './dto/rfq.dto';
import { toPublicRfq } from './rfq.mapper';
import { Rfq, RfqStatus } from './schemas/rfq.schema';

const ELIGIBLE_PR_STATUSES = [
  PurchaseRequestStatus.Approved,
  PurchaseRequestStatus.Sourcing,
];

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    @InjectModel(Rfq.name) private readonly rfqModel: Model<Rfq>,
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseRequestModel: Model<PurchaseRequest>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(VendorQuotation.name)
    private readonly quotationModel: Model<VendorQuotation>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly numberingService: NumberingService,
    private readonly projectScope: ProjectScopedDataHelper,
    private readonly sitesService: SitesService,
  ) {}

  async create(dto: CreateRfqDto, actorId: string, companyId?: string | null) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'rfq' },
    );
    await this.requireProject(dto.projectId);
    const pr = await this.requireEligiblePurchaseRequest(
      dto.purchaseRequestId,
      dto.projectId,
    );
    const siteId = await this.resolveSite(dto.siteId, dto.projectId);
    const vendorIds = await this.resolveVendors(dto.vendorIds);
    const closingDate = this.parseClosingDate(dto.closingDate);

    const rfqNumber = await this.numberingService.nextCode(
      NumberEntityType.RFQ,
      {
        asOf: closingDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.rfqModel.create({
      companyId: companyId ? new Types.ObjectId(companyId) : null,
      projectId: new Types.ObjectId(dto.projectId),
      siteId,
      purchaseRequestId: pr._id,
      rfqNumber,
      title: dto.title.trim(),
      status: RfqStatus.Draft,
      vendorIds,
      closingDate,
      notes: dto.notes?.trim() ?? null,
      issuedAt: null,
      issuedBy: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicRfq(row), 'RFQ created as draft');
  }

  async update(id: string, dto: UpdateRfqDto, actorId: string) {
    const row = await this.requireRfq(id, actorId, 'update');
    if (row.status !== RfqStatus.Draft) {
      throw new BadRequestException('Only draft RFQs can be updated');
    }

    if (dto.projectId && dto.projectId !== String(row.projectId)) {
      throw new BadRequestException(
        'projectId cannot be changed; create a new RFQ',
      );
    }
    if (
      dto.purchaseRequestId &&
      dto.purchaseRequestId !== String(row.purchaseRequestId)
    ) {
      throw new BadRequestException(
        'purchaseRequestId cannot be changed; create a new RFQ',
      );
    }
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;
    if (dto.closingDate !== undefined) {
      row.closingDate = this.parseClosingDate(dto.closingDate);
    }
    if (dto.siteId !== undefined) {
      row.siteId = await this.resolveSite(dto.siteId, String(row.projectId));
    }
    if (dto.vendorIds !== undefined) {
      row.vendorIds = await this.resolveVendors(dto.vendorIds);
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicRfq(row), 'RFQ updated');
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireRfq(id, actorId, 'read');
    return createSuccessResponse(toPublicRfq(row), 'RFQ fetched');
  }

  async list(query: ListRfqsQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'rfq' },
      );
    }

    let filter: FilterQuery<Rfq> = {};
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.purchaseRequestId) {
      filter.purchaseRequestId = new Types.ObjectId(query.purchaseRequestId);
    }
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { rfqNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
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
      this.rfqModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.rfqModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicRfq(item)),
      'RFQs fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async issue(id: string, actorId: string) {
    const row = await this.requireRfq(id, actorId, 'update');
    if (row.status !== RfqStatus.Draft) {
      throw new BadRequestException('Only draft RFQs can be issued');
    }
    if (!row.vendorIds?.length) {
      throw new BadRequestException('RFQ requires at least one invited vendor');
    }

    row.status = RfqStatus.Issued;
    row.issuedAt = new Date();
    row.issuedBy = new Types.ObjectId(actorId);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    // Email blast stub — full SMTP RFQ distribution is out of scope for Phase 3.
    // When NotificationsService templates for RFQ_ISSUED exist, enqueue per vendor contact here.
    this.logger.log(
      `RFQ ${row.rfqNumber} issued to ${row.vendorIds.length} vendor(s) (email stub no-op)`,
    );

    return createSuccessResponse(toPublicRfq(row), 'RFQ issued');
  }

  async close(id: string, actorId: string) {
    const row = await this.requireRfq(id, actorId, 'update');
    if (row.status !== RfqStatus.Issued) {
      throw new BadRequestException('Only issued RFQs can be closed');
    }
    row.status = RfqStatus.Closed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicRfq(row), 'RFQ closed');
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRfq(id, actorId, 'update');
    if (
      row.status === RfqStatus.Cancelled ||
      row.status === RfqStatus.Awarded
    ) {
      throw new BadRequestException(
        `RFQ in status ${row.status} cannot be cancelled`,
      );
    }
    row.status = RfqStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicRfq(row), 'RFQ cancelled');
  }

  async listResponses(id: string, actorId: string) {
    await this.requireRfq(id, actorId, 'read');
    const rows = await this.quotationModel
      .find({ rfqId: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .exec();
    return createSuccessResponse(
      rows.map((r) => toPublicVendorQuotation(r)),
      'RFQ responses fetched',
    );
  }

  async requireIssuedWithVendor(rfqId: string, vendorId: string) {
    if (!Types.ObjectId.isValid(rfqId)) {
      throw new BadRequestException('Invalid rfqId');
    }
    const row = await this.rfqModel.findById(rfqId).exec();
    if (!row) {
      throw new NotFoundException('RFQ not found');
    }
    if (row.status !== RfqStatus.Issued) {
      throw new BadRequestException('Quotations can only link to issued RFQs');
    }
    const invited = row.vendorIds.some((id) => String(id) === vendorId);
    if (!invited) {
      throw new BadRequestException('Vendor is not invited on this RFQ');
    }
    return row;
  }

  private async requireRfq(
    id: string,
    actorId: string,
    action: 'read' | 'update' | 'create' | 'approve',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid RFQ id');
    }
    const row = await this.rfqModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('RFQ not found');
    }
    await this.projectScope.assertProjectAccess(
      actorId,
      String(row.projectId),
      action,
      { resourceType: 'rfq', resourceId: id },
    );
    return row;
  }

  private async requireEligiblePurchaseRequest(
    purchaseRequestId: string,
    projectId: string,
  ) {
    if (!Types.ObjectId.isValid(purchaseRequestId)) {
      throw new BadRequestException('Invalid purchaseRequestId');
    }
    const pr = await this.purchaseRequestModel
      .findById(purchaseRequestId)
      .exec();
    if (!pr) {
      throw new NotFoundException('Purchase request not found');
    }
    if (String(pr.projectId) !== projectId) {
      throw new BadRequestException(
        'purchaseRequestId does not belong to projectId',
      );
    }
    if (!ELIGIBLE_PR_STATUSES.includes(pr.status)) {
      throw new BadRequestException(
        'Purchase request must be approved or in sourcing to create an RFQ',
      );
    }
    return pr;
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

  private async resolveSite(
    siteId: string | null | undefined,
    projectId: string,
  ): Promise<Types.ObjectId | null> {
    if (siteId === undefined || siteId === null || siteId === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(siteId)) {
      throw new BadRequestException('Invalid siteId');
    }
    const site = await this.sitesService.findById(siteId);
    if (!site) {
      throw new BadRequestException('siteId not found');
    }
    if (String(site.projectId) !== projectId) {
      throw new BadRequestException('siteId does not belong to projectId');
    }
    return site._id as Types.ObjectId;
  }

  private async resolveVendors(vendorIds: string[]): Promise<Types.ObjectId[]> {
    const unique = [...new Set(vendorIds)];
    const oids: Types.ObjectId[] = [];
    for (const vendorId of unique) {
      if (!Types.ObjectId.isValid(vendorId)) {
        throw new BadRequestException(`Invalid vendorId: ${vendorId}`);
      }
      const vendor = await this.vendorModel.findById(vendorId).exec();
      if (!vendor) {
        throw new NotFoundException(`Vendor not found: ${vendorId}`);
      }
      if (vendor.status !== VendorStatus.Active) {
        throw new BadRequestException(
          `Vendor ${vendor.vendorCode} is not active`,
        );
      }
      oids.push(vendor._id as Types.ObjectId);
    }
    return oids;
  }

  private parseClosingDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid closingDate');
    }
    return date;
  }
}
