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
  decryptSensitive,
  encryptSensitive,
} from '../../common/utils/crypto.util';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { normalizeOptionalCode } from '../company/company.validation';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { PermissionsService } from '../rbac/permissions.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';
import type { VerifyCustomerKycDto } from './dto/verify-kyc.dto';
import {
  type PublicCustomerDocument,
  toPublicCustomer,
} from './customers.mapper';
import {
  aadhaarReferenceLast4,
  assertAllowedCustomerDocumentMime,
  assertFundingTypeRules,
  assertOptionalPan,
  assertValidAadhaar,
  isSensitiveCustomerDocumentCategory,
  normalizeAadhaarDigits,
} from './customers.validation';
import {
  CustomerDocumentCategory,
  CustomerFile,
} from './schemas/customer-document.schema';
import {
  Customer,
  CustomerFundingType,
  CustomerKycStatus,
  CustomerStatus,
} from './schemas/customer.schema';

export type CustomerAccessContext = {
  actorId: string;
  canManage: boolean;
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(CustomerFile.name)
    private readonly documentModel: Model<CustomerFile>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly numberingService: NumberingService,
    private readonly permissionsService: PermissionsService,
    private readonly configService: ConfigService,
  ) {}

  async resolveAccess(actorId: string): Promise<CustomerAccessContext> {
    const access = await this.permissionsService.resolveUserAccess(actorId);
    const canManage =
      access.bypassPermissions ||
      access.permissions.includes('customer.manage');
    return { actorId, canManage };
  }

  async create(dto: CreateCustomerDto, actorId: string) {
    const pan = normalizeOptionalCode(dto.pan ?? null);
    assertOptionalPan(pan);
    assertValidAadhaar(dto.aadhaar);
    if (dto.jointApplicant?.pan) {
      assertOptionalPan(normalizeOptionalCode(dto.jointApplicant.pan));
    }
    if (dto.jointApplicant?.aadhaar) {
      assertValidAadhaar(dto.jointApplicant.aadhaar);
    }
    assertFundingTypeRules({
      fundingType: dto.fundingType,
      loanBank: dto.loanBank,
    });

    const companyId = await this.resolveCompanyId(dto.companyId);
    const customerCode = await this.numberingService.nextCode(
      NumberEntityType.CUSTOMER,
    );

    const aadhaarFields = this.buildAadhaarForWrite(dto.aadhaar);
    const jointApplicant = this.normalizeJointApplicant(dto.jointApplicant);

    const customer = await this.customerModel.create({
      companyId,
      customerCode,
      fullName: dto.fullName.trim(),
      jointApplicant,
      pan,
      aadhaarReference: aadhaarFields.aadhaarReference,
      aadhaarEncrypted: aadhaarFields.aadhaarEncrypted,
      contact: this.normalizeContact(dto.contact),
      address: this.normalizeAddress(dto.address),
      occupation: dto.occupation?.trim() ?? null,
      fundingType: dto.fundingType,
      loanBank:
        dto.fundingType === CustomerFundingType.OwnFunds
          ? null
          : (dto.loanBank?.trim() ?? null),
      kycStatus: CustomerKycStatus.Pending,
      status: dto.status ?? CustomerStatus.PendingKyc,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      await this.toPublic(customer, { actorId, canManage: true }),
      'Customer created successfully',
    );
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    access: CustomerAccessContext,
  ) {
    if (!access.canManage) {
      throw new ForbiddenException('Updating customers requires customer.manage');
    }
    const customer = await this.requireCustomer(id, true);

    const pan =
      dto.pan !== undefined
        ? normalizeOptionalCode(dto.pan)
        : (customer.pan ?? null);
    assertOptionalPan(pan);

    const nextFundingType = dto.fundingType ?? customer.fundingType;
    const nextLoanBank =
      dto.loanBank !== undefined
        ? dto.loanBank
        : (customer.loanBank ?? null);
    assertFundingTypeRules({
      fundingType: nextFundingType,
      loanBank:
        nextFundingType === CustomerFundingType.OwnFunds ? null : nextLoanBank,
    });

    if (dto.aadhaar !== undefined) {
      assertValidAadhaar(dto.aadhaar);
    }
    if (dto.jointApplicant?.pan) {
      assertOptionalPan(normalizeOptionalCode(dto.jointApplicant.pan));
    }
    if (dto.jointApplicant?.aadhaar !== undefined) {
      assertValidAadhaar(dto.jointApplicant.aadhaar);
    }

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(access.actorId),
    };

    if (dto.fullName !== undefined) update.fullName = dto.fullName.trim();
    if (dto.pan !== undefined) update.pan = pan;
    if (dto.occupation !== undefined) {
      update.occupation = dto.occupation?.trim() ?? null;
    }
    if (dto.fundingType !== undefined) update.fundingType = dto.fundingType;
    if (dto.loanBank !== undefined || dto.fundingType !== undefined) {
      update.loanBank =
        nextFundingType === CustomerFundingType.OwnFunds
          ? null
          : (nextLoanBank?.trim() ?? null);
    }
    if (dto.contact !== undefined) {
      update.contact = {
        ...this.contactToPlain(customer.contact),
        ...this.normalizeContact(dto.contact),
      };
    }
    if (dto.address !== undefined) {
      update.address = {
        ...this.addressToPlain(customer.address),
        ...this.normalizeAddress(dto.address),
      };
    }
    if (dto.jointApplicant !== undefined) {
      update.jointApplicant = {
        ...this.jointToPlain(customer.jointApplicant),
        ...this.normalizeJointApplicant(
          dto.jointApplicant,
          customer.jointApplicant,
        ),
      };
    }
    if (dto.aadhaar !== undefined) {
      const fields = this.buildAadhaarForWrite(dto.aadhaar, {
        aadhaarEncrypted: customer.aadhaarEncrypted,
        aadhaarReference: customer.aadhaarReference,
      });
      update.aadhaarEncrypted = fields.aadhaarEncrypted;
      update.aadhaarReference = fields.aadhaarReference;
    }
    if (dto.companyId !== undefined) {
      update.companyId = await this.resolveCompanyId(dto.companyId);
    }
    if (dto.status !== undefined) update.status = dto.status;

    const updated = await this.customerModel
      .findByIdAndUpdate(id, update, { new: true })
      .select('+aadhaarEncrypted +jointApplicant.aadhaarEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      'Customer updated successfully',
    );
  }

  async getById(id: string, access: CustomerAccessContext) {
    const customer = await this.requireCustomer(id, true);
    return createSuccessResponse(
      await this.toPublic(customer, access),
      'Customer fetched successfully',
    );
  }

  async list(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: CustomerStatus;
      fundingType?: CustomerFundingType;
      kycStatus?: CustomerKycStatus;
      companyId?: string;
      sortOrder?: 'asc' | 'desc';
    },
    access: CustomerAccessContext,
  ) {
    const filter: FilterQuery<Customer> = {};

    if (query.status) filter.status = query.status;
    if (query.fundingType) filter.fundingType = query.fundingType;
    if (query.kycStatus) filter.kycStatus = query.kycStatus;
    if (query.companyId) filter.companyId = new Types.ObjectId(query.companyId);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { customerCode: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } },
        { aadhaarReference: search.slice(-4) },
        { 'contact.email': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
        { loanBank: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .select('+aadhaarEncrypted +jointApplicant.aadhaarEncrypted')
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(filter).exec(),
    ]);

    const data = await Promise.all(
      items.map((item) => this.toPublic(item, access)),
    );

    return createSuccessResponse(
      data,
      'Customers fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async verifyKyc(
    id: string,
    dto: VerifyCustomerKycDto,
    access: CustomerAccessContext,
  ) {
    if (!access.canManage) {
      throw new ForbiddenException(
        'KYC verification requires customer.manage',
      );
    }
    await this.requireCustomer(id);

    const now = new Date();
    const updated = await this.customerModel
      .findByIdAndUpdate(
        id,
        {
          kycStatus: dto.verified
            ? CustomerKycStatus.Verified
            : CustomerKycStatus.Rejected,
          kycVerifiedBy: new Types.ObjectId(access.actorId),
          kycVerifiedAt: now,
          kycNotes: dto.notes?.trim() ?? null,
          status: dto.verified
            ? CustomerStatus.Active
            : CustomerStatus.PendingKyc,
          updatedBy: new Types.ObjectId(access.actorId),
        },
        { new: true },
      )
      .select('+aadhaarEncrypted +jointApplicant.aadhaarEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      dto.verified ? 'Customer KYC verified' : 'Customer KYC rejected',
    );
  }

  async activate(id: string, access: CustomerAccessContext) {
    if (!access.canManage) {
      throw new ForbiddenException('Activation requires customer.manage');
    }
    const customer = await this.requireCustomer(id);
    if (customer.kycStatus !== CustomerKycStatus.Verified) {
      throw new BadRequestException(
        'Customer KYC must be verified before activation',
      );
    }

    const updated = await this.customerModel
      .findByIdAndUpdate(
        id,
        {
          status: CustomerStatus.Active,
          updatedBy: new Types.ObjectId(access.actorId),
        },
        { new: true },
      )
      .select('+aadhaarEncrypted +jointApplicant.aadhaarEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      'Customer activated successfully',
    );
  }

  async deactivate(id: string, access: CustomerAccessContext) {
    if (!access.canManage) {
      throw new ForbiddenException('Deactivation requires customer.manage');
    }
    await this.requireCustomer(id);

    const updated = await this.customerModel
      .findByIdAndUpdate(
        id,
        {
          status: CustomerStatus.Inactive,
          updatedBy: new Types.ObjectId(access.actorId),
        },
        { new: true },
      )
      .select('+aadhaarEncrypted +jointApplicant.aadhaarEncrypted')
      .exec();

    return createSuccessResponse(
      await this.toPublic(updated!, access),
      'Customer deactivated successfully',
    );
  }

  async addDocument(
    id: string,
    input: {
      fileName: string;
      storageKey: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: CustomerDocumentCategory;
    },
    access: CustomerAccessContext,
  ) {
    if (!access.canManage) {
      throw new ForbiddenException(
        'Uploading customer documents requires customer.manage',
      );
    }
    await this.requireCustomer(id);
    assertAllowedCustomerDocumentMime(input.mimeType);

    const category = input.category ?? CustomerDocumentCategory.General;
    const isSensitive = isSensitiveCustomerDocumentCategory(category);

    const doc = await this.documentModel.create({
      customerId: new Types.ObjectId(id),
      fileName: input.fileName,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category,
      isSensitive,
      uploadedBy: new Types.ObjectId(access.actorId),
      createdBy: new Types.ObjectId(access.actorId),
    });

    return createSuccessResponse(
      this.toPublicDocument(doc),
      'Customer document uploaded successfully',
    );
  }

  async listDocuments(
    id: string,
    query: { page?: number; limit?: number },
    _access: CustomerAccessContext,
  ) {
    await this.requireCustomer(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { customerId: new Types.ObjectId(id) };

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
      'Customer documents fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Returns private storage metadata for download. Sensitive docs require manage.
   * storageKey is never included in list/get metadata responses.
   */
  async getDocumentForDownload(
    customerId: string,
    documentId: string,
    access: CustomerAccessContext,
  ): Promise<{
    storageKey: string;
    fileName: string;
    mimeType: string | null;
    isSensitive: boolean;
  }> {
    await this.requireCustomer(customerId);

    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Invalid document id');
    }

    const doc = await this.documentModel
      .findOne({
        _id: documentId,
        customerId: new Types.ObjectId(customerId),
      })
      .select('+storageKey')
      .exec();

    if (!doc) {
      throw new NotFoundException('Customer document not found');
    }

    if (doc.isSensitive && !access.canManage) {
      throw new ForbiddenException(
        'Downloading sensitive KYC documents requires customer.manage',
      );
    }

    if (!doc.storageKey) {
      throw new NotFoundException('Document storage key missing');
    }

    return {
      storageKey: doc.storageKey,
      fileName: doc.fileName,
      mimeType: doc.mimeType ?? null,
      isSensitive: doc.isSensitive,
    };
  }

  private async requireCustomer(id: string, withSecrets = false) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer id');
    }

    let query = this.customerModel.findById(id);
    if (withSecrets) {
      query = query.select('+aadhaarEncrypted +jointApplicant.aadhaarEncrypted');
    }

    const customer = await query.exec();
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  private async toPublic(
    customer: Customer & {
      _id: Types.ObjectId | string;
      aadhaarEncrypted?: string | null;
      jointApplicant?: Customer['jointApplicant'] & {
        aadhaarEncrypted?: string | null;
      };
    },
    access: CustomerAccessContext,
  ) {
    let aadhaar: string | null = null;
    let jointApplicantAadhaar: string | null = null;

    if (access.canManage) {
      if (customer.aadhaarEncrypted) {
        try {
          aadhaar = decryptSensitive(
            customer.aadhaarEncrypted,
            this.encryptionKey(),
          );
        } catch {
          aadhaar = null;
        }
      }
      if (customer.jointApplicant?.aadhaarEncrypted) {
        try {
          jointApplicantAadhaar = decryptSensitive(
            customer.jointApplicant.aadhaarEncrypted,
            this.encryptionKey(),
          );
        } catch {
          jointApplicantAadhaar = null;
        }
      }
    }

    return toPublicCustomer(customer, { aadhaar, jointApplicantAadhaar });
  }

  private buildAadhaarForWrite(
    aadhaar?: string | null,
    existing?: {
      aadhaarEncrypted?: string | null;
      aadhaarReference?: string | null;
    },
  ) {
    if (aadhaar === undefined) {
      return {
        aadhaarEncrypted: existing?.aadhaarEncrypted ?? null,
        aadhaarReference: existing?.aadhaarReference ?? null,
      };
    }

    if (aadhaar === null || aadhaar === '') {
      return { aadhaarEncrypted: null, aadhaarReference: null };
    }

    const digits = normalizeAadhaarDigits(aadhaar)!;
    return {
      aadhaarEncrypted: encryptSensitive(digits, this.encryptionKey()),
      aadhaarReference: aadhaarReferenceLast4(digits),
    };
  }

  private encryptionKey(): string {
    return (
      this.configService.get<string>('fieldEncryptionKey') ??
      process.env.FIELD_ENCRYPTION_KEY ??
      'luxaria-dev-field-encryption-key-change-me-32b'
    );
  }

  private normalizeContact(contact?: CreateCustomerDto['contact']) {
    if (!contact) {
      return { email: null, phone: null, alternatePhone: null };
    }
    return {
      email: contact.email?.trim().toLowerCase() ?? null,
      phone: contact.phone?.trim() ?? null,
      alternatePhone: contact.alternatePhone?.trim() ?? null,
    };
  }

  private normalizeAddress(address?: CreateCustomerDto['address']) {
    if (!address) {
      return {
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        pincode: null,
        country: 'India',
      };
    }
    return {
      addressLine1: address.addressLine1?.trim() ?? null,
      addressLine2: address.addressLine2?.trim() ?? null,
      city: address.city?.trim() ?? null,
      state: address.state?.trim() ?? null,
      pincode: address.pincode?.trim() ?? null,
      country: address.country?.trim() ?? 'India',
    };
  }

  private normalizeJointApplicant(
    joint?: CreateCustomerDto['jointApplicant'],
    existing?: Customer['jointApplicant'],
  ) {
    if (!joint) {
      return {
        fullName: existing?.fullName ?? null,
        relationship: existing?.relationship ?? null,
        pan: existing?.pan ?? null,
        aadhaarReference: existing?.aadhaarReference ?? null,
        aadhaarEncrypted: existing?.aadhaarEncrypted ?? null,
        phone: existing?.phone ?? null,
        email: existing?.email ?? null,
      };
    }

    const aadhaarFields =
      joint.aadhaar !== undefined
        ? this.buildAadhaarForWrite(joint.aadhaar, {
            aadhaarEncrypted: existing?.aadhaarEncrypted,
            aadhaarReference: existing?.aadhaarReference,
          })
        : {
            aadhaarEncrypted: existing?.aadhaarEncrypted ?? null,
            aadhaarReference: existing?.aadhaarReference ?? null,
          };

    return {
      fullName: joint.fullName?.trim() ?? existing?.fullName ?? null,
      relationship:
        joint.relationship?.trim() ?? existing?.relationship ?? null,
      pan:
        joint.pan !== undefined
          ? normalizeOptionalCode(joint.pan)
          : (existing?.pan ?? null),
      aadhaarReference: aadhaarFields.aadhaarReference,
      aadhaarEncrypted: aadhaarFields.aadhaarEncrypted,
      phone: joint.phone?.trim() ?? existing?.phone ?? null,
      email:
        joint.email !== undefined
          ? (joint.email?.trim().toLowerCase() ?? null)
          : (existing?.email ?? null),
    };
  }

  private contactToPlain(contact: Customer['contact']) {
    return {
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
      alternatePhone: contact?.alternatePhone ?? null,
    };
  }

  private addressToPlain(address: Customer['address']) {
    return {
      addressLine1: address?.addressLine1 ?? null,
      addressLine2: address?.addressLine2 ?? null,
      city: address?.city ?? null,
      state: address?.state ?? null,
      pincode: address?.pincode ?? null,
      country: address?.country ?? null,
    };
  }

  private jointToPlain(joint: Customer['jointApplicant']) {
    return {
      fullName: joint?.fullName ?? null,
      relationship: joint?.relationship ?? null,
      pan: joint?.pan ?? null,
      aadhaarReference: joint?.aadhaarReference ?? null,
      aadhaarEncrypted: joint?.aadhaarEncrypted ?? null,
      phone: joint?.phone ?? null,
      email: joint?.email ?? null,
    };
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
    customerId: Types.ObjectId;
    fileName: string;
    mimeType?: string | null;
    sizeBytes: number;
    category: CustomerDocumentCategory;
    isSensitive: boolean;
    uploadedBy?: Types.ObjectId | null;
    createdAt?: Date;
  }): PublicCustomerDocument {
    return {
      id: String(doc._id),
      customerId: String(doc.customerId),
      fileName: doc.fileName,
      mimeType: doc.mimeType ?? null,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      isSensitive: doc.isSensitive,
      uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
      createdAt: doc.createdAt,
    };
  }
}
