import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { Company } from '../company/schemas/company.schema';
import { Project } from '../projects/schemas/project.schema';
import { toPublicCostCentre } from './cost-centres.mapper';
import type {
  CreateCostCentreDto,
  ListCostCentresQueryDto,
  UpdateCostCentreDto,
} from './dto/cost-centre.dto';
import {
  CostCentre,
  CostCentreKind,
  CostCentreStatus,
} from './schemas/cost-centre.schema';

@Injectable()
export class CostCentresService {
  constructor(
    @InjectModel(CostCentre.name)
    private readonly model: Model<CostCentre>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async create(dto: CreateCostCentreDto, actorId: string) {
    const code = dto.code.trim().toUpperCase();
    await this.assertCodeAvailable(code);
    await this.assertCompany(dto.companyId ?? null);
    await this.assertProjectScope(dto.projectId ?? null, dto.companyId ?? null);

    const parentId = await this.resolveParent(
      dto.parentId ?? null,
      dto.kind,
      dto.companyId ?? null,
      dto.projectId ?? null,
    );

    const row = await this.model.create({
      code,
      name: dto.name.trim(),
      kind: dto.kind,
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : null,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      parentId,
      status: CostCentreStatus.Active,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicCostCentre(row), 'Cost centre created');
  }

  async update(id: string, dto: UpdateCostCentreDto, actorId: string) {
    const row = await this.requireRow(id);

    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.kind !== undefined) row.kind = dto.kind;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    if (dto.companyId !== undefined) {
      await this.assertCompany(dto.companyId);
      row.companyId = dto.companyId ? new Types.ObjectId(dto.companyId) : null;
    }
    if (dto.projectId !== undefined) {
      await this.assertProjectScope(
        dto.projectId,
        dto.companyId !== undefined
          ? dto.companyId
          : row.companyId
            ? String(row.companyId)
            : null,
      );
      row.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }

    if (dto.parentId !== undefined || dto.kind !== undefined) {
      const parentId = await this.resolveParent(
        dto.parentId !== undefined
          ? dto.parentId
          : row.parentId
            ? String(row.parentId)
            : null,
        row.kind,
        row.companyId ? String(row.companyId) : null,
        row.projectId ? String(row.projectId) : null,
        id,
      );
      row.parentId = parentId;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicCostCentre(row), 'Cost centre updated');
  }

  async activate(id: string, actorId: string) {
    const row = await this.requireRow(id);
    row.status = CostCentreStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicCostCentre(row), 'Cost centre activated');
  }

  async deactivate(id: string, actorId: string) {
    const row = await this.requireRow(id);
    const childActive = await this.model
      .countDocuments({
        parentId: row._id,
        status: CostCentreStatus.Active,
      })
      .exec();
    if (childActive > 0) {
      throw new BadRequestException(
        'Deactivate child cost centres before deactivating a parent',
      );
    }
    row.status = CostCentreStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCostCentre(row),
      'Cost centre deactivated',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(toPublicCostCentre(row));
  }

  async list(query: ListCostCentresQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CostCentre> = {};

    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.kind) filter.kind = query.kind;
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
      ];
    }

    const sortField = query.sortBy ?? 'code';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'desc' ? -1 : 1,
    };

    const [rows, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicCostCentre(r)),
      'Cost centres fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  /** Journal / voucher modules: reject inactive cost centres on lines. */
  async assertActive(id: string): Promise<CostCentre> {
    const row = await this.requireRow(id);
    if (row.status !== CostCentreStatus.Active) {
      throw new BadRequestException('Cost centre is inactive');
    }
    return row;
  }

  // ─── internals ───────────────────────────────────────────────────────

  private async assertCodeAvailable(code: string) {
    const existing = await this.model
      .findOne({ code })
      .setOptions({ withDeleted: true })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(`Cost centre code ${code} already exists`);
    }
  }

  private async assertCompany(companyId: string | null) {
    if (!companyId) return;
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid companyId');
    }
    const company = await this.companyModel
      .findById(companyId)
      .select('_id')
      .lean()
      .exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private async assertProjectScope(
    projectId: string | null,
    companyId: string | null,
  ) {
    if (!projectId) return;
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel
      .findById(projectId)
      .select('companyId')
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (
      companyId &&
      project.companyId &&
      String(project.companyId) !== companyId
    ) {
      throw new BadRequestException('projectId company mismatch');
    }
  }

  private async resolveParent(
    parentId: string | null,
    kind: CostCentreKind,
    companyId: string | null,
    projectId: string | null,
    movingId?: string,
  ): Promise<Types.ObjectId | null> {
    if (!parentId) return null;

    const parent = await this.requireRow(parentId);
    if (parent.kind !== kind) {
      throw new BadRequestException(
        'Parent cost centre kind must match child kind',
      );
    }
    if (movingId && String(parent._id) === movingId) {
      throw new BadRequestException('Cost centre cannot be its own parent');
    }
    if (movingId) {
      await this.assertNotDescendant(movingId, String(parent._id));
    }

    const parentCompany = parent.companyId ? String(parent.companyId) : null;
    const parentProject = parent.projectId ? String(parent.projectId) : null;
    if (companyId && parentCompany && companyId !== parentCompany) {
      throw new BadRequestException('Parent company scope mismatch');
    }
    if (projectId && parentProject && projectId !== parentProject) {
      throw new BadRequestException('Parent project scope mismatch');
    }

    return parent._id as Types.ObjectId;
  }

  private async assertNotDescendant(
    centreId: string,
    candidateParentId: string,
  ) {
    let currentId: string | null = candidateParentId;
    const guard = new Set<string>();
    while (currentId) {
      if (currentId === centreId) {
        throw new BadRequestException(
          'Cannot assign a descendant as parent cost centre',
        );
      }
      if (guard.has(currentId)) break;
      guard.add(currentId);
      const node = await this.model.findById(currentId).lean().exec();
      currentId = node?.parentId ? String(node.parentId) : null;
    }
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Cost centre not found');
    }
    const row = await this.model.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Cost centre not found');
    }
    return row;
  }
}
