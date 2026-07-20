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
import type { AssignVendorProjectDto } from './dto/assign-vendor-project.dto';
import type { BlockVendorDto } from './dto/block-vendor.dto';
import type { CreateVendorDto } from './dto/create-vendor.dto';
import type { UpdateVendorDto } from './dto/update-vendor.dto';
import type { VerifyVendorDto } from './dto/verify-vendor.dto';
import {
  toPublicVendor,
  toPublicVendorDocument,
  toPublicVendorProjectAssignment,
} from './vendors.mapper';
import {
  assertCreditLimit,
  assertMaterialCategories,
  assertOptionalPanGstin,
  assertRating,
  assertRetentionPercentage,
  assertTdsRules,
  assertValidAccountNumber,
  assertValidIfsc,
} from './vendors.validation';
import {
  VendorDocumentCategory,
  VendorFile,
} from './schemas/vendor-document.schema';
import {
  VendorProjectAssignment,
  VendorProjectAssignmentStatus,
} from './schemas/vendor-project-assignment.schema';
import {
  Vendor,
  VendorStatus,
  VendorVerificationStatus,
} from './schemas/vendor.schema';

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(VendorFile.name)
    private readonly documentModel: Model<VendorFile>,
    @InjectModel(VendorProjectAssignment.name)
    private readonly assignmentModel: Model<VendorProjectAssignment>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly numberingService: NumberingService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateVendorDto, actorId: string) {
    const pan = normalizeOptionalCode(dto.pan ?? null);
    const gstin = normalizeOptionalCode(dto.gstin ?? null);
    this.assertWriteRules({
      pan,
      gstin,
      materialCategories: dto.materialCategories,
      tdsApplicable: dto.tdsApplicable ?? false,
      tdsPercentage: dto.tdsPercentage ?? null,
      retentionPercentage: dto.retentionPercentage,
      rating: dto.rating,
      creditLimit: dto.creditLimit,
      bankDetails: dto.bankDetails,
    });

    const companyId = await this.resolveCompanyId(dto.companyId);
    const vendorCode = await this.numberingService.nextCode(
      NumberEntityType.VENDOR,
    );

    try {
      const vendor = await this.vendorModel.create({
        companyId,
        vendorCode,
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName?.trim() || null,
        pan,
        gstin,
        contact: this.normalizeContact(dto.contact),
        billingAddress: this.normalizeBillingAddress(dto.billingAddress),
        bankDetails: this.buildBankDetailsForWrite(dto.bankDetails),
        materialCategories: assertMaterialCategories(dto.materialCategories),
        paymentTerms: dto.paymentTerms?.trim() || null,
        creditLimit: dto.creditLimit ?? 0,
        tdsApplicable: dto.tdsApplicable ?? false,
        tdsPercentage: dto.tdsApplicable ? (dto.tdsPercentage ?? null) : null,
        retentionPercentage: dto.retentionPercentage ?? 0,
        rating: dto.rating ?? null,
        verificationStatus: VendorVerificationStatus.Pending,
        status: VendorStatus.PendingVerification,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        await this.toPublic(vendor, true),
        'Vendor created successfully',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateVendorDto, actorId: string) {
    const vendor = await this.requireVendor(id);

    const pan =
      dto.pan !== undefined
        ? normalizeOptionalCode(dto.pan)
        : (vendor.pan ?? null);
    const gstin =
      dto.gstin !== undefined
        ? normalizeOptionalCode(dto.gstin)
        : (vendor.gstin ?? null);
    const tdsApplicable = dto.tdsApplicable ?? vendor.tdsApplicable;
    const tdsPercentage = !tdsApplicable
      ? null
      : dto.tdsPercentage !== undefined
        ? dto.tdsPercentage
        : vendor.tdsPercentage;

    this.assertWriteRules({
      pan,
      gstin,
      materialCategories:
        dto.materialCategories ?? vendor.materialCategories ?? [],
      tdsApplicable,
      tdsPercentage,
      retentionPercentage:
        dto.retentionPercentage !== undefined
          ? dto.retentionPercentage
          : vendor.retentionPercentage,
      rating: dto.rating !== undefined ? dto.rating : vendor.rating,
      creditLimit:
        dto.creditLimit !== undefined ? dto.creditLimit : vendor.creditLimit,
      bankDetails: dto.bankDetails,
    });

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actorId),
    };

    if (dto.legalName !== undefined) update.legalName = dto.legalName.trim();
    if (dto.tradeName !== undefined) {
      update.tradeName = dto.tradeName?.trim() || null;
    }
    if (dto.pan !== undefined) update.pan = pan;
    if (dto.gstin !== undefined) update.gstin = gstin;
    if (dto.contact !== undefined) {
      update.contact = {
        ...this.contactToPlain(vendor.contact),
        ...this.normalizeContact(dto.contact),
      };
    }
    if (dto.billingAddress !== undefined) {
      update.billingAddress = {
        ...this.billingToPlain(vendor.billingAddress),
        ...this.normalizeBillingAddress(dto.billingAddress),
      };
    }
    if (dto.bankDetails !== undefined) {
      update.bankDetails = {
        ...this.bankToPlain(vendor.bankDetails),
        ...this.buildBankDetailsForWrite(dto.bankDetails, vendor.bankDetails),
      };
    }
    if (dto.materialCategories !== undefined) {
      update.materialCategories = assertMaterialCategories(
        dto.materialCategories,
      );
    }
    if (dto.paymentTerms !== undefined) {
      update.paymentTerms = dto.paymentTerms?.trim() || null;
    }
    if (dto.creditLimit !== undefined) update.creditLimit = dto.creditLimit;
    if (dto.tdsApplicable !== undefined) update.tdsApplicable = dto.tdsApplicable;
    if (dto.tdsPercentage !== undefined || dto.tdsApplicable !== undefined) {
      update.tdsPercentage = tdsPercentage;
    }
    if (dto.retentionPercentage !== undefined) {
      update.retentionPercentage = dto.retentionPercentage;
    }
    if (dto.rating !== undefined) update.rating = dto.rating;
    if (dto.companyId !== undefined) {
      update.companyId = await this.resolveCompanyId(dto.companyId);
    }

    try {
      const updated = await this.vendorModel
        .findByIdAndUpdate(id, update, { new: true })
        .select('+bankDetails.accountNumberEncrypted')
        .exec();

      return createSuccessResponse(
        await this.toPublic(updated!, true),
        'Vendor updated successfully',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async getById(id: string) {
    const vendor = await this.requireVendor(id);
    return createSuccessResponse(
      await this.toPublic(vendor, true),
      'Vendor fetched successfully',
    );
  }

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: VendorStatus;
    verificationStatus?: VendorVerificationStatus;
    materialCategory?: string;
    companyId?: string;
    projectId?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const filter: FilterQuery<Vendor> = {};

    if (query.status) filter.status = query.status;
    if (query.verificationStatus) {
      filter.verificationStatus = query.verificationStatus;
    }
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.materialCategory?.trim()) {
      filter.materialCategories = query.materialCategory.trim().toLowerCase();
    }

    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      const assignments = await this.assignmentModel
        .find({
          projectId: new Types.ObjectId(query.projectId),
          status: VendorProjectAssignmentStatus.Active,
        })
        .select('vendorId')
        .lean()
        .exec();
      filter._id = { $in: assignments.map((a) => a.vendorId) };
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { legalName: { $regex: search, $options: 'i' } },
        { tradeName: { $regex: search, $options: 'i' } },
        { vendorCode: { $regex: search, $options: 'i' } },
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
      this.vendorModel
        .find(filter)
        .select('+bankDetails.accountNumberEncrypted')
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.vendorModel.countDocuments(filter).exec(),
    ]);

    const data = await Promise.all(items.map((item) => this.toPublic(item, true)));

    return createSuccessResponse(
      data,
      'Vendors fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async verify(id: string, dto: VerifyVendorDto, actorId: string) {
    await this.requireVendor(id);
    const now = new Date();

    const updated = await this.vendorModel
      .findByIdAndUpdate(
        id,
        {
          verificationStatus: dto.verified
            ? VendorVerificationStatus.Verified
            : VendorVerificationStatus.Rejected,
          verifiedBy: new Types.ObjectId(actorId),
          verifiedAt: now,
          verificationNotes: dto.notes?.trim() ?? null,
          status: dto.verified
            ? VendorStatus.Active
            : VendorStatus.PendingVerification,
          blockReason: null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, true),
      dto.verified ? 'Vendor verified successfully' : 'Vendor verification rejected',
    );
  }

  async activate(id: string, actorId: string) {
    const vendor = await this.requireVendor(id);
    if (vendor.verificationStatus !== VendorVerificationStatus.Verified) {
      throw new BadRequestException(
        'Vendor must be verified before activation',
      );
    }
    if (vendor.status === VendorStatus.Blocked) {
      throw new BadRequestException(
        'Blocked vendors cannot be activated; clear the block first',
      );
    }

    const updated = await this.vendorModel
      .findByIdAndUpdate(
        id,
        {
          status: VendorStatus.Active,
          blockReason: null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, true),
      'Vendor activated successfully',
    );
  }

  async block(id: string, dto: BlockVendorDto, actorId: string) {
    await this.requireVendor(id);

    const updated = await this.vendorModel
      .findByIdAndUpdate(
        id,
        {
          status: VendorStatus.Blocked,
          blockReason: dto.reason?.trim() || null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, true),
      'Vendor blocked successfully',
    );
  }

  async assignProject(
    vendorId: string,
    dto: AssignVendorProjectDto,
    actorId: string,
  ) {
    await this.requireVendor(vendorId);
    await this.requireProject(dto.projectId);

    const existing = await this.assignmentModel
      .findOne({
        vendorId: new Types.ObjectId(vendorId),
        projectId: new Types.ObjectId(dto.projectId),
      })
      .exec();

    if (existing) {
      existing.status = VendorProjectAssignmentStatus.Active;
      existing.notes = dto.notes?.trim() || existing.notes;
      existing.assignedBy = new Types.ObjectId(actorId);
      existing.assignedAt = new Date();
      existing.set('updatedBy', new Types.ObjectId(actorId));
      await existing.save();
      return createSuccessResponse(
        toPublicVendorProjectAssignment(existing),
        'Vendor project assignment updated',
      );
    }

    try {
      const row = await this.assignmentModel.create({
        vendorId: new Types.ObjectId(vendorId),
        projectId: new Types.ObjectId(dto.projectId),
        status: VendorProjectAssignmentStatus.Active,
        notes: dto.notes?.trim() || null,
        assignedBy: new Types.ObjectId(actorId),
        assignedAt: new Date(),
        createdBy: new Types.ObjectId(actorId),
      });
      return createSuccessResponse(
        toPublicVendorProjectAssignment(row),
        'Vendor assigned to project',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error, 'Vendor is already assigned to this project');
      throw error;
    }
  }

  async unassignProject(vendorId: string, projectId: string, actorId: string) {
    await this.requireVendor(vendorId);
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }

    const row = await this.assignmentModel
      .findOne({
        vendorId: new Types.ObjectId(vendorId),
        projectId: new Types.ObjectId(projectId),
      })
      .exec();

    if (!row) {
      throw new NotFoundException('Vendor project assignment not found');
    }

    row.status = VendorProjectAssignmentStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorProjectAssignment(row),
      'Vendor unassigned from project',
    );
  }

  async listProjects(vendorId: string, query: { page?: number; limit?: number }) {
    await this.requireVendor(vendorId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = {
      vendorId: new Types.ObjectId(vendorId),
      status: VendorProjectAssignmentStatus.Active,
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
      items.map((item) => toPublicVendorProjectAssignment(item)),
      'Vendor project assignments fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async addDocument(
    id: string,
    input: {
      fileName: string;
      filePath: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: VendorDocumentCategory;
    },
    actorId: string,
  ) {
    await this.requireVendor(id);

    const doc = await this.documentModel.create({
      vendorId: new Types.ObjectId(id),
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category ?? VendorDocumentCategory.General,
      uploadedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicVendorDocument(doc),
      'Vendor document uploaded successfully',
    );
  }

  async listDocuments(
    id: string,
    query: { page?: number; limit?: number; category?: VendorDocumentCategory },
  ) {
    await this.requireVendor(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<VendorFile> = {
      vendorId: new Types.ObjectId(id),
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
      items.map((item) => toPublicVendorDocument(item)),
      'Vendor documents fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Placeholder ledger until AP / journal vendor party postings are wired.
   */
  async getLedgerPlaceholder(id: string) {
    const vendor = await this.requireVendor(id);
    return createSuccessResponse(
      {
        vendorId: String(vendor._id),
        vendorCode: vendor.vendorCode,
        legalName: vendor.legalName,
        currency: 'INR',
        openingBalance: 0,
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
        entries: [] as Array<{
          id: string;
          entryDate: string;
          description: string;
          debit: number;
          credit: number;
          balance: number;
          referenceType: string | null;
          referenceId: string | null;
        }>,
        note: 'Vendor ledger is a placeholder. Payable postings will appear here in a later phase.',
        asOf: new Date().toISOString(),
      },
      'Vendor ledger placeholder',
    );
  }

  private assertWriteRules(input: {
    pan?: string | null;
    gstin?: string | null;
    materialCategories?: string[] | null;
    tdsApplicable?: boolean;
    tdsPercentage?: number | null;
    retentionPercentage?: number | null;
    rating?: number | null;
    creditLimit?: number | null;
    bankDetails?: CreateVendorDto['bankDetails'];
  }) {
    assertOptionalPanGstin(input.pan, input.gstin);
    assertMaterialCategories(input.materialCategories);
    assertTdsRules({
      tdsApplicable: input.tdsApplicable,
      tdsPercentage: input.tdsPercentage,
    });
    assertRetentionPercentage(input.retentionPercentage);
    assertRating(input.rating);
    assertCreditLimit(input.creditLimit);
    if (input.bankDetails) {
      assertValidIfsc(
        input.bankDetails.ifsc
          ? normalizeOptionalCode(input.bankDetails.ifsc)
          : null,
      );
      assertValidAccountNumber(input.bankDetails.accountNumber);
    }
  }

  private async requireVendor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendor id');
    }
    const vendor = await this.vendorModel
      .findById(id)
      .select('+bankDetails.accountNumberEncrypted')
      .exec();
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    return vendor;
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
    vendor: Vendor & {
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
    if (decryptAccount && vendor.bankDetails?.accountNumberEncrypted) {
      try {
        accountNumber = decryptSensitive(
          vendor.bankDetails.accountNumberEncrypted,
          this.encryptionKey(),
        );
      } catch {
        accountNumber = null;
      }
    }
    return toPublicVendor(vendor, accountNumber);
  }

  private buildBankDetailsForWrite(
    input?: CreateVendorDto['bankDetails'],
    existing?: Vendor['bankDetails'],
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

  private normalizeContact(input?: CreateVendorDto['contact']) {
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

  private normalizeBillingAddress(input?: CreateVendorDto['billingAddress']) {
    return {
      line1: input?.line1?.trim() || null,
      line2: input?.line2?.trim() || null,
      city: input?.city?.trim() || null,
      state: input?.state?.trim() || null,
      pincode: input?.pincode?.trim() || null,
      country: input?.country?.trim() || 'India',
    };
  }

  private contactToPlain(contact: Vendor['contact']) {
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

  private billingToPlain(address: Vendor['billingAddress']) {
    return {
      line1: address?.line1 ?? null,
      line2: address?.line2 ?? null,
      city: address?.city ?? null,
      state: address?.state ?? null,
      pincode: address?.pincode ?? null,
      country: address?.country ?? null,
    };
  }

  private bankToPlain(bank: Vendor['bankDetails']) {
    return {
      bankName: bank?.bankName ?? null,
      branchName: bank?.branchName ?? null,
      ifsc: bank?.ifsc ?? null,
      accountHolderName: bank?.accountHolderName ?? null,
      accountNumberEncrypted: bank?.accountNumberEncrypted ?? null,
      accountNumberLast4: bank?.accountNumberLast4 ?? null,
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

    const primary = await this.companyModel.findOne().sort({ createdAt: 1 }).exec();
    return primary?._id ?? null;
  }

  private encryptionKey(): string {
    const key = this.configService.get<string>('fieldEncryptionKey');
    if (!key) {
      throw new BadRequestException('FIELD_ENCRYPTION_KEY is not configured');
    }
    return key;
  }

  private rethrowDuplicateKey(error: unknown, message = 'Duplicate vendor key') {
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
