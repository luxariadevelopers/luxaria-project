import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { Booking, BookingStatus } from '../bookings/schemas/booking.schema';
import { Unit, UnitStatus } from '../units/schemas/unit.schema';
import type {
  CreateUnitRegistrationDto,
  ListUnitRegistrationsQueryDto,
  MarkRegisteredDto,
  SubRegistrarOfficeDto,
  RegistrationWitnessDto,
  UpdateUnitRegistrationDto,
} from './dto/unit-registration.dto';
import { toPublicUnitRegistration } from './unit-registrations.mapper';
import {
  UnitRegistration,
  UnitRegistrationStatus,
} from './schemas/unit-registration.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class UnitRegistrationsService {
  constructor(
    @InjectModel(UnitRegistration.name)
    private readonly model: Model<UnitRegistration>,
    @Optional()
    @InjectModel(Booking.name)
    private readonly bookingModel?: Model<Booking>,
    @Optional()
    @InjectModel(Unit.name)
    private readonly unitModel?: Model<Unit>,
  ) {}

  async create(dto: CreateUnitRegistrationDto, actorId: string) {
    const registrationNumber = await this.nextNumber(dto.projectId);
    const row = await this.model.create({
      registrationNumber,
      projectId: new Types.ObjectId(dto.projectId),
      bookingId: new Types.ObjectId(dto.bookingId),
      customerId: new Types.ObjectId(dto.customerId),
      unitId: new Types.ObjectId(dto.unitId),
      agreementId: dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null,
      status: UnitRegistrationStatus.Draft,
      registrationDate: dto.registrationDate
        ? new Date(dto.registrationDate)
        : null,
      documentNumber: dto.documentNumber?.trim() ?? null,
      ecReference: dto.ecReference?.trim() ?? null,
      sro: this.mapSro(dto.sro),
      stampDuty:
        dto.stampDuty != null && Number.isFinite(dto.stampDuty)
          ? roundMoney(dto.stampDuty)
          : null,
      registrationCharges:
        dto.registrationCharges != null &&
        Number.isFinite(dto.registrationCharges)
          ? roundMoney(dto.registrationCharges)
          : null,
      witnesses: this.mapWitnesses(dto.witnesses),
      documentPath: dto.documentPath?.trim() ?? null,
      documentFileName: dto.documentFileName?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
      registeredBy: null,
      registeredAt: null,
      cancelledAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicUnitRegistration(row),
      'Unit registration created',
    );
  }

  async update(id: string, dto: UpdateUnitRegistrationDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitRegistrationStatus.Draft) {
      throw new BadRequestException(
        'Only draft registrations can be updated',
      );
    }

    if (dto.agreementId !== undefined) {
      row.agreementId = dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null;
    }
    if (dto.registrationDate !== undefined) {
      row.registrationDate = dto.registrationDate
        ? new Date(dto.registrationDate)
        : null;
    }
    if (dto.documentNumber !== undefined) {
      row.documentNumber = dto.documentNumber?.trim() ?? null;
    }
    if (dto.ecReference !== undefined) {
      row.ecReference = dto.ecReference?.trim() ?? null;
    }
    if (dto.sro !== undefined) {
      row.sro = this.mapSro(dto.sro);
    }
    if (dto.stampDuty !== undefined) {
      row.stampDuty =
        dto.stampDuty != null ? roundMoney(dto.stampDuty) : null;
    }
    if (dto.registrationCharges !== undefined) {
      row.registrationCharges =
        dto.registrationCharges != null
          ? roundMoney(dto.registrationCharges)
          : null;
    }
    if (dto.witnesses !== undefined) {
      row.witnesses = this.mapWitnesses(dto.witnesses);
    }
    if (dto.documentPath !== undefined) {
      row.documentPath = dto.documentPath?.trim() ?? null;
    }
    if (dto.documentFileName !== undefined) {
      row.documentFileName = dto.documentFileName?.trim() ?? null;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitRegistration(row),
      'Unit registration updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitRegistrationStatus.Draft) {
      throw new BadRequestException('Only draft registrations can be submitted');
    }
    row.status = UnitRegistrationStatus.Submitted;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitRegistration(row),
      'Unit registration submitted',
    );
  }

  async markRegistered(
    id: string,
    dto: MarkRegisteredDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== UnitRegistrationStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted registrations can be marked registered',
      );
    }

    if (dto.registrationDate !== undefined) {
      row.registrationDate = dto.registrationDate
        ? new Date(dto.registrationDate)
        : row.registrationDate ?? new Date();
    } else if (!row.registrationDate) {
      row.registrationDate = new Date();
    }
    if (dto.documentNumber !== undefined) {
      row.documentNumber = dto.documentNumber?.trim() ?? null;
    }
    if (dto.ecReference !== undefined) {
      row.ecReference = dto.ecReference?.trim() ?? null;
    }

    row.status = UnitRegistrationStatus.Registered;
    row.registeredBy = new Types.ObjectId(actorId);
    row.registeredAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    await this.tryUpdateBookingAndUnit(row.bookingId, row.unitId);

    return createSuccessResponse(
      toPublicUnitRegistration(row),
      'Unit registration completed',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== UnitRegistrationStatus.Draft &&
      row.status !== UnitRegistrationStatus.Submitted
    ) {
      throw new BadRequestException(
        'Only draft or submitted registrations can be cancelled',
      );
    }
    row.status = UnitRegistrationStatus.Cancelled;
    row.cancelledAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitRegistration(row),
      'Unit registration cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicUnitRegistration(row),
      'Unit registration fetched',
    );
  }

  async list(query: ListUnitRegistrationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<UnitRegistration> = {};
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
    if (query.agreementId) {
      filter.agreementId = new Types.ObjectId(query.agreementId);
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
      items.map((row) => toPublicUnitRegistration(row)),
      'Unit registrations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private mapSro(dto?: SubRegistrarOfficeDto | null) {
    return {
      name: dto?.name?.trim() ?? null,
      address: dto?.address?.trim() ?? null,
      district: dto?.district?.trim() ?? null,
    };
  }

  private mapWitnesses(witnesses?: RegistrationWitnessDto[]) {
    return (witnesses ?? []).map((witness) => ({
      name: witness.name.trim(),
      address: witness.address?.trim() ?? null,
      phone: witness.phone?.trim() ?? null,
    }));
  }

  private async tryUpdateBookingAndUnit(
    bookingId: Types.ObjectId,
    unitId: Types.ObjectId,
  ) {
    if (this.bookingModel && BookingStatus?.Registered) {
      try {
        await this.bookingModel
          .findByIdAndUpdate(bookingId, { status: BookingStatus.Registered })
          .exec();
      } catch {
        // Soft integration — booking module may be absent.
      }
    }
    if (this.unitModel && UnitStatus?.Registered) {
      try {
        await this.unitModel
          .findByIdAndUpdate(unitId, { status: UnitStatus.Registered })
          .exec();
      } catch {
        // Soft integration — units module may be absent.
      }
    }
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `UREG-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid unit registration id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Unit registration not found');
    return row;
  }
}
