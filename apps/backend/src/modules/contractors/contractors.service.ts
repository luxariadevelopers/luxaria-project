import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  accountNumberLast4,
  decryptSensitive,
  encryptSensitive,
} from '../../common/utils/crypto.util';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { normalizeOptionalCode } from '../company/company.validation';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import type { AssignContractorProjectDto } from './dto/assign-contractor-project.dto';
import type {
  BlockContractorDto,
  DeactivateContractorDto,
  ReactivateContractorDto,
  SuspendContractorDto,
} from './dto/block-contractor.dto';
import type { CreateContractorDto } from './dto/create-contractor.dto';
import type { UpdateContractorDto } from './dto/update-contractor.dto';
import type { VerifyContractorDocumentDto } from './dto/verify-document.dto';
import type { VerifyContractorDto } from './dto/verify-contractor.dto';
import {
  toPublicContractor,
  toPublicContractorDocument,
  toPublicContractorProjectAssignment,
} from './contractors.mapper';
import {
  assertContractorStatusTransition,
  assertInsuranceDates,
  assertLabourLicenceDates,
  assertOptionalPanGstin,
  assertRating,
  assertValidAccountNumber,
  assertValidIfsc,
  assertWorkCategories,
  complianceIsValid,
  labourLicenceIsValid,
} from './contractors.validation';
import {
  ContractorDocumentCategory,
  ContractorDocumentVerificationStatus,
  ContractorFile,
} from './schemas/contractor-document.schema';
import {
  ContractorProjectAssignment,
  ContractorProjectAssignmentStatus,
} from './schemas/contractor-project-assignment.schema';
import {
  Contractor,
  ContractorStatus,
  ContractorStatusAction,
  ContractorType,
  ContractorVerificationStatus,
} from './schemas/contractor.schema';

