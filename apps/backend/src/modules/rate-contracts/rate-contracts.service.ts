import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, HydratedDocument, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import { Project } from '../projects/schemas/project.schema';
import type {
  CreateRateContractDto,
  ListRateContractsQueryDto,
  RateContractAdvanceRecoveryDto,
  RateContractBoqItemRateDto,
  RateContractEquipmentRateDto,
  RateContractEscalationClauseDto,
  RateContractLabourRateDto,
  RateContractMaterialInclusiveRateDto,
  RateContractPenaltyRulesDto,
  RateContractSecurityDepositDto,
  RateContractTaxConfigDto,
  SupersedeRateContractDto,
  TerminateRateContractDto,
  UpdateRateContractDto,
} from './dto/rate-contract.dto';
import { toPublicRateContract } from './rate-contracts.mapper';
import {
  RateContract,
  RateContractScope,
  RateContractStatus,
} from './schemas/rate-contract.schema';

const EDITABLE: RateContractStatus[] = [RateContractStatus.Draft];

@Injectable()
export class RateContractsService {
  constructor(
    @InjectModel(RateContract.name)
    private readonly model: Model<RateContract>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async create(dto: CreateRateContractDto, actorId: string) {
    const contractor = await this.requireActiveContractor(dto.contractorId);
    const { scope, projectId } = await this.resolveScope(dto);

    const validityFrom = this.parseDate(dto.validityFrom, 'validityFrom');
    const validityTo = this.parseDate(dto.validityTo, 'validityTo');
    this.assertDateRange(validityFrom, validityTo);
    this.assertHasRates(dto);

    const contractNumber = await this.nextContractNumber();

    try {
      const row = await this.model.create({
        contractNumber,
        version: 1,
        supersedesId: null,
        companyId: contractor.companyId ?? null,
        contractorId: new Types.ObjectId(dto.contractorId),
        projectId,
        scope,
        title: dto.title?.trim() || null,
        boqItemRates: this.mapBoqRates(dto.boqItemRates),
        labourRates: this.mapLabourRates(dto.labourRates),
        materialInclusiveRates: this.mapMaterialRates(
          dto.materialInclusiveRates,
        ),
        equipmentRates: this.mapEquipmentRates(dto.equipmentRates),
        validityFrom,
        validityTo,
        escalationClauses: this.mapEscalation(dto.escalationClauses),
        taxConfig: this.mapTaxConfig(dto.taxConfig),
        retentionPercent: dto.retentionPercent ?? 0,
        securityDeposit: this.mapSecurityDeposit(dto.securityDeposit),
        advanceRecovery: this.mapAdvanceRecovery(dto.advanceRecovery),
        penaltyRules: this.mapPenaltyRules(dto.penaltyRules),
        status: RateContractStatus.Draft,
        notes: dto.notes?.trim() || null,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicRateContract(row),
        'Rate contract created as draft',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateRateContractDto, actorId: string) {
    const row = await this.requireRow(id);
    if (!EDITABLE.includes(row.status)) {
      throw new BadRequestException('Only draft rate contracts can be updated');
    }

    if (dto.contractorId !== undefined) {
      throw new BadRequestException(
        'contractorId cannot be changed after create; supersede instead',
      );
    }

    if (dto.scope !== undefined || dto.projectId !== undefined) {
      const scope = dto.scope ?? row.scope;
      const projectIdRaw =
        dto.projectId !== undefined ? dto.projectId : oidOrNull(row.projectId);
      const resolved = await this.resolveScope({
        scope,
        projectId: projectIdRaw,
      });
      row.scope = resolved.scope;
      row.projectId = resolved.projectId;
    }

    this.applyEditableFields(row, dto);
    row.set('updatedBy', new Types.ObjectId(actorId));

    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }

    return createSuccessResponse(
      toPublicRateContract(row),
      'Rate contract updated',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicRateContract(row),
      'Rate contract fetched',
    );
  }

  async list(query: ListRateContractsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<RateContract> = {};

    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.scope) filter.scope = query.scope;
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const q = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { contractNumber: new RegExp(q, 'i') },
        { title: new RegExp(q, 'i') },
      ];
    }

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
      items.map((row) => toPublicRateContract(row)),
      'Rate contracts listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async listByContractor(contractorId: string, query: ListRateContractsQueryDto) {
    return this.list({ ...query, contractorId });
  }

  async listByProject(projectId: string, query: ListRateContractsQueryDto) {
    return this.list({ ...query, projectId });
  }

  /**
   * Activate a draft. If it supersedes another version, that prior active
   * version is marked superseded atomically with activation.
   */
  async activate(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== RateContractStatus.Draft) {
      throw new BadRequestException('Only draft rate contracts can be activated');
    }

