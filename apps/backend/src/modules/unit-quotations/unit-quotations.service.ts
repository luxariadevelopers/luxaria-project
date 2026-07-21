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
import { Project } from '../projects/schemas/project.schema';
import { Unit, UnitStatus } from '../units/schemas/unit.schema';
import type {
  ConvertUnitQuotationDto,
  CreateUnitQuotationDto,
  ListUnitQuotationsQueryDto,
  RejectUnitQuotationDto,
  ReviseUnitQuotationDto,
  UnitQuotationPricingDto,
  UpdateUnitQuotationDto,
} from './dto/unit-quotation.dto';
import {
  computeUnitQuotationTotals,
  roundMoney,
  type UnitQuotationPricingInput,
} from './unit-quotations.calculation';
import { toPublicUnitQuotation } from './unit-quotations.mapper';
import {
  UnitQuotation,
  UnitQuotationStatus,
  type UnitQuotationPricing,
} from './schemas/unit-quotation.schema';

const REVISABLE_STATUSES: UnitQuotationStatus[] = [
  UnitQuotationStatus.Issued,
  UnitQuotationStatus.Accepted,
  UnitQuotationStatus.Rejected,
];

const ISSUABLE_UNIT_STATUSES: UnitStatus[] = [
  UnitStatus.Available,
  UnitStatus.Held,
];

@Injectable()
export class UnitQuotationsService {
  constructor(
    @InjectModel(UnitQuotation.name)
    private readonly model: Model<UnitQuotation>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<Unit>,
  ) {}

