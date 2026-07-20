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
import type { BlockContractorDto } from './dto/block-contractor.dto';
import type { CreateContractorDto } from './dto/create-contractor.dto';
import type { UpdateContractorDto } from './dto/update-contractor.dto';
import type { VerifyContractorDto } from './dto/verify-contractor.dto';
import {
  toPublicContractor,
  toPublicContractorDocument,
  toPublicContractorProjectAssignment,
} from './contractors.mapper';
import {
  assertLabourLicenceDates,
  assertOptionalPanGstin,
  assertRating,
  assertValidAccountNumber,
  assertValidIfsc,
  assertWorkCategories,
  labourLicenceIsValid,
} from './contractors.validation';
import {
  ContractorDocumentCategory,
  ContractorFile,
} from './schemas/contractor-document.schema';
import {
  ContractorProjectAssignment,
  ContractorProjectAssignmentStatus,
} from './schemas/contractor-project-assignment.schema';
import {
  Contractor,
  ContractorStatus,
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
    });

    const companyId = await this.resolveCompanyId(dto.companyId);
    const contractorCode = await this.numberingService.nextCode(
      NumberEntityType.CONTRACTOR,
    );

    try {
      const contractor = await this.contractorModel.create({
        companyId,
        contractorCode,
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName?.trim() || null,
        contractorType: dto.contractorType,
        pan,
        gstin,
        contact: this.normalizeContact(dto.contact),
        bankDetails: this.buildBankDetailsForWrite(dto.bankDetails),
        labourLicence: this.normalizeLabourLicence(dto.labourLicence),
        workCategories: assertWorkCategories(dto.workCategories),
        rating: dto.rating ?? null,
        notes: dto.notes?.trim() || null,
        verificationStatus: ContractorVerificationStatus.Pending,
        status: ContractorStatus.PendingVerification,
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
    if (dto.contact !== undefined) {
      update.contact = {
        ...this.contactToPlain(contractor.contact),
        ...this.normalizeContact(dto.contact),
      };
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

  async verify(id: string, dto: VerifyContractorDto, actorId: string) {
    await this.requireContractor(id);
    const now = new Date();

    const updated = await this.contractorModel
      .findByIdAndUpdate(
        id,
        {
          verificationStatus: dto.verified
            ? ContractorVerificationStatus.Verified
            : ContractorVerificationStatus.Rejected,
          verifiedBy: new Types.ObjectId(actorId),
          verifiedAt: now,
          verificationNotes: dto.notes?.trim() ?? null,
          status: dto.verified
            ? ContractorStatus.Active
            : ContractorStatus.PendingVerification,
          blockReason: null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, true),
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
    if (contractor.status === ContractorStatus.Blocked) {
      throw new BadRequestException(
        'Blocked contractors cannot be activated; clear the block first',
      );
    }

    const updated = await this.contractorModel
      .findByIdAndUpdate(
        id,
        {
          status: ContractorStatus.Active,
          blockReason: null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, true),
      'Contractor activated successfully',
    );
  }

  async block(id: string, dto: BlockContractorDto, actorId: string) {
    await this.requireContractor(id);

    const updated = await this.contractorModel
      .findByIdAndUpdate(
        id,
        {
          status: ContractorStatus.Blocked,
          blockReason: dto.reason?.trim() || null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, true),
      'Contractor blocked successfully',
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

    const [
      activeProjectCount,
      measurementAgg,
      documentCounts,
    ] = await Promise.all([
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
          { $match: { contractorId: contractorOid, isDeleted: { $ne: true } } },
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
          { $match: { contractorId: contractorOid, isDeleted: { $ne: true } } },
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
      uploadedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorDocument(doc),
      'Contractor document uploaded successfully',
    );
  }

  async listDocuments(
    id: string,
    query: {
      page?: number;
      limit?: number;
      category?: ContractorDocumentCategory;
    },
  ) {
    await this.requireContractor(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorFile> = {
      contractorId: new Types.ObjectId(id),
    };
    if (query.category) filter.category = query.category;

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

  private assertWriteRules(input: {
    pan?: string | null;
    gstin?: string | null;
    workCategories?: string[] | null;
    rating?: number | null;
    bankDetails?: CreateContractorDto['bankDetails'];
    labourLicence?: CreateContractorDto['labourLicence'];
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

  private contactToPlain(contact: Contractor['contact']) {
    return {
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      alternatePhone: contact?.alternatePhone ?? null,
      contactPerson: contact?.contactPerson ?? null,
      addressLine1: contact?.addressLine1 ?? null,
      addressLine2: contact?.addressLine2 ?? null,
      city: contact?.city ?? null,
      state: contact?.state ?? null,
      pincode: contact?.pincode ?? null,
      country: contact?.country ?? null,
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
