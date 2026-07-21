import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  assertNonNegativeCapital,
  assertPaidUpNotExceedAuthorised,
  normalizeOptionalCode,
} from './company.validation';
import {
  type PublicAddressHistory,
  type PublicCapitalHistory,
  toPublicCompany,
} from './company.mapper';
import type { UpdateCapitalDto } from './dto/update-capital.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import type { UpdateStatutoryDto } from './dto/update-statutory.dto';
import { addressesEqual, toAddressEmbed } from './schemas/address.embed';
import {
  CompanyAddressHistory,
  CompanyAddressType,
} from './schemas/company-address-history.schema';
import {
  CompanyCapitalHistory,
  CompanyCapitalType,
} from './schemas/company-capital-history.schema';
import { Company } from './schemas/company.schema';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(CompanyAddressHistory.name)
    private readonly addressHistoryModel: Model<CompanyAddressHistory>,
    @InjectModel(CompanyCapitalHistory.name)
    private readonly capitalHistoryModel: Model<CompanyCapitalHistory>,
  ) {}

  async getPrimary(authenticatedCompanyId?: string | null) {
    const company = await this.companyModel.findOne({ isPrimary: true }).exec();
    if (!company) {
      throw new NotFoundException('Primary company not found');
    }
    this.assertCompanyBoundary(String(company._id), authenticatedCompanyId);
    return createSuccessResponse(toPublicCompany(company), 'Company fetched successfully');
  }

  async getById(id: string, authenticatedCompanyId?: string | null) {
    const company = await this.requireCompany(id, authenticatedCompanyId);
    return createSuccessResponse(toPublicCompany(company), 'Company fetched successfully');
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    const company = await this.requireCompany(id, authenticatedCompanyId);
    const now = new Date();
    const update: Record<string, unknown> = {
      updatedBy: actorId ? new Types.ObjectId(actorId) : null,
    };

    if (dto.tradeName !== undefined) update.tradeName = dto.tradeName.trim();
    if (dto.email !== undefined) {
      update.email = dto.email ? dto.email.trim().toLowerCase() : null;
    }
    if (dto.phone !== undefined) update.phone = dto.phone?.trim() ?? null;
    if (dto.website !== undefined) update.website = dto.website?.trim() ?? null;
    if (dto.financialYearStartMonth !== undefined) {
      update.financialYearStartMonth = dto.financialYearStartMonth;
    }
    if (dto.status !== undefined) update.status = dto.status;

    if (dto.registeredAddress) {
      const next = toAddressEmbed(dto.registeredAddress);
      if (!addressesEqual(company.registeredAddress, next)) {
        await this.appendAddressHistory({
          companyId: company._id,
          addressType: CompanyAddressType.Registered,
          address: next,
          effectiveFrom: now,
          changeReason: dto.addressChangeReason ?? null,
          actorId,
        });
        update.registeredAddress = next;
      }
    }

    if (dto.corporateAddress) {
      const next = toAddressEmbed(dto.corporateAddress);
      if (!addressesEqual(company.corporateAddress, next)) {
        await this.appendAddressHistory({
          companyId: company._id,
          addressType: CompanyAddressType.Corporate,
          address: next,
          effectiveFrom: now,
          changeReason: dto.addressChangeReason ?? null,
          actorId,
        });
        update.corporateAddress = next;
      }
    }

    const updated = await this.companyModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    return createSuccessResponse(toPublicCompany(updated!), 'Company updated successfully');
  }

  async updateStatutory(
    id: string,
    dto: UpdateStatutoryDto,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireCompany(id, authenticatedCompanyId);

    const update: Record<string, unknown> = {
      updatedBy: actorId ? new Types.ObjectId(actorId) : null,
    };

    if (dto.legalName !== undefined) update.legalName = dto.legalName.trim();
    if (dto.cin !== undefined) update.cin = normalizeOptionalCode(dto.cin);
    if (dto.pan !== undefined) update.pan = normalizeOptionalCode(dto.pan);
    if (dto.tan !== undefined) update.tan = normalizeOptionalCode(dto.tan);
    if (dto.gstin !== undefined) update.gstin = normalizeOptionalCode(dto.gstin);

    const updated = await this.companyModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    return createSuccessResponse(
      toPublicCompany(updated!),
      'Statutory details updated successfully',
    );
  }

  /**
   * Updates current capital snapshot and appends an immutable history row.
   * Historical capital entries are never overwritten.
   */
  async updateCapital(
    id: string,
    dto: UpdateCapitalDto,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    const company = await this.requireCompany(id, authenticatedCompanyId);
    assertNonNegativeCapital(dto.newAmount, 'newAmount');

    const previousAmount =
      dto.capitalType === CompanyCapitalType.Authorised
        ? company.authorisedShareCapital
        : company.paidUpShareCapital;

    if (previousAmount === dto.newAmount) {
      throw new BadRequestException('newAmount must differ from the current capital amount');
    }

    const nextAuthorised =
      dto.capitalType === CompanyCapitalType.Authorised
        ? dto.newAmount
        : company.authorisedShareCapital;
    const nextPaidUp =
      dto.capitalType === CompanyCapitalType.PaidUp
        ? dto.newAmount
        : company.paidUpShareCapital;
    assertPaidUpNotExceedAuthorised(nextPaidUp, nextAuthorised);

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    await this.capitalHistoryModel.create({
      companyId: company._id,
      capitalType: dto.capitalType,
      previousAmount,
      newAmount: dto.newAmount,
      effectiveFrom,
      changeReason: dto.changeReason?.trim() ?? null,
      reference: dto.reference?.trim() ?? null,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });

    const field =
      dto.capitalType === CompanyCapitalType.Authorised
        ? 'authorisedShareCapital'
        : 'paidUpShareCapital';

    const updated = await this.companyModel
      .findByIdAndUpdate(
        id,
        {
          [field]: dto.newAmount,
          updatedBy: actorId ? new Types.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();

    return createSuccessResponse(
      toPublicCompany(updated!),
      'Capital updated successfully; history entry appended',
    );
  }

  async setLogo(
    id: string,
    logoPath: string,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireCompany(id, authenticatedCompanyId);
    const updated = await this.companyModel
      .findByIdAndUpdate(
        id,
        {
          logo: logoPath,
          updatedBy: actorId ? new Types.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();
    return createSuccessResponse(toPublicCompany(updated!), 'Company logo updated successfully');
  }

  async listAddressHistory(
    id: string,
    query: { page?: number; limit?: number; addressType?: CompanyAddressType },
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireCompany(id, authenticatedCompanyId);
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(id) };
    if (query.addressType) filter.addressType = query.addressType;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.addressHistoryModel
        .find(filter)
        .sort({ effectiveFrom: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.addressHistoryModel.countDocuments(filter).exec(),
    ]);

    const data: PublicAddressHistory[] = items.map((item) => ({
      id: String(item._id),
      companyId: String(item.companyId),
      addressType: item.addressType,
      address: item.address,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo ?? null,
      changeReason: item.changeReason ?? null,
      createdAt: item.createdAt,
    }));

    return createSuccessResponse(
      data,
      'Address history fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async listCapitalHistory(
    id: string,
    query: { page?: number; limit?: number; capitalType?: CompanyCapitalType },
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireCompany(id, authenticatedCompanyId);
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(id) };
    if (query.capitalType) filter.capitalType = query.capitalType;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.capitalHistoryModel
        .find(filter)
        .sort({ effectiveFrom: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.capitalHistoryModel.countDocuments(filter).exec(),
    ]);

    const data: PublicCapitalHistory[] = items.map((item) => ({
      id: String(item._id),
      companyId: String(item.companyId),
      capitalType: item.capitalType,
      previousAmount: item.previousAmount,
      newAmount: item.newAmount,
      effectiveFrom: item.effectiveFrom,
      changeReason: item.changeReason ?? null,
      reference: item.reference ?? null,
      createdAt: item.createdAt,
    }));

    return createSuccessResponse(
      data,
      'Capital history fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async appendAddressHistory(input: {
    companyId: Types.ObjectId;
    addressType: CompanyAddressType;
    address: ReturnType<typeof toAddressEmbed>;
    effectiveFrom: Date;
    changeReason: string | null;
    actorId?: string;
  }) {
    await this.addressHistoryModel
      .updateMany(
        {
          companyId: input.companyId,
          addressType: input.addressType,
          effectiveTo: null,
        },
        { effectiveTo: input.effectiveFrom },
      )
      .exec();

    await this.addressHistoryModel.create({
      companyId: input.companyId,
      addressType: input.addressType,
      address: input.address,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
      changeReason: input.changeReason,
      createdBy: input.actorId ? new Types.ObjectId(input.actorId) : null,
    });
  }

  private assertCompanyBoundary(
    id: string,
    authenticatedCompanyId?: string | null,
  ): void {
    // Undefined is reserved for trusted internal callers and legacy unit tests.
    if (authenticatedCompanyId === undefined) {
      return;
    }
    if (
      !authenticatedCompanyId ||
      !Types.ObjectId.isValid(authenticatedCompanyId) ||
      !new Types.ObjectId(id).equals(authenticatedCompanyId)
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async requireCompany(
    id: string,
    authenticatedCompanyId?: string | null,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid company id');
    }
    this.assertCompanyBoundary(id, authenticatedCompanyId);
    const company = await this.companyModel.findById(id).exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }
}
