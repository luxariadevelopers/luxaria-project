import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { BoqItem, BoqItemStatus } from '../boq/schemas/boq.schema';
import { SiteAccessService } from '../sites/site-access.service';
import type {
  CreateMeasurementBookEntryDto,
  ListMeasurementBookQueryDto,
  MbSiteLocationDto,
  RejectMeasurementBookDto,
  ReviseMeasurementBookDto,
  UpdateMeasurementBookEntryDto,
} from './dto/measurement-book.dto';
import { toPublicMeasurementBookEntry } from './measurement-book.mapper';
import {
  assertPeriodRange,
  normalizeDay,
  resolveMbQuantity,
} from './measurement-book.validation';
import {
  MeasurementBookEntry,
  MeasurementBookStatus,
} from './schemas/measurement-book-entry.schema';

const EDITABLE: MeasurementBookStatus[] = [
  MeasurementBookStatus.Draft,
  MeasurementBookStatus.Rejected,
];

@Injectable()
export class MeasurementBookService {
  constructor(
    @InjectModel(MeasurementBookEntry.name)
    private readonly model: Model<MeasurementBookEntry>,
    @InjectModel(BoqItem.name)
    private readonly boqItemModel: Model<BoqItem>,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(dto: CreateMeasurementBookEntryDto, actorId: string) {
    const location = this.mapLocation(dto.location);
    const siteId = location.siteId;
    await this.assertSiteAccess(
      actorId,
      dto.projectId,
      siteId ? String(siteId) : null,
    );

    const boq = await this.requireBoqItem(dto.boqItemId, dto.projectId);
    const periodFrom = normalizeDay(dto.periodFrom, 'periodFrom');
    const periodTo = normalizeDay(dto.periodTo, 'periodTo');
    assertPeriodRange(periodFrom, periodTo);
    const measurementDate = normalizeDay(
      dto.measurementDate,
      'measurementDate',
    );

    const numberOfUnits = dto.numberOfUnits ?? 1;
    const qty = resolveMbQuantity({
      length: dto.length,
      breadth: dto.breadth,
      height: dto.height,
      numberOfUnits,
      formulaQuantity: dto.formulaQuantity,
      quantity: dto.quantity,
    });

    const entryNumber = await this.nextEntryNumber(dto.projectId);
    const measuredBy = dto.measuredBy ?? actorId;

    const row = await this.model.create({
      entryNumber,
      revision: 1,
      projectId: new Types.ObjectId(dto.projectId),
      contractorId: new Types.ObjectId(dto.contractorId),
      boqItemId: new Types.ObjectId(dto.boqItemId),
      boqCode: boq.boqCode ?? null,
      workOrderId: this.optionalOid(dto.workOrderId),
      workMeasurementId: this.optionalOid(dto.workMeasurementId),
      dprId: this.optionalOid(dto.dprId),
      drawingId: this.optionalOid(dto.drawingId),
      siteId,
      location,
      length: dto.length ?? null,
      breadth: dto.breadth ?? null,
      height: dto.height ?? null,
      numberOfUnits,
      calculatedQuantity: qty.calculatedQuantity,
      formula: dto.formula?.trim() || null,
      formulaQuantity: dto.formulaQuantity ?? null,
      quantity: qty.quantity,
      unit: dto.unit ?? boq.unit,
      periodFrom,
      periodTo,
      measurementDate,
      workDescription: dto.workDescription?.trim() || null,
      sheetReference: dto.sheetReference?.trim() || null,
      notes: dto.notes?.trim() || null,
      photoDocumentIds: (dto.photoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      status: MeasurementBookStatus.Draft,
      supersedesId: null,
      supersededById: null,
      revisionReason: null,
      measuredBy: new Types.ObjectId(measuredBy),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry created',
    );
  }

  async update(
    id: string,
    dto: UpdateMeasurementBookEntryDto,
    actorId: string,
  ) {
    const row = await this.requireEntry(id);
    this.assertEditable(row.status);

    const projectId = String(row.projectId);
    let location = row.location;
    if (dto.location !== undefined) {
      location = this.mapLocation(dto.location) as typeof row.location;
      row.location = location;
      row.siteId = location.siteId;
    }

    await this.assertSiteAccess(
      actorId,
      projectId,
      row.siteId ? String(row.siteId) : null,
    );

    if (dto.contractorId !== undefined) {
      row.contractorId = new Types.ObjectId(dto.contractorId);
    }
    if (dto.boqItemId !== undefined) {
      const boq = await this.requireBoqItem(dto.boqItemId, projectId);
      row.boqItemId = new Types.ObjectId(dto.boqItemId);
      row.boqCode = boq.boqCode ?? null;
      if (dto.unit === undefined) row.unit = boq.unit;
    }
    if (dto.workOrderId !== undefined) {
      row.workOrderId = this.optionalOid(dto.workOrderId);
    }
    if (dto.workMeasurementId !== undefined) {
      row.workMeasurementId = this.optionalOid(dto.workMeasurementId);
    }
    if (dto.dprId !== undefined) {
      row.dprId = this.optionalOid(dto.dprId);
    }
    if (dto.drawingId !== undefined) {
      row.drawingId = this.optionalOid(dto.drawingId);
    }
    if (dto.length !== undefined) row.length = dto.length ?? null;
    if (dto.breadth !== undefined) row.breadth = dto.breadth ?? null;
    if (dto.height !== undefined) row.height = dto.height ?? null;
    if (dto.numberOfUnits !== undefined) {
      row.numberOfUnits = dto.numberOfUnits;
    }
    if (dto.formula !== undefined) {
      row.formula = dto.formula?.trim() || null;
    }
    if (dto.formulaQuantity !== undefined) {
      row.formulaQuantity = dto.formulaQuantity ?? null;
    }
    if (dto.unit !== undefined) row.unit = dto.unit;
    if (dto.periodFrom !== undefined) {
      row.periodFrom = normalizeDay(dto.periodFrom, 'periodFrom');
    }
    if (dto.periodTo !== undefined) {
      row.periodTo = normalizeDay(dto.periodTo, 'periodTo');
    }
    assertPeriodRange(row.periodFrom, row.periodTo);
    if (dto.measurementDate !== undefined) {
      row.measurementDate = normalizeDay(
        dto.measurementDate,
        'measurementDate',
      );
    }
    if (dto.workDescription !== undefined) {
      row.workDescription = dto.workDescription?.trim() || null;
    }
    if (dto.sheetReference !== undefined) {
      row.sheetReference = dto.sheetReference?.trim() || null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    if (dto.photoDocumentIds !== undefined) {
      row.photoDocumentIds = dto.photoDocumentIds.map(
        (pid) => new Types.ObjectId(pid),
      );
    }
    if (dto.measuredBy !== undefined) {
      row.measuredBy = new Types.ObjectId(dto.measuredBy);
    }

    const qty = resolveMbQuantity({
      length: row.length,
      breadth: row.breadth,
      height: row.height,
      numberOfUnits: row.numberOfUnits,
      formulaQuantity: row.formulaQuantity,
      quantity: dto.quantity !== undefined ? dto.quantity : row.quantity,
    });
    row.calculatedQuantity = qty.calculatedQuantity;
    row.quantity = qty.quantity;

    if (row.status === MeasurementBookStatus.Rejected) {
      row.status = MeasurementBookStatus.Draft;
      row.rejectedBy = null;
      row.rejectedAt = null;
      row.rejectionReason = null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    if (row.status !== MeasurementBookStatus.Draft) {
      throw new BadRequestException('Only draft entries can be submitted');
    }
    row.status = MeasurementBookStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry submitted',
    );
  }

  async acknowledge(id: string, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    if (row.status !== MeasurementBookStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted entries can be acknowledged by contractor',
      );
    }
    row.status = MeasurementBookStatus.Acknowledged;
    row.acknowledgedBy = new Types.ObjectId(actorId);
    row.acknowledgedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry acknowledged',
    );
  }

  async verify(id: string, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    if (
      row.status !== MeasurementBookStatus.Submitted &&
      row.status !== MeasurementBookStatus.Acknowledged
    ) {
      throw new BadRequestException(
        'Only submitted or acknowledged entries can be verified',
      );
    }
    if (String(row.measuredBy) === actorId) {
      throw new ForbiddenException(
        'Verifier must differ from measuredBy (separation of duties)',
      );
    }
    row.status = MeasurementBookStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry verified',
    );
  }

  async certify(id: string, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    if (row.status !== MeasurementBookStatus.Verified) {
      throw new BadRequestException('Only verified entries can be certified');
    }
    if (String(row.measuredBy) === actorId) {
      throw new ForbiddenException(
        'Certifier must differ from measuredBy (separation of duties)',
      );
    }
    row.status = MeasurementBookStatus.Certified;
    row.certifiedBy = new Types.ObjectId(actorId);
    row.certifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    if (row.supersedesId) {
      await this.model
        .updateOne(
          { _id: row.supersedesId },
          {
            $set: {
              status: MeasurementBookStatus.Superseded,
              supersededById: row._id,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry certified',
    );
  }

  async reject(id: string, dto: RejectMeasurementBookDto, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    if (
      row.status !== MeasurementBookStatus.Submitted &&
      row.status !== MeasurementBookStatus.Acknowledged &&
      row.status !== MeasurementBookStatus.Verified
    ) {
      throw new BadRequestException(
        'Only submitted, acknowledged, or verified entries can be rejected',
      );
    }
    row.status = MeasurementBookStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry rejected',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    if (!EDITABLE.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or rejected entries can be cancelled',
      );
    }
    row.status = MeasurementBookStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry cancelled',
    );
  }

  /**
   * Create a revision document for a certified entry.
   * Certified quantities are never silently overwritten.
   */
  async revise(id: string, dto: ReviseMeasurementBookDto, actorId: string) {
    const current = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(current.projectId),
      current.siteId ? String(current.siteId) : null,
    );

    if (current.status !== MeasurementBookStatus.Certified) {
      throw new BadRequestException(
        'Only certified entries can be revised (no silent edit)',
      );
    }

    const open = await this.model
      .findOne({
        entryNumber: current.entryNumber,
        status: {
          $in: [
            MeasurementBookStatus.Draft,
            MeasurementBookStatus.Submitted,
            MeasurementBookStatus.Acknowledged,
            MeasurementBookStatus.Verified,
            MeasurementBookStatus.Rejected,
          ],
        },
      })
      .exec();
    if (open) {
      throw new BadRequestException(
        'An open revision already exists for this measurement book entry',
      );
    }

    const length = dto.length !== undefined ? dto.length : current.length;
    const breadth = dto.breadth !== undefined ? dto.breadth : current.breadth;
    const height = dto.height !== undefined ? dto.height : current.height;
    const numberOfUnits = dto.numberOfUnits ?? current.numberOfUnits;
    const formulaQuantity =
      dto.formulaQuantity !== undefined
        ? dto.formulaQuantity
        : current.formulaQuantity;
    const qty = resolveMbQuantity({
      length,
      breadth,
      height,
      numberOfUnits,
      formulaQuantity,
      quantity:
        dto.quantity !== undefined ? dto.quantity : current.quantity,
    });

    const row = await this.model.create({
      entryNumber: current.entryNumber,
      revision: current.revision + 1,
      projectId: current.projectId,
      contractorId: current.contractorId,
      boqItemId: current.boqItemId,
      boqCode: current.boqCode,
      workOrderId: current.workOrderId,
      workMeasurementId: current.workMeasurementId,
      dprId: current.dprId,
      drawingId: current.drawingId,
      siteId: current.siteId,
      location: {
        siteId: current.location.siteId,
        phaseId: current.location.phaseId,
        blockId: current.location.blockId,
        towerId: current.location.towerId,
        floorId: current.location.floorId,
        locationLabel: current.location.locationLabel,
      },
      length: length ?? null,
      breadth: breadth ?? null,
      height: height ?? null,
      numberOfUnits,
      calculatedQuantity: qty.calculatedQuantity,
      formula:
        dto.formula !== undefined
          ? dto.formula?.trim() || null
          : current.formula,
      formulaQuantity: formulaQuantity ?? null,
      quantity: qty.quantity,
      unit: current.unit,
      periodFrom: current.periodFrom,
      periodTo: current.periodTo,
      measurementDate: current.measurementDate,
      workDescription:
        dto.workDescription !== undefined
          ? dto.workDescription?.trim() || null
          : current.workDescription,
      sheetReference: current.sheetReference,
      notes:
        dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
      photoDocumentIds:
        dto.photoDocumentIds !== undefined
          ? dto.photoDocumentIds.map((pid) => new Types.ObjectId(pid))
          : [...current.photoDocumentIds],
      status: MeasurementBookStatus.Draft,
      supersedesId: current._id,
      supersededById: null,
      revisionReason: dto.reason.trim(),
      measuredBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book revision created as draft (history preserved)',
    );
  }

  async getById(id: string) {
    const row = await this.requireEntry(id);
    return createSuccessResponse(
      toPublicMeasurementBookEntry(row),
      'Measurement book entry fetched',
    );
  }

  async list(query: ListMeasurementBookQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<MeasurementBookEntry> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.boqItemId) {
      filter.boqItemId = new Types.ObjectId(query.boqItemId);
    }
    if (query.workOrderId) {
      filter.workOrderId = new Types.ObjectId(query.workOrderId);
    }
    if (query.workMeasurementId) {
      filter.workMeasurementId = new Types.ObjectId(query.workMeasurementId);
    }
    if (query.dprId) filter.dprId = new Types.ObjectId(query.dprId);
    if (query.status) filter.status = query.status;

    if (query.fromDate || query.toDate) {
      const range: { $gte?: Date; $lte?: Date } = {};
      if (query.fromDate) {
        range.$gte = normalizeDay(query.fromDate, 'fromDate');
      }
      if (query.toDate) {
        const end = normalizeDay(query.toDate, 'toDate');
        end.setUTCHours(23, 59, 59, 999);
        range.$lte = end;
      }
      filter.measurementDate = range;
    }

    if (query.periodFrom || query.periodTo) {
      // Overlap: entry.periodFrom <= filterTo AND entry.periodTo >= filterFrom
      if (query.periodTo) {
        filter.periodFrom = {
          $lte: normalizeDay(query.periodTo, 'periodTo'),
        };
      }
      if (query.periodFrom) {
        filter.periodTo = {
          $gte: normalizeDay(query.periodFrom, 'periodFrom'),
        };
      }
    }

    const sortField = query.sortBy ?? 'measurementDate';
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
      items.map((row) => toPublicMeasurementBookEntry(row)),
      'Measurement book entries fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private mapLocation(dto: MbSiteLocationDto) {
    const siteId = this.optionalOid(dto.siteId);
    return {
      siteId,
      phaseId: this.optionalOid(dto.phaseId),
      blockId: this.optionalOid(dto.blockId),
      towerId: this.optionalOid(dto.towerId),
      floorId: this.optionalOid(dto.floorId),
      locationLabel: dto.locationLabel?.trim() || null,
    };
  }

