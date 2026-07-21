import {
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
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
import { toPublicDepartment } from './employees.mapper';
import {
  Department,
  DepartmentStatus,
} from './schemas/department.schema';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<Department>,
  ) {}

  async create(dto: CreateDepartmentDto, companyId: string, actorId?: string) {
    this.requireCompany(companyId);
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await this.departmentModel.create({
        companyId: new Types.ObjectId(companyId),
        code,
        name: dto.name.trim(),
        status: DepartmentStatus.Active,
        headUserId: dto.headUserId
          ? new Types.ObjectId(dto.headUserId)
          : null,
        description: dto.description?.trim() ?? null,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(
        toPublicDepartment(row),
        'Department created',
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(`Department code ${code} already exists`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireDepartment(id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.headUserId !== undefined) {
      row.headUserId = dto.headUserId
        ? new Types.ObjectId(dto.headUserId)
        : null;
    }
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(toPublicDepartment(row), 'Department updated');
  }

  async activate(id: string, companyId: string, actorId?: string) {
    const row = await this.requireDepartment(id, companyId);
    row.status = DepartmentStatus.Active;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(toPublicDepartment(row), 'Department activated');
  }

  async deactivate(id: string, companyId: string, actorId?: string) {
    const row = await this.requireDepartment(id, companyId);
    row.status = DepartmentStatus.Inactive;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicDepartment(row),
      'Department deactivated',
    );
  }

  async list(companyId: string) {
    this.requireCompany(companyId);
    const items = await this.departmentModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ name: 1 })
      .exec();
    return createSuccessResponse(
      items.map((item) => toPublicDepartment(item)),
      'Departments fetched',
    );
  }

  async findByCode(companyId: string, code: string) {
    return this.departmentModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        code: code.trim().toUpperCase(),
      })
      .exec();
  }

  async ensureByCode(
    companyId: string,
    code: string,
    name: string,
    description?: string | null,
  ) {
    const existing = await this.findByCode(companyId, code);
    if (existing) return existing;
    return this.departmentModel.create({
      companyId: new Types.ObjectId(companyId),
      code: code.trim().toUpperCase(),
      name,
      status: DepartmentStatus.Active,
      description: description ?? null,
    });
  }

  async requireDepartment(id: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Department not found');
    }
    const row = await this.departmentModel.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Department not found');
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