    const now = new Date();
    if (row.validityTo < now) {
      throw new BadRequestException(
        'Cannot activate a rate contract past its validityTo date',
      );
    }
    this.assertHasRates({
      boqItemRates: row.boqItemRates,
      labourRates: row.labourRates,
      materialInclusiveRates: row.materialInclusiveRates,
      equipmentRates: row.equipmentRates,
    });

    if (row.supersedesId) {
      await this.model
        .updateOne(
          {
            _id: row.supersedesId,
            status: RateContractStatus.Active,
          },
          {
            $set: {
              status: RateContractStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    } else {
      await this.model
        .updateMany(
          {
            contractNumber: row.contractNumber,
            _id: { $ne: row._id },
            status: RateContractStatus.Active,
          },
          {
            $set: {
              status: RateContractStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    row.status = RateContractStatus.Active;
    row.activatedBy = new Types.ObjectId(actorId);
    row.activatedAt = now;
    row.set('updatedBy', new Types.ObjectId(actorId));

    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }

    return createSuccessResponse(
      toPublicRateContract(row),
      'Rate contract activated',
    );
  }

  /**
   * Create a new draft version from an active contract (schedule amendment).
   * Prior version stays active until the new draft is activated.
   */
  async supersede(
    id: string,
    dto: SupersedeRateContractDto,
    actorId: string,
  ) {
    const current = await this.requireRow(id);
    if (current.status !== RateContractStatus.Active) {
      throw new BadRequestException(
        'Only active rate contracts can be superseded',
      );
    }

    const open = await this.model
      .findOne({
        contractNumber: current.contractNumber,
        status: RateContractStatus.Draft,
      })
      .exec();
    if (open) {
      throw new ConflictException(
        'A draft superseding version already exists for this rate contract',
      );
    }

    const validityFrom = dto.validityFrom
      ? this.parseDate(dto.validityFrom, 'validityFrom')
      : current.validityFrom;
    const validityTo = dto.validityTo
      ? this.parseDate(dto.validityTo, 'validityTo')
      : current.validityTo;
    this.assertDateRange(validityFrom, validityTo);

    const nextVersion = current.version + 1;

    try {
      const row = await this.model.create({
        contractNumber: current.contractNumber,
        version: nextVersion,
        supersedesId: current._id,
        companyId: current.companyId,
        contractorId: current.contractorId,
        projectId: current.projectId,
        scope: current.scope,
        title:
          dto.title !== undefined
            ? dto.title?.trim() || null
            : current.title,
        boqItemRates:
          dto.boqItemRates !== undefined
            ? this.mapBoqRates(dto.boqItemRates)
            : this.cloneBoqRates(current.boqItemRates),
        labourRates:
          dto.labourRates !== undefined
            ? this.mapLabourRates(dto.labourRates)
            : this.cloneLabourRates(current.labourRates),
        materialInclusiveRates:
          dto.materialInclusiveRates !== undefined
            ? this.mapMaterialRates(dto.materialInclusiveRates)
            : this.cloneMaterialRates(current.materialInclusiveRates),
        equipmentRates:
          dto.equipmentRates !== undefined
            ? this.mapEquipmentRates(dto.equipmentRates)
            : this.cloneEquipmentRates(current.equipmentRates),
        validityFrom,
        validityTo,
        escalationClauses:
          dto.escalationClauses !== undefined
            ? this.mapEscalation(dto.escalationClauses)
            : current.escalationClauses,
        taxConfig:
          dto.taxConfig !== undefined
            ? this.mapTaxConfig(dto.taxConfig)
            : current.taxConfig,
        retentionPercent:
          dto.retentionPercent !== undefined
            ? dto.retentionPercent
            : current.retentionPercent,
        securityDeposit:
          dto.securityDeposit !== undefined
            ? this.mapSecurityDeposit(dto.securityDeposit)
            : current.securityDeposit,
        advanceRecovery:
          dto.advanceRecovery !== undefined
            ? this.mapAdvanceRecovery(dto.advanceRecovery)
            : current.advanceRecovery,
        penaltyRules:
          dto.penaltyRules !== undefined
            ? this.mapPenaltyRules(dto.penaltyRules)
            : current.penaltyRules,
        status: RateContractStatus.Draft,
        notes:
          dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicRateContract(row),
        `Rate contract version ${nextVersion} created as draft`,
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async terminate(
    id: string,
    dto: TerminateRateContractDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== RateContractStatus.Active) {
      throw new BadRequestException(
        'Only active rate contracts can be terminated',
      );
    }

    row.status = RateContractStatus.Terminated;
    row.terminatedBy = new Types.ObjectId(actorId);
    row.terminatedAt = new Date();
    row.terminationReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicRateContract(row),
      'Rate contract terminated',
    );
  }

  async remove(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== RateContractStatus.Draft) {
      throw new BadRequestException('Only draft rate contracts can be deleted');
    }

    row.set('isDeleted', true);
    row.set('deletedAt', new Date());
    row.set('deletedBy', new Types.ObjectId(actorId));
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(null, 'Rate contract deleted');
  }

  private applyEditableFields(
    row: HydratedDocument<RateContract>,
    dto: UpdateRateContractDto | SupersedeRateContractDto,
  ) {
    if (dto.title !== undefined) row.title = dto.title?.trim() || null;
    if (dto.boqItemRates !== undefined) {
      row.boqItemRates = this.mapBoqRates(dto.boqItemRates) as never;
      row.markModified('boqItemRates');
    }
    if (dto.labourRates !== undefined) {
      row.labourRates = this.mapLabourRates(dto.labourRates) as never;
      row.markModified('labourRates');
    }
    if (dto.materialInclusiveRates !== undefined) {
      row.materialInclusiveRates = this.mapMaterialRates(
        dto.materialInclusiveRates,
      ) as never;
      row.markModified('materialInclusiveRates');
    }
    if (dto.equipmentRates !== undefined) {
      row.equipmentRates = this.mapEquipmentRates(dto.equipmentRates) as never;
      row.markModified('equipmentRates');
    }
    if (dto.validityFrom !== undefined) {
      row.validityFrom = this.parseDate(dto.validityFrom, 'validityFrom');
    }
    if (dto.validityTo !== undefined) {
      row.validityTo = this.parseDate(dto.validityTo, 'validityTo');
    }
    if (dto.validityFrom !== undefined || dto.validityTo !== undefined) {
      this.assertDateRange(row.validityFrom, row.validityTo);
    }
    if (dto.escalationClauses !== undefined) {
      row.escalationClauses = this.mapEscalation(dto.escalationClauses) as never;
      row.markModified('escalationClauses');
    }
    if (dto.taxConfig !== undefined) {
      row.taxConfig = this.mapTaxConfig(dto.taxConfig) as never;
      row.markModified('taxConfig');
    }
    if (dto.retentionPercent !== undefined) {
      row.retentionPercent = dto.retentionPercent;
    }
    if (dto.securityDeposit !== undefined) {
      row.securityDeposit = this.mapSecurityDeposit(
        dto.securityDeposit,
      ) as never;
      row.markModified('securityDeposit');
    }
    if (dto.advanceRecovery !== undefined) {
      row.advanceRecovery = this.mapAdvanceRecovery(
        dto.advanceRecovery,
      ) as never;
      row.markModified('advanceRecovery');
    }
    if (dto.penaltyRules !== undefined) {
      row.penaltyRules = this.mapPenaltyRules(dto.penaltyRules) as never;
      row.markModified('penaltyRules');
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
  }

  private async resolveScope(dto: {
    scope: RateContractScope;
    projectId?: string | null;
  }): Promise<{
    scope: RateContractScope;
    projectId: Types.ObjectId | null;
  }> {
    if (dto.scope === RateContractScope.Company) {
      if (dto.projectId) {
        throw new BadRequestException(
          'company-scoped rate contracts must not set projectId',
        );
      }
      return { scope: RateContractScope.Company, projectId: null };
    }

    if (!dto.projectId) {
      throw new BadRequestException(
        'project-scoped rate contracts require projectId',
      );
    }
    await this.requireProject(dto.projectId);
    return {
      scope: RateContractScope.Project,
      projectId: new Types.ObjectId(dto.projectId),
    };
  }

  private assertHasRates(dto: {
    boqItemRates?: unknown[] | null;
    labourRates?: unknown[] | null;
    materialInclusiveRates?: unknown[] | null;
    equipmentRates?: unknown[] | null;
  }) {
    const count =
      (dto.boqItemRates?.length ?? 0) +
      (dto.labourRates?.length ?? 0) +
      (dto.materialInclusiveRates?.length ?? 0) +
      (dto.equipmentRates?.length ?? 0);
    if (count === 0) {
      throw new BadRequestException(
        'At least one rate line is required (BOQ, labour, material-inclusive, or equipment)',
      );
    }
  }

  private assertDateRange(from: Date, to: Date) {
    if (to < from) {
      throw new BadRequestException('validityTo must be on or after validityFrom');
    }
  }

  private parseDate(value: string, field: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return d;
  }

  private async nextContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RC-${year}-`;
    const count = await this.model
      .countDocuments({ contractNumber: new RegExp(`^${prefix}`) })
      .setOptions({ withDeleted: true })
      .exec();
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Rate contract not found');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Rate contract not found');
    return row;
  }

  private async requireActiveContractor(contractorId: string) {
    if (!Types.ObjectId.isValid(contractorId)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel.findById(contractorId).exec();
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    if (contractor.status !== ContractorStatus.Active) {
      throw new BadRequestException('Contractor must be active');
    }
    return contractor;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private mapBoqRates(items?: RateContractBoqItemRateDto[] | null) {
    return (items ?? []).map((item) => ({
      boqItemId: item.boqItemId ? new Types.ObjectId(item.boqItemId) : null,
      boqCode: item.boqCode?.trim() || null,
      description: item.description.trim(),
      unit: item.unit,
      rate: item.rate,
      remarks: item.remarks?.trim() || null,
    }));
  }

  private mapLabourRates(items?: RateContractLabourRateDto[] | null) {
    return (items ?? []).map((item) => ({
      skill: item.skill.trim(),
      category: item.category?.trim() || null,
      unit: item.unit,
      rate: item.rate,
      remarks: item.remarks?.trim() || null,
    }));
  }

  private mapMaterialRates(
    items?: RateContractMaterialInclusiveRateDto[] | null,
  ) {
    return (items ?? []).map((item) => ({
      description: item.description.trim(),
      unit: item.unit,
      rate: item.rate,
      includesMaterials: (item.includesMaterials ?? []).map((m) => m.trim()),
      remarks: item.remarks?.trim() || null,
    }));
  }

  private mapEquipmentRates(items?: RateContractEquipmentRateDto[] | null) {
    return (items ?? []).map((item) => ({
      equipmentType: item.equipmentType.trim(),
      unit: item.unit,
      rate: item.rate,
      withOperator: item.withOperator ?? false,
      fuelInclusive: item.fuelInclusive ?? false,
      remarks: item.remarks?.trim() || null,
    }));
  }

  private mapEscalation(items?: RateContractEscalationClauseDto[] | null) {
    return (items ?? []).map((c) => ({
      indexName: c.indexName?.trim() || null,
      formula: c.formula?.trim() || null,
      baseDate: c.baseDate ? this.parseDate(c.baseDate, 'baseDate') : null,
      percent: c.percent ?? null,
      notes: c.notes?.trim() || null,
    }));
  }

  private mapTaxConfig(dto?: RateContractTaxConfigDto | null) {
    return {
      gstPercent: dto?.gstPercent ?? null,
      gstInclusive: dto?.gstInclusive ?? false,
      tdsPercent: dto?.tdsPercent ?? null,
      notes: dto?.notes?.trim() || null,
    };
  }

  private mapSecurityDeposit(dto?: RateContractSecurityDepositDto | null) {
    return {
      amount: dto?.amount ?? null,
      percent: dto?.percent ?? null,
      instrumentType: dto?.instrumentType?.trim() || null,
      notes: dto?.notes?.trim() || null,
    };
  }

  private mapAdvanceRecovery(dto?: RateContractAdvanceRecoveryDto | null) {
    return {
      method: dto?.method?.trim() || null,
      percentPerBill: dto?.percentPerBill ?? null,
      startAfterBillNumber: dto?.startAfterBillNumber ?? null,
      notes: dto?.notes?.trim() || null,
    };
  }

  private mapPenaltyRules(dto?: RateContractPenaltyRulesDto | null) {
    return {
      ldPercentPerDay: dto?.ldPercentPerDay ?? null,
      ldCapPercent: dto?.ldCapPercent ?? null,
      description: dto?.description?.trim() || null,
      notes: dto?.notes?.trim() || null,
    };
  }

  private cloneBoqRates(items: RateContract['boqItemRates']) {
    return items.map((item) => ({
      boqItemId: item.boqItemId,
      boqCode: item.boqCode,
      description: item.description,
      unit: item.unit,
      rate: item.rate,
      remarks: item.remarks,
    }));
  }

  private cloneLabourRates(items: RateContract['labourRates']) {
    return items.map((item) => ({
      skill: item.skill,
      category: item.category,
      unit: item.unit,
      rate: item.rate,
      remarks: item.remarks,
    }));
  }

  private cloneMaterialRates(items: RateContract['materialInclusiveRates']) {
    return items.map((item) => ({
      description: item.description,
      unit: item.unit,
      rate: item.rate,
      includesMaterials: [...(item.includesMaterials ?? [])],
      remarks: item.remarks,
    }));
  }

  private cloneEquipmentRates(items: RateContract['equipmentRates']) {
    return items.map((item) => ({
      equipmentType: item.equipmentType,
      unit: item.unit,
      rate: item.rate,
      withOperator: item.withOperator,
      fuelInclusive: item.fuelInclusive,
      remarks: item.remarks,
    }));
  }

  private rethrowDuplicateKey(error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ConflictException(
        'A conflicting rate contract version already exists',
      );
    }
  }
}

function oidOrNull(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}
