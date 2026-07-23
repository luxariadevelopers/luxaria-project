import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import type {
  CreateDesignationDto,
  UpdateDesignationDto,
} from './dto/designation.dto';
import { toPublicDesignation } from './employees.mapper';
import {
  Designation,
  DesignationStatus,
} from './schemas/designation.schema';
import { Employee } from './schemas/employee.schema';

@Injectable()
export class DesignationsService {
  constructor(
    @InjectModel(Designation.name)
    private readonly designationModel: Model<Designation>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
  ) {}

  async create(dto: CreateDesignationDto, companyId: string, actorId?: string) {
    this.requireCompany(companyId);
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await this.designationModel.create({
        companyId: new Types.ObjectId(companyId),
        code,
        name: dto.name.trim(),
        departmentId: dto.departmentId
          ? new Types.ObjectId(dto.departmentId)
          : null,
        defaultRoleCode: dto.defaultRoleCode
          ? dto.defaultRoleCode.trim().toUpperCase()
          : null,
        reportingLevel: dto.reportingLevel ?? null,
        mobileEligible: Boolean(dto.mobileEligible),
        status: DesignationStatus.Active,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(
        toPublicDesignation(row),
        'Designation created',
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(`Designation code ${code} already exists`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateDesignationDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireDesignation(id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.departmentId !== undefined) {
      row.departmentId = dto.departmentId
        ? new Types.ObjectId(dto.departmentId)
        : null;
    }
    if (dto.defaultRoleCode !== undefined) {
      row.defaultRoleCode = dto.defaultRoleCode
        ? dto.defaultRoleCode.trim().toUpperCase()
        : null;
    }
    if (dto.reportingLevel !== undefined) {
      row.reportingLevel = dto.reportingLevel;
    }
    if (dto.mobileEligible !== undefined) {
      row.mobileEligible = dto.mobileEligible;
    }
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicDesignation(row),
      'Designation updated',
    );
  }

  async activate(id: string, companyId: string, actorId?: string) {
    const row = await this.requireDesignation(id, companyId);
    row.status = DesignationStatus.Active;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicDesignation(row),
      'Designation activated',
    );
  }

  async deactivate(id: string, companyId: string, actorId?: string) {
    const row = await this.requireDesignation(id, companyId);
    row.status = DesignationStatus.Inactive;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicDesignation(row),
      'Designation deactivated',
    );
  }

  async remove(id: string, companyId: string, actorId?: string) {
    const row = await this.requireDesignation(id, companyId);
    const employeeCount = await this.employeeModel
      .countDocuments({ designationId: row._id })
      .exec();
    if (employeeCount > 0) {
      throw new BadRequestException(
        `Cannot delete "${row.name}": ${employeeCount} employee(s) are still assigned to this designation. Reassign or remove those employees first, then delete the designation.`,
      );
    }
    await row.softDelete(
      actorId && Types.ObjectId.isValid(actorId)
        ? new Types.ObjectId(actorId)
        : null,
    );
    return createSuccessResponse(
      toPublicDesignation(row),
      'Designation deleted',
    );
  }

  async list(companyId: string) {
    this.requireCompany(companyId);
    const items = await this.designationModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ name: 1 })
      .exec();
    return createSuccessResponse(
      items.map((item) => toPublicDesignation(item)),
      'Designations fetched',
    );
  }

  async findByCode(companyId: string, code: string) {
    return this.designationModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        code: code.trim().toUpperCase(),
      })
      .exec();
  }

  async ensureByCode(input: {
    companyId: string;
    code: string;
    name: string;
    departmentId?: string | null;
    defaultRoleCode?: string | null;
    reportingLevel?: number | null;
    mobileEligible?: boolean;
  }) {
    const existing = await this.findByCode(input.companyId, input.code);
    if (existing) return existing;
    return this.designationModel.create({
      companyId: new Types.ObjectId(input.companyId),
      code: input.code.trim().toUpperCase(),
      name: input.name,
      departmentId: input.departmentId
        ? new Types.ObjectId(input.departmentId)
        : null,
      defaultRoleCode: input.defaultRoleCode
        ? input.defaultRoleCode.trim().toUpperCase()
        : null,
      reportingLevel: input.reportingLevel ?? null,
      mobileEligible: Boolean(input.mobileEligible),
      status: DesignationStatus.Active,
    });
  }

  async requireDesignation(id: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Designation not found');
    }
    const row = await this.designationModel.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Designation not found');
    }
    return row;
  }

  private requireCompany(
    companyId: string | null | undefined,
  ): asserts companyId is string {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new ForbiddenException('Authenticated company context required');
    }
  }
}
