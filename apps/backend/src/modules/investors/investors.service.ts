import {
  BadRequestException,
  ForbiddenException,
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
import { Director } from '../directors/schemas/director.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { PermissionsService } from '../rbac/permissions.service';
import { User } from '../users/schemas/user.schema';
import type { CreateInvestorDto } from './dto/create-investor.dto';
import type { UpdateInvestorDto } from './dto/update-investor.dto';
import type { VerifyKycDto } from './dto/verify-kyc.dto';
import {
  type PublicInvestorDocument,
  toPublicInvestor,
} from './investors.mapper';
import {
  assertInvestorTypeRules,
  assertOptionalPanGstin,
  assertValidAccountNumber,
  assertValidIfsc,
} from './investors.validation';
import {
  InvestorDocumentCategory,
  InvestorFile,
} from './schemas/investor-document.schema';
import {
  Investor,
  InvestorKycStatus,
  InvestorStatus,
} from './schemas/investor.schema';

export type InvestorAccessContext = {
  actorId: string;
  canViewAll: boolean;
};

@Injectable()
export class InvestorsService {
  constructor(
    @InjectModel(Investor.name) private readonly investorModel: Model<Investor>,
    @InjectModel(InvestorFile.name)
    private readonly documentModel: Model<InvestorFile>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    private readonly numberingService: NumberingService,
    private readonly permissionsService: PermissionsService,
    private readonly configService: ConfigService,
  ) {}

  async resolveAccess(actorId: string): Promise<InvestorAccessContext> {
    const access = await this.permissionsService.resolveUserAccess(actorId);
    const canViewAll =
      access.bypassPermissions ||
      access.permissions.includes('investor.view_all');
    return { actorId, canViewAll };
  }

  async create(dto: CreateInvestorDto, actorId: string) {
    const pan = normalizeOptionalCode(dto.pan ?? null);
    const gstin = normalizeOptionalCode(dto.gstin ?? null);
    const cin = normalizeOptionalCode(dto.cin ?? null);

    assertOptionalPanGstin(pan, gstin);
    assertInvestorTypeRules({
      investorType: dto.investorType,
      cin,
      directorId: dto.directorId,
    });

    if (dto.userId) await this.assertUserExists(dto.userId);
    if (dto.directorId) await this.assertDirectorExists(dto.directorId);

    const companyId = await this.resolveCompanyId(dto.companyId);
    const investorCode = await this.numberingService.nextCode(
      NumberEntityType.INVESTOR,
    );

    const bankDetails = this.buildBankDetailsForWrite(dto.bankDetails);

    const investor = await this.investorModel.create({
      companyId,
      investorCode,
      investorType: dto.investorType,
      legalName: dto.legalName.trim(),
      pan,
      gstin,
      cin,
      userId: dto.userId ? new Types.ObjectId(dto.userId) : null,
      directorId: dto.directorId ? new Types.ObjectId(dto.directorId) : null,
      contact: this.normalizeContact(dto.contact),
      bankDetails,
      nominee: this.normalizeNominee(dto.nominee),
      kycStatus: InvestorKycStatus.Pending,
      status: dto.status ?? InvestorStatus.PendingKyc,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      await this.toPublic(investor, { actorId, canViewAll: true }),
      'Investor created successfully',
    );
  }

  async update(id: string, dto: UpdateInvestorDto, access: InvestorAccessContext) {
    const investor = await this.requireAccessibleInvestor(id, access);

    if (dto.userId) await this.assertUserExists(dto.userId);
    if (dto.directorId) await this.assertDirectorExists(dto.directorId);

    const nextType = dto.investorType ?? investor.investorType;
    const pan =
      dto.pan !== undefined
        ? normalizeOptionalCode(dto.pan)
        : (investor.pan ?? null);
    const gstin =
      dto.gstin !== undefined
        ? normalizeOptionalCode(dto.gstin)
        : (investor.gstin ?? null);
    const cin =
      dto.cin !== undefined
        ? normalizeOptionalCode(dto.cin)
        : (investor.cin ?? null);
    const directorId =
      dto.directorId !== undefined
        ? dto.directorId
        : investor.directorId
          ? String(investor.directorId)
          : null;

    assertOptionalPanGstin(pan, gstin);
    assertInvestorTypeRules({
      investorType: nextType,
      cin,
      directorId,
    });

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(access.actorId),
    };

    if (dto.investorType !== undefined) update.investorType = dto.investorType;
    if (dto.legalName !== undefined) update.legalName = dto.legalName.trim();
    if (dto.pan !== undefined) update.pan = pan;
    if (dto.gstin !== undefined) update.gstin = gstin;
    if (dto.cin !== undefined) update.cin = cin;
    if (dto.userId !== undefined) {
      update.userId = dto.userId ? new Types.ObjectId(dto.userId) : null;
    }
    if (dto.directorId !== undefined) {
      update.directorId = dto.directorId
        ? new Types.ObjectId(dto.directorId)
        : null;
    }
    if (dto.contact !== undefined) {
      update.contact = {
        ...this.contactToPlain(investor.contact),
        ...this.normalizeContact(dto.contact),
      };
    }
    if (dto.nominee !== undefined) {
      update.nominee = {
        ...this.nomineeToPlain(investor.nominee),
        ...this.normalizeNominee(dto.nominee),
      };
    }
    if (dto.bankDetails !== undefined) {
      update.bankDetails = {
        ...this.bankToPlain(investor.bankDetails),
        ...this.buildBankDetailsForWrite(dto.bankDetails, investor.bankDetails),
      };
    }
    if (dto.companyId !== undefined) {
      update.companyId = await this.resolveCompanyId(dto.companyId);
    }
    if (dto.status !== undefined) update.status = dto.status;

    const updated = await this.investorModel
      .findByIdAndUpdate(id, update, { new: true })
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      'Investor updated successfully',
    );
  }

  async getById(id: string, access: InvestorAccessContext) {
    const investor = await this.requireAccessibleInvestor(id, access);
    return createSuccessResponse(
      await this.toPublic(investor, access),
      'Investor fetched successfully',
    );
  }

  async list(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: InvestorStatus;
      investorType?: string;
      kycStatus?: InvestorKycStatus;
      companyId?: string;
      sortOrder?: 'asc' | 'desc';
    },
    access: InvestorAccessContext,
  ) {
    const filter: FilterQuery<Investor> = {};

    if (!access.canViewAll) {
      filter.userId = new Types.ObjectId(access.actorId);
    }

    if (query.status) filter.status = query.status;
    if (query.investorType) filter.investorType = query.investorType;
    if (query.kycStatus) filter.kycStatus = query.kycStatus;
    if (query.companyId) filter.companyId = new Types.ObjectId(query.companyId);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { legalName: { $regex: search, $options: 'i' } },
        { investorCode: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } },
        { 'bankDetails.accountNumberLast4': search.slice(-4) },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.investorModel
        .find(filter)
        .select('+bankDetails.accountNumberEncrypted')
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.investorModel.countDocuments(filter).exec(),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toPublic(item, access)),
    );

    return createSuccessResponse(
      data,
      'Investors fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async verifyKyc(id: string, dto: VerifyKycDto, access: InvestorAccessContext) {
    if (!access.canViewAll) {
      throw new ForbiddenException('KYC verification requires investor.view_all');
    }
    await this.requireAccessibleInvestor(id, access);

    const now = new Date();
    const updated = await this.investorModel
      .findByIdAndUpdate(
        id,
        {
          kycStatus: dto.verified
            ? InvestorKycStatus.Verified
            : InvestorKycStatus.Rejected,
          kycVerifiedBy: new Types.ObjectId(access.actorId),
          kycVerifiedAt: now,
          kycNotes: dto.notes?.trim() ?? null,
          status: dto.verified ? InvestorStatus.Active : InvestorStatus.PendingKyc,
          updatedBy: new Types.ObjectId(access.actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      dto.verified ? 'Investor KYC verified' : 'Investor KYC rejected',
    );
  }

  async activate(id: string, access: InvestorAccessContext) {
    if (!access.canViewAll) {
      throw new ForbiddenException('Activation requires investor.view_all');
    }
    const investor = await this.requireAccessibleInvestor(id, access);
    if (investor.kycStatus !== InvestorKycStatus.Verified) {
      throw new BadRequestException(
        'Investor KYC must be verified before activation',
      );
    }

    const updated = await this.investorModel
      .findByIdAndUpdate(
        id,
        {
          status: InvestorStatus.Active,
          updatedBy: new Types.ObjectId(access.actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      'Investor activated successfully',
    );
  }

  async deactivate(id: string, access: InvestorAccessContext) {
    if (!access.canViewAll) {
      throw new ForbiddenException('Deactivation requires investor.view_all');
    }
    await this.requireAccessibleInvestor(id, access);

    const updated = await this.investorModel
      .findByIdAndUpdate(
        id,
        {
          status: InvestorStatus.Inactive,
          updatedBy: new Types.ObjectId(access.actorId),
        },
        { new: true },
      )
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      'Investor deactivated successfully',
    );
  }

  async addDocument(
    id: string,
    input: {
      fileName: string;
      filePath: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: InvestorDocumentCategory;
    },
    access: InvestorAccessContext,
  ) {
    await this.requireAccessibleInvestor(id, access);

    const doc = await this.documentModel.create({
      investorId: new Types.ObjectId(id),
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category ?? InvestorDocumentCategory.General,
      uploadedBy: new Types.ObjectId(access.actorId),
      createdBy: new Types.ObjectId(access.actorId),
    });

    return createSuccessResponse(
      this.toPublicDocument(doc),
      'Investor document uploaded successfully',
    );
  }

  async listDocuments(
    id: string,
    query: { page?: number; limit?: number },
    access: InvestorAccessContext,
  ) {
    await this.requireAccessibleInvestor(id, access);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { investorId: new Types.ObjectId(id) };

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
      items.map((item) => this.toPublicDocument(item)),
      'Investor documents fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async requireAccessibleInvestor(
    id: string,
    access: InvestorAccessContext,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid investor id');
    }

    const investor = await this.investorModel
      .findById(id)
      .select('+bankDetails.accountNumberEncrypted')
      .exec();

    if (!investor) {
      throw new NotFoundException('Investor not found');
    }

    if (
      !access.canViewAll &&
      String(investor.userId ?? '') !== access.actorId
    ) {
      throw new ForbiddenException(
        'You do not have access to this investor record',
      );
    }

    return investor;
  }

  private async toPublic(
    investor: Investor & {
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
    access: InvestorAccessContext,
  ) {
    const isOwner = String(investor.userId ?? '') === access.actorId;
    const mayDecrypt = access.canViewAll || isOwner;
    let accountNumber: string | null = null;

    if (mayDecrypt && investor.bankDetails?.accountNumberEncrypted) {
      try {
        accountNumber = decryptSensitive(
          investor.bankDetails.accountNumberEncrypted,
          this.encryptionKey(),
        );
      } catch {
        accountNumber = null;
      }
    }

    return toPublicInvestor(investor, accountNumber);
  }

  private buildBankDetailsForWrite(
    input?: CreateInvestorDto['bankDetails'],
    existing?: Investor['bankDetails'],
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

    const ifsc = normalizeOptionalCode(input.ifsc ?? null);
    assertValidIfsc(ifsc);

    let accountNumberEncrypted = existing?.accountNumberEncrypted ?? null;
    let last4 = existing?.accountNumberLast4 ?? null;

    if (input.accountNumber !== undefined) {
      if (input.accountNumber === null || input.accountNumber === '') {
        accountNumberEncrypted = null;
        last4 = null;
      } else {
        assertValidAccountNumber(input.accountNumber);
        const plain = input.accountNumber.replace(/\s+/g, '');
        accountNumberEncrypted = encryptSensitive(plain, this.encryptionKey());
        last4 = accountNumberLast4(plain);
      }
    }

    return {
      bankName: input.bankName?.trim() ?? existing?.bankName ?? null,
      branchName: input.branchName?.trim() ?? existing?.branchName ?? null,
      ifsc: ifsc ?? existing?.ifsc ?? null,
      accountHolderName:
        input.accountHolderName?.trim() ??
        existing?.accountHolderName ??
        null,
      accountNumberEncrypted,
      accountNumberLast4: last4,
    };
  }

  private encryptionKey(): string {
    return (
      this.configService.get<string>('fieldEncryptionKey') ??
      process.env.FIELD_ENCRYPTION_KEY ??
      'luxaria-dev-field-encryption-key-change-me-32b'
    );
  }

  private normalizeContact(contact?: CreateInvestorDto['contact']) {
    if (!contact) {
      return {
        email: null,
        phone: null,
        alternatePhone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        pincode: null,
        country: 'India',
      };
    }
    return {
      email: contact.email?.trim().toLowerCase() ?? null,
      phone: contact.phone?.trim() ?? null,
      alternatePhone: contact.alternatePhone?.trim() ?? null,
      addressLine1: contact.addressLine1?.trim() ?? null,
      addressLine2: contact.addressLine2?.trim() ?? null,
      city: contact.city?.trim() ?? null,
      state: contact.state?.trim() ?? null,
      pincode: contact.pincode?.trim() ?? null,
      country: contact.country?.trim() ?? 'India',
    };
  }

  private normalizeNominee(nominee?: CreateInvestorDto['nominee']) {
    if (!nominee) {
      return {
        fullName: null,
        relationship: null,
        pan: null,
        phone: null,
        email: null,
        sharePercent: null,
      };
    }
    return {
      fullName: nominee.fullName?.trim() ?? null,
      relationship: nominee.relationship?.trim() ?? null,
      pan: normalizeOptionalCode(nominee.pan ?? null),
      phone: nominee.phone?.trim() ?? null,
      email: nominee.email?.trim().toLowerCase() ?? null,
      sharePercent: nominee.sharePercent ?? null,
    };
  }

  private contactToPlain(contact: Investor['contact']) {
    return {
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      alternatePhone: contact?.alternatePhone ?? null,
      addressLine1: contact?.addressLine1 ?? null,
      addressLine2: contact?.addressLine2 ?? null,
      city: contact?.city ?? null,
      state: contact?.state ?? null,
      pincode: contact?.pincode ?? null,
      country: contact?.country ?? null,
    };
  }

  private nomineeToPlain(nominee: Investor['nominee']) {
    return {
      fullName: nominee?.fullName ?? null,
      relationship: nominee?.relationship ?? null,
      pan: nominee?.pan ?? null,
      phone: nominee?.phone ?? null,
      email: nominee?.email ?? null,
      sharePercent: nominee?.sharePercent ?? null,
    };
  }

  private bankToPlain(bank: Investor['bankDetails']) {
    return {
      bankName: bank?.bankName ?? null,
      branchName: bank?.branchName ?? null,
      ifsc: bank?.ifsc ?? null,
      accountHolderName: bank?.accountHolderName ?? null,
      accountNumberEncrypted: bank?.accountNumberEncrypted ?? null,
      accountNumberLast4: bank?.accountNumberLast4 ?? null,
    };
  }

  private async assertUserExists(userId: string) {
    const user = await this.userModel.findById(userId).select('_id').lean().exec();
    if (!user) throw new NotFoundException('User not found');
  }

  private async assertDirectorExists(directorId: string) {
    const director = await this.directorModel
      .findById(directorId)
      .select('_id')
      .lean()
      .exec();
    if (!director) throw new NotFoundException('Director not found');
  }

  private async resolveCompanyId(
    companyId?: string | null,
  ): Promise<Types.ObjectId | null> {
    if (companyId) {
      const company = await this.companyModel
        .findById(companyId)
        .select('_id')
        .lean()
        .exec();
      if (!company) throw new NotFoundException('Company not found');
      return company._id as Types.ObjectId;
    }
    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    return primary?._id ? (primary._id as Types.ObjectId) : null;
  }

  private toPublicDocument(doc: {
    _id: Types.ObjectId;
    investorId: Types.ObjectId;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    sizeBytes: number;
    category: InvestorDocumentCategory;
    uploadedBy?: Types.ObjectId | null;
    createdAt?: Date;
  }): PublicInvestorDocument {
    return {
      id: String(doc._id),
      investorId: String(doc.investorId),
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType ?? null,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
      createdAt: doc.createdAt,
    };
  }
}