@Injectable()
export class ContractorsService {
  constructor(
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(ContractorFile.name)
    private readonly documentModel: Model<ContractorFile>,
    @InjectModel(ContractorProjectAssignment.name)
    private readonly assignmentModel: Model<ContractorProjectAssignment>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(WorkMeasurement.name)
    private readonly measurementModel: Model<WorkMeasurement>,
    private readonly numberingService: NumberingService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateContractorDto, actorId: string) {
    const pan = normalizeOptionalCode(dto.pan ?? null);
    const gstin = normalizeOptionalCode(dto.gstin ?? null);
    this.assertWriteRules({
      pan,
      gstin,
      workCategories: dto.workCategories,
      rating: dto.rating,
      bankDetails: dto.bankDetails,
      labourLicence: dto.labourLicence,
      insurance: dto.insurance,
    });

    const companyId = await this.resolveCompanyId(dto.companyId);
    const contractorCode = await this.numberingService.nextCode(
      NumberEntityType.CONTRACTOR,
    );

    const contacts = this.normalizeContacts(dto.contacts, dto.contact);
    const contact = this.primaryContactFrom(contacts, dto.contact);
    const addresses = this.normalizeAddresses(dto.addresses, dto.contact);

    try {
      const contractor = await this.contractorModel.create({
        companyId,
        contractorCode,
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName?.trim() || null,
        contractorType: dto.contractorType,
        pan,
        gstin,
        contact,
        contacts,
        addresses,
        bankDetails: this.buildBankDetailsForWrite(dto.bankDetails),
        labourLicence: this.normalizeLabourLicence(dto.labourLicence),
        insurance: this.normalizeInsurance(dto.insurance),
        workCategories: assertWorkCategories(dto.workCategories),
        rating: dto.rating ?? null,
        notes: dto.notes?.trim() || null,
        verificationStatus: ContractorVerificationStatus.Pending,
        status: ContractorStatus.PendingVerification,
        statusEvents: [],
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        await this.toPublic(contractor, true),
        'Contractor created successfully',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateContractorDto, actorId: string) {
    const contractor = await this.requireContractor(id);

    const pan =
      dto.pan !== undefined
        ? normalizeOptionalCode(dto.pan)
        : (contractor.pan ?? null);
    const gstin =
      dto.gstin !== undefined
        ? normalizeOptionalCode(dto.gstin)
        : (contractor.gstin ?? null);

    this.assertWriteRules({
      pan,
      gstin,
      workCategories: dto.workCategories ?? contractor.workCategories ?? [],
      rating: dto.rating !== undefined ? dto.rating : contractor.rating,
      bankDetails: dto.bankDetails,
      labourLicence: dto.labourLicence,
      insurance: dto.insurance,
    });

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actorId),
    };

    if (dto.legalName !== undefined) update.legalName = dto.legalName.trim();
    if (dto.tradeName !== undefined) {
      update.tradeName = dto.tradeName?.trim() || null;
    }
    if (dto.contractorType !== undefined) {
      update.contractorType = dto.contractorType;
    }
    if (dto.pan !== undefined) update.pan = pan;
    if (dto.gstin !== undefined) update.gstin = gstin;
    if (dto.contacts !== undefined || dto.contact !== undefined) {
      const contacts = this.normalizeContacts(
        dto.contacts ??
          (contractor.contacts as CreateContractorDto['contacts']),
        dto.contact,
      );
      update.contacts = contacts;
      update.contact = this.primaryContactFrom(contacts, dto.contact);
    }
    if (dto.addresses !== undefined) {
      update.addresses = this.normalizeAddresses(dto.addresses);
    }
    if (dto.bankDetails !== undefined) {
      update.bankDetails = {
        ...this.bankToPlain(contractor.bankDetails),
        ...this.buildBankDetailsForWrite(
          dto.bankDetails,
          contractor.bankDetails,
        ),
      };
    }
    if (dto.labourLicence !== undefined) {
      update.labourLicence = {
        ...this.labourLicenceToPlain(contractor.labourLicence),
        ...this.normalizeLabourLicence(dto.labourLicence),
      };
    }
    if (dto.insurance !== undefined) {
      update.insurance = {
        ...this.insuranceToPlain(contractor.insurance),
        ...this.normalizeInsurance(dto.insurance),
      };
    }
    if (dto.workCategories !== undefined) {
      update.workCategories = assertWorkCategories(dto.workCategories);
    }
    if (dto.rating !== undefined) update.rating = dto.rating;
    if (dto.notes !== undefined) update.notes = dto.notes?.trim() || null;
    if (dto.companyId !== undefined) {
      update.companyId = await this.resolveCompanyId(dto.companyId);
    }

    try {
      const updated = await this.contractorModel
        .findByIdAndUpdate(id, update, { new: true })
        .select('+bankDetails.accountNumberEncrypted')
        .exec();

      return createSuccessResponse(
        await this.toPublic(updated!, true),
        'Contractor updated successfully',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async getById(id: string) {
    const contractor = await this.requireContractor(id);
    return createSuccessResponse(
      await this.toPublic(contractor, true),
      'Contractor fetched successfully',
    );
  }

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: ContractorStatus;
    verificationStatus?: ContractorVerificationStatus;
    contractorType?: ContractorType;
    workCategory?: string;
    companyId?: string;
    projectId?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const filter: FilterQuery<Contractor> = {};

    if (query.status) filter.status = query.status;
    if (query.verificationStatus) {
      filter.verificationStatus = query.verificationStatus;
    }
    if (query.contractorType) filter.contractorType = query.contractorType;
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.workCategory?.trim()) {
      filter.workCategories = query.workCategory.trim().toLowerCase();
    }

    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      const assignments = await this.assignmentModel
        .find({
          projectId: new Types.ObjectId(query.projectId),
          status: ContractorProjectAssignmentStatus.Active,
        })
        .select('contractorId')
        .lean()
        .exec();
      filter._id = { $in: assignments.map((a) => a.contractorId) };
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { legalName: { $regex: search, $options: 'i' } },
        { tradeName: { $regex: search, $options: 'i' } },
        { contractorCode: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
        { 'contacts.email': { $regex: search, $options: 'i' } },
        { 'contacts.phone': { $regex: search, $options: 'i' } },
        { 'bankDetails.accountNumberLast4': search.slice(-4) },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.contractorModel
        .find(filter)
        .select('+bankDetails.accountNumberEncrypted')
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.contractorModel.countDocuments(filter).exec(),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toPublic(item, true)),
    );

    return createSuccessResponse(
      data,
      'Contractors fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Contractors with labour licence or insurance expiring within `withinDays`.
   */
  async listComplianceExpiring(query: {
    withinDays?: number;
    page?: number;
    limit?: number;
    companyId?: string;
  }) {
    const withinDays = Math.min(Math.max(query.withinDays ?? 30, 1), 365);
    const now = new Date();
    const until = new Date(now);
    until.setUTCDate(until.getUTCDate() + withinDays);

    const filter: FilterQuery<Contractor> = {
      status: {
        $in: [
          ContractorStatus.Active,
          ContractorStatus.Suspended,
          ContractorStatus.PendingVerification,
        ],
      },
      $or: [
        {
          'labourLicence.validTo': { $ne: null, $lte: until },
        },
        {
          'insurance.validTo': { $ne: null, $lte: until },
        },
      ],
    };
    if (query.companyId) {
      if (!Types.ObjectId.isValid(query.companyId)) {
        throw new BadRequestException('Invalid companyId');
      }
      filter.companyId = new Types.ObjectId(query.companyId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.contractorModel
        .find(filter)
        .sort({ 'labourLicence.validTo': 1, 'insurance.validTo': 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.contractorModel.countDocuments(filter).exec(),
    ]);

    const rows = items.map((c) => {
      const licenceTo = c.labourLicence?.validTo ?? null;
      const insuranceTo = c.insurance?.validTo ?? null;
      return {
        contractorId: String(c._id),
        contractorCode: c.contractorCode,
        legalName: c.legalName,
        status: c.status,
        labourLicence: {
          licenceNumber: c.labourLicence?.licenceNumber ?? null,
          validTo: licenceTo,
          isValid: complianceIsValid({ validTo: licenceTo, asOf: now }),
          daysRemaining: this.daysRemaining(licenceTo, now),
        },
        insurance: {
          policyNumber: c.insurance?.policyNumber ?? null,
          validTo: insuranceTo,
          isValid: complianceIsValid({ validTo: insuranceTo, asOf: now }),
          daysRemaining: this.daysRemaining(insuranceTo, now),
        },
      };
    });

    return createSuccessResponse(
      {
        withinDays,
        asOf: now.toISOString(),
        rows,
      },
      'Expiring contractor compliance fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async verify(id: string, dto: VerifyContractorDto, actorId: string) {
    const contractor = await this.requireContractor(id);
    const now = new Date();
    const action = dto.verified
      ? ContractorStatusAction.Verify
      : ContractorStatusAction.Reject;
    const nextStatus = assertContractorStatusTransition(
      action,
      contractor.status,
    );

    const updated = await this.applyStatusTransition({
      contractor,
      action,
      toStatus: nextStatus,
      reason: dto.notes?.trim() || null,
      actorId,
      at: now,
      extra: {
        verificationStatus: dto.verified
          ? ContractorVerificationStatus.Verified
          : ContractorVerificationStatus.Rejected,
        verifiedBy: new Types.ObjectId(actorId),
        verifiedAt: now,
        verificationNotes: dto.notes?.trim() ?? null,
        blockReason: null,
        statusReason: null,
      },
    });

    return createSuccessResponse(
      await this.toPublic(updated, true),
      dto.verified
        ? 'Contractor verified successfully'
        : 'Contractor verification rejected',
    );
  }

  async activate(id: string, actorId: string) {
    const contractor = await this.requireContractor(id);
    if (
      contractor.verificationStatus !== ContractorVerificationStatus.Verified
    ) {
      throw new BadRequestException(
        'Contractor must be verified before activation',
      );
    }
    if (
      contractor.status === ContractorStatus.Blocked ||
      contractor.status === ContractorStatus.Suspended
    ) {
      throw new BadRequestException(
        'Suspended/blacklisted contractors must be reactivated with a reason',
      );
    }

    const nextStatus = assertContractorStatusTransition(
      ContractorStatusAction.Activate,
      contractor.status,
    );
    const updated = await this.applyStatusTransition({
      contractor,
      action: ContractorStatusAction.Activate,
      toStatus: nextStatus,
      reason: null,
      actorId,
      extra: { blockReason: null, statusReason: null },
    });

    return createSuccessResponse(
      await this.toPublic(updated, true),
      'Contractor activated successfully',
    );
  }

  async block(id: string, dto: BlockContractorDto, actorId: string) {
    return this.transitionWithReason(
      id,
      ContractorStatusAction.Blacklist,
      dto.reason,
      actorId,
      'Contractor blacklisted successfully',
    );
  }

  async suspend(id: string, dto: SuspendContractorDto, actorId: string) {
    return this.transitionWithReason(
      id,
      ContractorStatusAction.Suspend,
      dto.reason,
      actorId,
      'Contractor suspended successfully',
    );
  }

  async reactivate(
    id: string,
    dto: ReactivateContractorDto,
    actorId: string,
  ) {
    const contractor = await this.requireContractor(id);
    if (
      contractor.verificationStatus !== ContractorVerificationStatus.Verified
    ) {
      throw new BadRequestException(
        'Contractor must be verified before reactivation',
      );
    }
    return this.transitionWithReason(
      id,
      ContractorStatusAction.Reactivate,
      dto.reason,
      actorId,
      'Contractor reactivated successfully',
      { blockReason: null, statusReason: null },
    );
  }

  async deactivate(
    id: string,
    dto: DeactivateContractorDto,
    actorId: string,
  ) {
    return this.transitionWithReason(
      id,
      ContractorStatusAction.Deactivate,
      dto.reason?.trim() || null,
      actorId,
      'Contractor deactivated successfully',
    );
  }

  async assignProject(
    contractorId: string,
    dto: AssignContractorProjectDto,
    actorId: string,
  ) {
    await this.requireContractor(contractorId);
    await this.requireProject(dto.projectId);

    const existing = await this.assignmentModel
      .findOne({
        contractorId: new Types.ObjectId(contractorId),
        projectId: new Types.ObjectId(dto.projectId),
      })
      .exec();

    if (existing) {
      existing.status = ContractorProjectAssignmentStatus.Active;
      existing.notes = dto.notes?.trim() || existing.notes;
      existing.assignedBy = new Types.ObjectId(actorId);
      existing.assignedAt = new Date();
      existing.set('updatedBy', new Types.ObjectId(actorId));
      await existing.save();
      return createSuccessResponse(
        toPublicContractorProjectAssignment(existing),
        'Contractor project assignment updated',
      );
    }

    try {
      const row = await this.assignmentModel.create({
        contractorId: new Types.ObjectId(contractorId),
        projectId: new Types.ObjectId(dto.projectId),
        status: ContractorProjectAssignmentStatus.Active,
        notes: dto.notes?.trim() || null,
        assignedBy: new Types.ObjectId(actorId),
        assignedAt: new Date(),
        createdBy: new Types.ObjectId(actorId),
      });
      return createSuccessResponse(
        toPublicContractorProjectAssignment(row),
        'Contractor assigned to project',
      );
    } catch (error) {
      this.rethrowDuplicateKey(
        error,
        'Contractor is already assigned to this project',
      );
      throw error;
    }
  }

  async unassignProject(
    contractorId: string,
    projectId: string,
    actorId: string,
  ) {
    await this.requireContractor(contractorId);
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }

    const row = await this.assignmentModel
      .findOne({
        contractorId: new Types.ObjectId(contractorId),
        projectId: new Types.ObjectId(projectId),
      })
      .exec();

    if (!row) {
      throw new NotFoundException('Contractor project assignment not found');
    }

    row.status = ContractorProjectAssignmentStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorProjectAssignment(row),
      'Contractor unassigned from project',
    );
  }

  async listProjects(
    contractorId: string,
    query: { page?: number; limit?: number },
  ) {
    await this.requireContractor(contractorId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = {
      contractorId: new Types.ObjectId(contractorId),
      status: ContractorProjectAssignmentStatus.Active,
    };

    const [items, total] = await Promise.all([
      this.assignmentModel
        .find(filter)
        .sort({ assignedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.assignmentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicContractorProjectAssignment(item)),
      'Contractor project assignments fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getPerformance(id: string) {
    const contractor = await this.requireContractor(id);
    const contractorOid = new Types.ObjectId(id);

    const [activeProjectCount, measurementAgg, documentCounts] =
      await Promise.all([
        this.assignmentModel.countDocuments({
          contractorId: contractorOid,
          status: ContractorProjectAssignmentStatus.Active,
        }),
        this.measurementModel
          .aggregate<{
            _id: WorkMeasurementStatus;
            count: number;
            totalQuantity: number;
          }>([
            {
              $match: { contractorId: contractorOid, isDeleted: { $ne: true } },
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$currentQuantity' },
              },
            },
          ])
          .exec(),
        this.documentModel
          .aggregate<{ _id: ContractorDocumentCategory; count: number }>([
            {
              $match: { contractorId: contractorOid, isDeleted: { $ne: true } },
            },
            { $group: { _id: '$category', count: { $sum: 1 } } },
          ])
          .exec(),
      ]);

    const byStatus = Object.fromEntries(
      measurementAgg.map((row) => [row._id, row]),
    ) as Partial<
      Record<WorkMeasurementStatus, { count: number; totalQuantity: number }>
    >;

    const verified = byStatus[WorkMeasurementStatus.Verified];
    const submitted = byStatus[WorkMeasurementStatus.Submitted];
    const docsByCategory = Object.fromEntries(
      documentCounts.map((row) => [row._id, row.count]),
    ) as Partial<Record<ContractorDocumentCategory, number>>;

    const labourLicence = contractor.labourLicence ?? {};
    const insurance = contractor.insurance ?? {};

    return createSuccessResponse(
      {
        contractorId: String(contractor._id),
        contractorCode: contractor.contractorCode,
        legalName: contractor.legalName,
        contractorType: contractor.contractorType,
        status: contractor.status,
        rating: contractor.rating ?? null,
        activeProjectCount,
        labourLicence: {
          licenceNumber: labourLicence.licenceNumber ?? null,
          validTo: labourLicence.validTo ?? null,
          isValid: labourLicenceIsValid({
            validTo: labourLicence.validTo ?? null,
          }),
        },
        insurance: {
          policyNumber: insurance.policyNumber ?? null,
          validTo: insurance.validTo ?? null,
          isValid: complianceIsValid({
            validTo: insurance.validTo ?? null,
          }),
        },
        workMeasurements: {
          submittedCount: submitted?.count ?? 0,
          verifiedCount: verified?.count ?? 0,
          totalVerifiedQuantity: verified?.totalQuantity ?? 0,
          totalSubmittedQuantity: submitted?.totalQuantity ?? 0,
        },
        documents: {
          totalCount: documentCounts.reduce((sum, row) => sum + row.count, 0),
          labourLicenceCount:
            docsByCategory[ContractorDocumentCategory.LabourLicence] ?? 0,
          insuranceCount:
            docsByCategory[ContractorDocumentCategory.Insurance] ?? 0,
        },
        asOf: new Date().toISOString(),
      },
      'Contractor performance fetched',
    );
  }

  async addDocument(
    id: string,
    input: {
      fileName: string;
      filePath: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: ContractorDocumentCategory;
      expiresAt?: string | null;
    },
    actorId: string,
  ) {
    await this.requireContractor(id);

    const doc = await this.documentModel.create({
      contractorId: new Types.ObjectId(id),
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category ?? ContractorDocumentCategory.General,
      verificationStatus: ContractorDocumentVerificationStatus.Pending,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      uploadedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorDocument(doc),
      'Contractor document uploaded successfully',
    );
  }

  async verifyDocument(
    contractorId: string,
    documentId: string,
    dto: VerifyContractorDocumentDto,
    actorId: string,
  ) {
    await this.requireContractor(contractorId);
    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Invalid document id');
    }

    const doc = await this.documentModel
      .findOne({
        _id: new Types.ObjectId(documentId),
        contractorId: new Types.ObjectId(contractorId),
      })
      .exec();
    if (!doc) {
      throw new NotFoundException('Contractor document not found');
    }

    const now = new Date();
    doc.verificationStatus = dto.verified
      ? ContractorDocumentVerificationStatus.Verified
      : ContractorDocumentVerificationStatus.Rejected;
    doc.verifiedBy = new Types.ObjectId(actorId);
    doc.verifiedAt = now;
    doc.verificationNotes = dto.notes?.trim() ?? null;
    if (dto.expiresAt !== undefined) {
      doc.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    doc.set('updatedBy', new Types.ObjectId(actorId));
    await doc.save();

    await this.safeAudit({
      userId: actorId,
      action: dto.verified ? AuditAction.APPROVE : AuditAction.REJECT,
      module: 'contractor',
      entityType: 'contractor_document',
      entityId: String(doc._id),
      beforeData: { verificationStatus: 'pending' },
      afterData: {
        verificationStatus: doc.verificationStatus,
        notes: doc.verificationNotes,
        expiresAt: doc.expiresAt,
      },
    });

    return createSuccessResponse(
      toPublicContractorDocument(doc),
      dto.verified
        ? 'Contractor document verified'
        : 'Contractor document rejected',
    );
  }

  async listDocuments(
    id: string,
    query: {
      page?: number;
      limit?: number;
      category?: ContractorDocumentCategory;
      verificationStatus?: ContractorDocumentVerificationStatus;
    },
  ) {
    await this.requireContractor(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorFile> = {
      contractorId: new Types.ObjectId(id),
    };
    if (query.category) filter.category = query.category;
    if (query.verificationStatus) {
      filter.verificationStatus = query.verificationStatus;
    }

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicContractorDocument(item)),
      'Contractor documents fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async transitionWithReason(
    id: string,
    action: ContractorStatusAction,
    reason: string | null,
    actorId: string,
    successMessage: string,
    extra: Record<string, unknown> = {},
  ) {
    const contractor = await this.requireContractor(id);
    const trimmed = reason?.trim() || null;
    if (
      (action === ContractorStatusAction.Blacklist ||
        action === ContractorStatusAction.Suspend ||
        action === ContractorStatusAction.Reactivate) &&
      (!trimmed || trimmed.length < 3)
    ) {
      throw new BadRequestException('reason is required (min 3 characters)');
    }

    const nextStatus = assertContractorStatusTransition(
      action,
      contractor.status,
    );
    const updated = await this.applyStatusTransition({
      contractor,
      action,
      toStatus: nextStatus,
      reason: trimmed,
      actorId,
      extra: {
        blockReason:
          action === ContractorStatusAction.Blacklist ||
          action === ContractorStatusAction.Suspend
            ? trimmed
            : (extra.blockReason as string | null | undefined) ??
              contractor.blockReason,
        statusReason: trimmed,
        ...extra,
      },
    });

    return createSuccessResponse(
      await this.toPublic(updated, true),
      successMessage,
    );
  }

  private async applyStatusTransition(input: {
    contractor: Contractor & { _id: Types.ObjectId };
    action: ContractorStatusAction;
    toStatus: ContractorStatus;
    reason: string | null;
    actorId: string;
    at?: Date;
    extra?: Record<string, unknown>;
  }) {
    const at = input.at ?? new Date();
    const fromStatus = input.contractor.status;
    const event = {
      fromStatus,
      toStatus: input.toStatus,
      action: input.action,
      reason: input.reason,
      actorId: new Types.ObjectId(input.actorId),
      at,
    };

    const updated = await this.contractorModel
      .findByIdAndUpdate(
        input.contractor._id,
        {
          status: input.toStatus,
          updatedBy: new Types.ObjectId(input.actorId),
          $push: { statusEvents: event },
          ...(input.extra ?? {}),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    if (!updated) {
      throw new NotFoundException('Contractor not found');
    }

    await this.safeAudit({
      userId: input.actorId,
      action: AuditAction.UPDATE,
      module: 'contractor',
      entityType: 'contractor',
      entityId: String(input.contractor._id),
      beforeData: { status: fromStatus },
      afterData: {
        status: input.toStatus,
        action: input.action,
        reason: input.reason,
      },
    });

    return updated;
  }

  private assertWriteRules(input: {
    pan?: string | null;
    gstin?: string | null;
    workCategories?: string[] | null;
    rating?: number | null;
    bankDetails?: CreateContractorDto['bankDetails'];
    labourLicence?: CreateContractorDto['labourLicence'];
    insurance?: CreateContractorDto['insurance'];
  }) {
    assertOptionalPanGstin(input.pan, input.gstin);
    assertWorkCategories(input.workCategories);
    assertRating(input.rating);
    if (input.bankDetails) {
      assertValidIfsc(
        input.bankDetails.ifsc
          ? normalizeOptionalCode(input.bankDetails.ifsc)
          : null,
      );
      assertValidAccountNumber(input.bankDetails.accountNumber);
    }
    if (input.labourLicence) {
      assertLabourLicenceDates({
        validFrom: input.labourLicence.validFrom,
        validTo: input.labourLicence.validTo,
      });
    }
    if (input.insurance) {
      assertInsuranceDates({
        validFrom: input.insurance.validFrom,
        validTo: input.insurance.validTo,
      });
    }
  }

  private async requireContractor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contractor id');
    }
    const contractor = await this.contractorModel
      .findById(id)
      .select('+bankDetails.accountNumberEncrypted')
      .exec();
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    return contractor;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async toPublic(
    contractor: Contractor & {
      _id: Types.ObjectId | string;
      bankDetails?: {
        accountNumberEncrypted?: string | null;
        accountNumberLast4?: string | null;
        bankName?: string | null;
        branchName?: string | null;
        ifsc?: string | null;
        accountHolderName?: string | null;
      };
    },
    decryptAccount: boolean,
  ) {
    let accountNumber: string | null = null;
    if (decryptAccount && contractor.bankDetails?.accountNumberEncrypted) {
      try {
        accountNumber = decryptSensitive(
          contractor.bankDetails.accountNumberEncrypted,
          this.encryptionKey(),
        );
      } catch {
        accountNumber = null;
      }
    }
    return toPublicContractor(contractor, accountNumber);
  }

  private buildBankDetailsForWrite(
    input?: CreateContractorDto['bankDetails'],
    existing?: Contractor['bankDetails'],
  ) {
    if (!input) {
      return {
        bankName: existing?.bankName ?? null,
        branchName: existing?.branchName ?? null,
        ifsc: existing?.ifsc ?? null,
        accountHolderName: existing?.accountHolderName ?? null,
        accountNumberEncrypted: existing?.accountNumberEncrypted ?? null,
        accountNumberLast4: existing?.accountNumberLast4 ?? null,
      };
    }

    const ifsc = input.ifsc
      ? normalizeOptionalCode(input.ifsc)
      : (existing?.ifsc ?? null);

    let accountNumberEncrypted = existing?.accountNumberEncrypted ?? null;
    let last4 = existing?.accountNumberLast4 ?? null;

    if (input.accountNumber) {
      const digits = input.accountNumber.replace(/\s+/g, '');
      accountNumberEncrypted = encryptSensitive(digits, this.encryptionKey());
      last4 = accountNumberLast4(digits);
    }

    return {
      bankName: input.bankName?.trim() ?? existing?.bankName ?? null,
      branchName: input.branchName?.trim() ?? existing?.branchName ?? null,
      ifsc,
      accountHolderName:
        input.accountHolderName?.trim() ?? existing?.accountHolderName ?? null,
      accountNumberEncrypted,
      accountNumberLast4: last4,
    };
  }

  private normalizeContact(input?: CreateContractorDto['contact']) {
    return {
      email: input?.email?.trim().toLowerCase() || null,
      phone: input?.phone?.trim() || null,
      alternatePhone: input?.alternatePhone?.trim() || null,
      contactPerson: input?.contactPerson?.trim() || null,
      addressLine1: input?.addressLine1?.trim() || null,
      addressLine2: input?.addressLine2?.trim() || null,
      city: input?.city?.trim() || null,
      state: input?.state?.trim() || null,
      pincode: input?.pincode?.trim() || null,
      country: input?.country?.trim() || 'India',
    };
  }

  private normalizeContacts(
    contacts?: CreateContractorDto['contacts'],
    legacy?: CreateContractorDto['contact'],
  ) {
    if (contacts?.length) {
      let sawPrimary = false;
      return contacts.map((c, index) => {
        const isPrimary = c.isPrimary === true || (!sawPrimary && index === 0);
        if (isPrimary) sawPrimary = true;
        return {
          label: c.label?.trim() || (isPrimary ? 'Primary' : `Contact ${index + 1}`),
          isPrimary,
          email: c.email?.trim().toLowerCase() || null,
          phone: c.phone?.trim() || null,
          alternatePhone: c.alternatePhone?.trim() || null,
          contactPerson: c.contactPerson?.trim() || null,
          designation: c.designation?.trim() || null,
        };
      });
    }
    if (legacy) {
      const n = this.normalizeContact(legacy);
      return [
        {
          label: 'Primary',
          isPrimary: true,
          email: n.email,
          phone: n.phone,
          alternatePhone: n.alternatePhone,
          contactPerson: n.contactPerson,
          designation: null as string | null,
        },
      ];
    }
    return [];
  }

  private primaryContactFrom(
    contacts: ReturnType<ContractorsService['normalizeContacts']>,
    legacy?: CreateContractorDto['contact'],
  ) {
    const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
    if (primary) {
      return {
        email: primary.email,
        phone: primary.phone,
        alternatePhone: primary.alternatePhone,
        contactPerson: primary.contactPerson,
        addressLine1: legacy?.addressLine1?.trim() || null,
        addressLine2: legacy?.addressLine2?.trim() || null,
        city: legacy?.city?.trim() || null,
        state: legacy?.state?.trim() || null,
        pincode: legacy?.pincode?.trim() || null,
        country: legacy?.country?.trim() || 'India',
      };
    }
    return this.normalizeContact(legacy);
  }

  private normalizeAddresses(
    addresses?: CreateContractorDto['addresses'],
    legacyContact?: CreateContractorDto['contact'],
  ) {
    if (addresses?.length) {
      let sawPrimary = false;
      return addresses.map((a, index) => {
        const isPrimary = a.isPrimary === true || (!sawPrimary && index === 0);
        if (isPrimary) sawPrimary = true;
        return {
          label: a.label?.trim() || (isPrimary ? 'Primary' : `Address ${index + 1}`),
          isPrimary,
          line1: a.line1?.trim() || null,
          line2: a.line2?.trim() || null,
          city: a.city?.trim() || null,
          state: a.state?.trim() || null,
          pincode: a.pincode?.trim() || null,
          country: a.country?.trim() || 'India',
        };
      });
    }
    if (
      legacyContact?.addressLine1 ||
      legacyContact?.city ||
      legacyContact?.state
    ) {
      return [
        {
          label: 'Registered',
          isPrimary: true,
          line1: legacyContact.addressLine1?.trim() || null,
          line2: legacyContact.addressLine2?.trim() || null,
          city: legacyContact.city?.trim() || null,
          state: legacyContact.state?.trim() || null,
          pincode: legacyContact.pincode?.trim() || null,
          country: legacyContact.country?.trim() || 'India',
        },
      ];
    }
    return [];
  }

  private normalizeLabourLicence(
    input?: CreateContractorDto['labourLicence'],
  ) {
    if (!input) {
      return {
        licenceNumber: null,
        issuedBy: null,
        validFrom: null,
        validTo: null,
        notes: null,
      };
    }
    return {
      licenceNumber: input.licenceNumber?.trim() || null,
      issuedBy: input.issuedBy?.trim() || null,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
      notes: input.notes?.trim() || null,
    };
  }

  private normalizeInsurance(input?: CreateContractorDto['insurance']) {
    if (!input) {
      return {
        policyNumber: null,
        insurer: null,
        coverageType: null,
        validFrom: null,
        validTo: null,
        notes: null,
      };
    }
    return {
      policyNumber: input.policyNumber?.trim() || null,
      insurer: input.insurer?.trim() || null,
      coverageType: input.coverageType?.trim() || null,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
      notes: input.notes?.trim() || null,
    };
  }

  private bankToPlain(bank: Contractor['bankDetails']) {
    return {
      bankName: bank?.bankName ?? null,
      branchName: bank?.branchName ?? null,
      ifsc: bank?.ifsc ?? null,
      accountHolderName: bank?.accountHolderName ?? null,
      accountNumberEncrypted: bank?.accountNumberEncrypted ?? null,
      accountNumberLast4: bank?.accountNumberLast4 ?? null,
    };
  }

  private labourLicenceToPlain(licence: Contractor['labourLicence']) {
    return {
      licenceNumber: licence?.licenceNumber ?? null,
      issuedBy: licence?.issuedBy ?? null,
      validFrom: licence?.validFrom ?? null,
      validTo: licence?.validTo ?? null,
      notes: licence?.notes ?? null,
    };
  }

  private insuranceToPlain(insurance: Contractor['insurance']) {
    return {
      policyNumber: insurance?.policyNumber ?? null,
      insurer: insurance?.insurer ?? null,
      coverageType: insurance?.coverageType ?? null,
      validFrom: insurance?.validFrom ?? null,
      validTo: insurance?.validTo ?? null,
      notes: insurance?.notes ?? null,
    };
  }

  private daysRemaining(validTo: Date | null, asOf: Date): number | null {
    if (!validTo) return null;
    const ms = validTo.getTime() - asOf.getTime();
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  private async resolveCompanyId(companyId?: string | null) {
    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId');
      }
      const company = await this.companyModel.findById(companyId).exec();
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      return company._id;
    }

    const primary = await this.companyModel
      .findOne()
      .sort({ createdAt: 1 })
      .exec();
    return primary?._id ?? null;
  }

  private encryptionKey(): string {
    const key = this.configService.get<string>('fieldEncryptionKey');
    if (!key) {
      throw new BadRequestException('FIELD_ENCRYPTION_KEY is not configured');
    }
    return key;
  }

  private async safeAudit(
    input: Parameters<AuditLogService['record']>[0],
  ): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch {
      // Audit must not roll back business writes.
    }
  }

  private rethrowDuplicateKey(
    error: unknown,
    message = 'Duplicate contractor key',
  ) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ConflictException(message);
    }
  }
}