  async create(dto: CreateUnitQuotationDto, actorId: string) {
    const project = await this.requireProject(dto.projectId);
    const unit = await this.requireUnit(dto.unitId);

    if (String(unit.projectId) !== dto.projectId) {
      throw new BadRequestException('unitId does not belong to projectId');
    }

    const pricing = this.buildPricing(dto.pricing, unit.basePrice);
    const totals = computeUnitQuotationTotals(pricing);
    const quotationNumber = await this.nextNumber(dto.projectId);

    const row = await this.model.create({
      quotationNumber,
      companyId: project.companyId ?? null,
      projectId: new Types.ObjectId(dto.projectId),
      unitId: new Types.ObjectId(dto.unitId),
      leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : null,
      customerId: dto.customerId ? new Types.ObjectId(dto.customerId) : null,
      version: 1,
      rootQuotationId: null,
      revisedFromId: null,
      status: UnitQuotationStatus.Draft,
      validUntil: dto.validUntil
        ? this.parseDate(dto.validUntil, 'validUntil')
        : null,
      pricing,
      totals,
      notes: dto.notes?.trim() ?? null,
      terms: dto.terms?.trim() ?? null,
      rejectionReason: null,
      issuedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      expiredAt: null,
      convertedAt: null,
      convertedBookingId: null,
      convertedReservationId: null,
      attachments: [],
      createdBy: new Types.ObjectId(actorId),
    });

    row.rootQuotationId = row._id as Types.ObjectId;
    await row.save();

    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation created as draft',
    );
  }

  async update(id: string, dto: UpdateUnitQuotationDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitQuotationStatus.Draft) {
      throw new BadRequestException('Only draft quotations can be updated');
    }

    if (dto.leadId !== undefined) {
      row.leadId = dto.leadId ? new Types.ObjectId(dto.leadId) : null;
    }
    if (dto.customerId !== undefined) {
      row.customerId = dto.customerId
        ? new Types.ObjectId(dto.customerId)
        : null;
    }
    if (dto.validUntil !== undefined) {
      row.validUntil = dto.validUntil
        ? this.parseDate(dto.validUntil, 'validUntil')
        : null;
    }
    if (dto.pricing !== undefined) {
      row.pricing = this.mergePricing(row.pricing, dto.pricing);
      row.totals = computeUnitQuotationTotals(row.pricing);
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }
    if (dto.terms !== undefined) {
      row.terms = dto.terms?.trim() ?? null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation updated',
    );
  }

  async issue(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitQuotationStatus.Draft) {
      throw new BadRequestException('Only draft quotations can be issued');
    }

    const unit = await this.unitModel.findById(row.unitId).exec();
    const warning = this.softUnitAvailabilityCheck(unit);

    row.status = UnitQuotationStatus.Issued;
    row.issuedAt = new Date();
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicUnitQuotation(row, { unitAvailabilityWarning: warning }),
      warning
        ? 'Unit quotation issued (unit availability warning)'
        : 'Unit quotation issued',
    );
  }

  async accept(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitQuotationStatus.Issued) {
      throw new BadRequestException('Only issued quotations can be accepted');
    }

    row.status = UnitQuotationStatus.Accepted;
    row.acceptedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation accepted',
    );
  }

  async reject(id: string, dto: RejectUnitQuotationDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitQuotationStatus.Issued) {
      throw new BadRequestException('Only issued quotations can be rejected');
    }

    row.status = UnitQuotationStatus.Rejected;
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation rejected',
    );
  }

  async revise(id: string, dto: ReviseUnitQuotationDto, actorId: string) {
    const previous = await this.requireRow(id);
    if (!REVISABLE_STATUSES.includes(previous.status)) {
      throw new BadRequestException(
        'Only issued, accepted, or rejected quotations can be revised',
      );
    }

    const pricing = dto.pricing
      ? this.mergePricing(previous.pricing, dto.pricing)
      : { ...previous.pricing };
    const totals = computeUnitQuotationTotals(pricing);
    const rootId =
      previous.rootQuotationId ?? (previous._id as Types.ObjectId);

    previous.status = UnitQuotationStatus.Superseded;
    previous.set('updatedBy', new Types.ObjectId(actorId));
    await previous.save();

    const quotationNumber = await this.nextNumber(String(previous.projectId));
    const row = await this.model.create({
      quotationNumber,
      companyId: previous.companyId,
      projectId: previous.projectId,
      unitId: previous.unitId,
      leadId:
        dto.leadId !== undefined
          ? dto.leadId
            ? new Types.ObjectId(dto.leadId)
            : null
          : previous.leadId,
      customerId:
        dto.customerId !== undefined
          ? dto.customerId
            ? new Types.ObjectId(dto.customerId)
            : null
          : previous.customerId,
      version: previous.version + 1,
      rootQuotationId: rootId,
      revisedFromId: previous._id,
      status: UnitQuotationStatus.Draft,
      validUntil:
        dto.validUntil !== undefined
          ? dto.validUntil
            ? this.parseDate(dto.validUntil, 'validUntil')
            : null
          : previous.validUntil,
      pricing,
      totals,
      notes:
        dto.notes !== undefined
          ? (dto.notes?.trim() ?? null)
          : previous.notes,
      terms:
        dto.terms !== undefined
          ? (dto.terms?.trim() ?? null)
          : previous.terms,
      rejectionReason: null,
      issuedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      expiredAt: null,
      convertedAt: null,
      convertedBookingId: null,
      convertedReservationId: null,
      attachments: [],
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation revised (new draft version)',
    );
  }

  async convertToBooking(
    id: string,
    dto: ConvertUnitQuotationDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== UnitQuotationStatus.Accepted) {
      throw new BadRequestException(
        'Only accepted quotations can be converted to booking',
      );
    }

    if (!dto.bookingId && !dto.reservationId) {
      throw new BadRequestException(
        'bookingId or reservationId is required (booking auto-create not wired yet)',
      );
    }

    row.status = UnitQuotationStatus.Converted;
    row.convertedAt = new Date();
    row.convertedBookingId = dto.bookingId
      ? new Types.ObjectId(dto.bookingId)
      : null;
    row.convertedReservationId = dto.reservationId
      ? new Types.ObjectId(dto.reservationId)
      : null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation marked converted',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicUnitQuotation(row),
      'Unit quotation fetched',
    );
  }

  async list(query: ListUnitQuotationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<UnitQuotation> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.unitId) filter.unitId = new Types.ObjectId(query.unitId);
    if (query.leadId) filter.leadId = new Types.ObjectId(query.leadId);
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.status) filter.status = query.status;

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
      items.map((row) => toPublicUnitQuotation(row)),
      'Unit quotations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private buildPricing(
    dto: UnitQuotationPricingDto | undefined,
    unitBasePrice: number,
  ): UnitQuotationPricing {
    const input: UnitQuotationPricingInput = {
      basePrice: dto?.basePrice ?? unitBasePrice,
      plc: dto?.plc,
      floorRise: dto?.floorRise,
      carPark: dto?.carPark,
      clubHouse: dto?.clubHouse,
      corpusFund: dto?.corpusFund,
      registrationEstimate: dto?.registrationEstimate,
      gst: dto?.gst,
      stampDutyEstimate: dto?.stampDutyEstimate,
      discount: dto?.discount,
      offerAmount: dto?.offerAmount,
      otherCharges: dto?.otherCharges,
    };

    const totals = computeUnitQuotationTotals(input);
    void totals;

    return {
      basePrice: roundMoney(input.basePrice ?? 0),
      plc: roundMoney(input.plc ?? 0),
      floorRise: roundMoney(input.floorRise ?? 0),
      carPark: roundMoney(input.carPark ?? 0),
      clubHouse: roundMoney(input.clubHouse ?? 0),
      corpusFund: roundMoney(input.corpusFund ?? 0),
      registrationEstimate: roundMoney(input.registrationEstimate ?? 0),
      gst: roundMoney(input.gst ?? 0),
      stampDutyEstimate: roundMoney(input.stampDutyEstimate ?? 0),
      discount: roundMoney(input.discount ?? 0),
      offerAmount: roundMoney(input.offerAmount ?? 0),
      otherCharges: roundMoney(input.otherCharges ?? 0),
    };
  }

  private mergePricing(
    current: UnitQuotationPricing,
    patch: UnitQuotationPricingDto,
  ): UnitQuotationPricing {
    return this.buildPricing(
      {
        basePrice: patch.basePrice ?? current.basePrice,
        plc: patch.plc ?? current.plc,
        floorRise: patch.floorRise ?? current.floorRise,
        carPark: patch.carPark ?? current.carPark,
        clubHouse: patch.clubHouse ?? current.clubHouse,
        corpusFund: patch.corpusFund ?? current.corpusFund,
        registrationEstimate:
          patch.registrationEstimate ?? current.registrationEstimate,
        gst: patch.gst ?? current.gst,
        stampDutyEstimate:
          patch.stampDutyEstimate ?? current.stampDutyEstimate,
        discount: patch.discount ?? current.discount,
        offerAmount: patch.offerAmount ?? current.offerAmount,
        otherCharges: patch.otherCharges ?? current.otherCharges,
      },
      current.basePrice,
    );
  }

  private softUnitAvailabilityCheck(
    unit: Unit | null,
  ): string | null {
    if (!unit) {
      return 'Unit not found — availability not verified';
    }
    if (!ISSUABLE_UNIT_STATUSES.includes(unit.status)) {
      return `Unit status is ${unit.status}; expected available or held`;
    }
    return null;
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `UQ-${year}-${seq}`;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireUnit(unitId: string) {
    if (!Types.ObjectId.isValid(unitId)) {
      throw new BadRequestException('Invalid unitId');
    }
    const unit = await this.unitModel.findById(unitId).exec();
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid quotation id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Unit quotation not found');
    return row;
  }
}