  private optionalOid(value?: string | null): Types.ObjectId | null {
    if (value == null || value === '') return null;
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid ObjectId');
    }
    return new Types.ObjectId(value);
  }

  private assertEditable(status: MeasurementBookStatus) {
    if (!EDITABLE.includes(status)) {
      throw new BadRequestException(
        'Only draft or rejected entries can be updated — create a revision for certified corrections',
      );
    }
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

  private async requireBoqItem(boqItemId: string, projectId: string) {
    if (!Types.ObjectId.isValid(boqItemId)) {
      throw new BadRequestException('Invalid boqItemId');
    }
    const boq = await this.boqItemModel.findById(boqItemId).exec();
    if (!boq || String(boq.projectId) !== projectId) {
      throw new NotFoundException('BOQ item not found for project');
    }
    if (
      boq.status === BoqItemStatus.Cancelled ||
      boq.status === BoqItemStatus.OnHold
    ) {
      throw new BadRequestException(
        `BOQ item is ${boq.status} and cannot be measured`,
      );
    }
    return boq;
  }

  private async nextEntryNumber(projectId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `MB-${year}-`;
    const count = await this.model
      .countDocuments({
        projectId: new Types.ObjectId(projectId),
        entryNumber: { $regex: `^${prefix}` },
        revision: 1,
      })
      .setOptions({ withDeleted: true })
      .exec();
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async requireEntry(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid measurement book entry id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Measurement book entry not found');
    }
    return row;
  }
}
