import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  IdempotencyService,
  SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
} from '../../database/services/idempotency.service';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import {
  Account,
  AccountCategory,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { DocumentsService } from '../documents/documents.service';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { JournalService } from '../journal/journal.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import type {
  AttachSignaturesDto,
  CancelSignedPaymentVoucherDto,
  CreateSignedPaymentVoucherDto,
  ListSignedPaymentVouchersQueryDto,
  ReverseSignedPaymentVoucherDto,
  UpdateSignedPaymentVoucherDto,
} from './dto/signed-payment-voucher.dto';
import { SignedPaymentVoucherPdfService } from './signed-payment-voucher-pdf.service';
import {
  type PublicSignedPaymentVoucher,
  toPublicSignedPaymentVoucher,
} from './signed-payment-vouchers.mapper';
import {
  SignedPaymentVoucher,
  SignedPaymentVoucherStatus,
  SignedPaymentVoucherType,
} from './schemas/signed-payment-voucher.schema';

const MONEY_EPS = 0.005;
const MODULE = 'signed_payment_vouchers';
const ENTITY_TYPE = 'payment_voucher';

const EDITABLE = [
  SignedPaymentVoucherStatus.Draft,
  SignedPaymentVoucherStatus.Returned,
];

/** Signatures may be attached only before approval */
const SIGNATURE_EDITABLE = [
  SignedPaymentVoucherStatus.Draft,
  SignedPaymentVoucherStatus.Submitted,
  SignedPaymentVoucherStatus.Returned,
];

@Injectable()
export class SignedPaymentVouchersService {
  constructor(
    @InjectModel(SignedPaymentVoucher.name)
    private readonly voucherModel: Model<SignedPaymentVoucher>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly cashAccountsService: CashAccountsService,
    private readonly documentsService: DocumentsService,
    private readonly journalService: JournalService,
    private readonly numberingService: NumberingService,
    private readonly financialYearService: FinancialYearService,
    private readonly pdfService: SignedPaymentVoucherPdfService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(
    dto: CreateSignedPaymentVoucherDto,
    actorId: string,
    idempotencyKey?: string | null,
  ) {
    const requestHash = this.idempotencyService.hashRequest({
      ...dto,
      actorId,
    });

    if (idempotencyKey) {
      const begin = await this.idempotencyService.begin({
        key: idempotencyKey,
        scope: SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicSignedPaymentVoucher>;
      }
    }

    try {
      if (idempotencyKey) {
        const dup = await this.voucherModel
          .findOne({ idempotencyKey: idempotencyKey.trim() })
          .lean()
          .exec();
        if (dup) {
          throw new ConflictException(
            'A signed payment voucher with this idempotency key already exists',
          );
        }
      }

      await this.requireProject(dto.projectId);
      await this.requirePettyCash(dto.pettyCashAccountId, dto.projectId);

      const deductions = dto.deductions ?? 0;
      const netAmount = this.assertAmounts(dto.grossAmount, deductions);
      const capturedAt = new Date(dto.capturedAt);

      const requiresWitness =
        dto.requiresWitnessSignature ??
        dto.voucherType === SignedPaymentVoucherType.Labour;
      const requiresPhoto = dto.requiresRecipientPhoto ?? false;

      const voucherNumber = await this.numberingService.nextCode(
        NumberEntityType.PAYMENT_VOUCHER,
        {
          asOf: capturedAt,
          projectId: dto.projectId,
          projectScoped: true,
        },
      );

      const row = await this.voucherModel.create({
        voucherNumber,
        voucherType: dto.voucherType,
        projectId: new Types.ObjectId(dto.projectId),
        pettyCashAccountId: new Types.ObjectId(dto.pettyCashAccountId),
        recipientName: dto.recipientName.trim(),
        recipientMobile: dto.recipientMobile?.trim() || null,
        workDescription: dto.workDescription.trim(),
        grossAmount: dto.grossAmount,
        deductions,
        netAmount,
        requiresWitnessSignature: requiresWitness,
        requiresRecipientPhoto: requiresPhoto,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        capturedAt,
        deviceId: dto.deviceId?.trim() || null,
        status: SignedPaymentVoucherStatus.Draft,
        idempotencyKey: idempotencyKey?.trim() ?? null,
        createdBy: new Types.ObjectId(actorId),
      });

      const response = createSuccessResponse(
        toPublicSignedPaymentVoucher(row),
        'Signed payment voucher created as draft',
      );

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }
      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateSignedPaymentVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    this.assertEditable(row);

    if (dto.pettyCashAccountId !== undefined) {
      await this.requirePettyCash(
        dto.pettyCashAccountId,
        String(row.projectId),
      );
      row.pettyCashAccountId = new Types.ObjectId(dto.pettyCashAccountId);
    }
    if (dto.recipientName !== undefined) {
      row.recipientName = dto.recipientName.trim();
    }
    if (dto.recipientMobile !== undefined) {
      row.recipientMobile = dto.recipientMobile?.trim() || null;
    }
    if (dto.workDescription !== undefined) {
      row.workDescription = dto.workDescription.trim();
    }
    if (dto.grossAmount !== undefined || dto.deductions !== undefined) {
      const gross = dto.grossAmount ?? row.grossAmount;
      const deductions = dto.deductions ?? row.deductions;
      row.grossAmount = gross;
      row.deductions = deductions;
      row.netAmount = this.assertAmounts(gross, deductions);
    }
    if (dto.requiresWitnessSignature !== undefined) {
      row.requiresWitnessSignature = dto.requiresWitnessSignature;
    }
    if (dto.requiresRecipientPhoto !== undefined) {
      row.requiresRecipientPhoto = dto.requiresRecipientPhoto;
    }
    if (dto.latitude !== undefined) row.latitude = dto.latitude;
    if (dto.longitude !== undefined) row.longitude = dto.longitude;
    if (dto.capturedAt !== undefined) {
      row.capturedAt = new Date(dto.capturedAt);
    }
    if (dto.deviceId !== undefined) {
      row.deviceId = dto.deviceId?.trim() || null;
    }

    if (row.status === SignedPaymentVoucherStatus.Returned) {
      row.status = SignedPaymentVoucherStatus.Draft;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSignedPaymentVoucher(row),
      'Signed payment voucher updated',
    );
  }

  /**
   * Bind S3 signature/photo documents and store their checksums.
   * Blocked after approval.
   */
  async attachSignatures(
    id: string,
    dto: AttachSignaturesDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    if (!SIGNATURE_EDITABLE.includes(row.status)) {
      throw new BadRequestException(
        'Signatures cannot be replaced after approval',
      );
    }
    if (
      !dto.recipientSignatureDocumentId &&
      !dto.engineerSignatureDocumentId &&
      !dto.witnessSignatureDocumentId &&
      !dto.recipientPhotoDocumentId
    ) {
      throw new BadRequestException('Provide at least one document id to attach');
    }

    if (dto.recipientSignatureDocumentId) {
      const doc = await this.bindDocument(
        dto.recipientSignatureDocumentId,
        String(row._id),
        ['recipient_signature', 'signature'],
      );
      row.recipientSignatureDocumentId = doc._id as Types.ObjectId;
      row.recipientSignatureChecksum = doc.checksum;
    }
    if (dto.engineerSignatureDocumentId) {
      const doc = await this.bindDocument(
        dto.engineerSignatureDocumentId,
        String(row._id),
        ['engineer_signature', 'signature'],
      );
      row.engineerSignatureDocumentId = doc._id as Types.ObjectId;
      row.engineerSignatureChecksum = doc.checksum;
    }
    if (dto.witnessSignatureDocumentId) {
      const doc = await this.bindDocument(
        dto.witnessSignatureDocumentId,
        String(row._id),
        ['witness_signature', 'signature'],
      );
      row.witnessSignatureDocumentId = doc._id as Types.ObjectId;
      row.witnessSignatureChecksum = doc.checksum;
    }
    if (dto.recipientPhotoDocumentId) {
      const doc = await this.bindDocument(
        dto.recipientPhotoDocumentId,
        String(row._id),
        ['recipient_photo', 'photo'],
      );
      row.recipientPhotoDocumentId = doc._id as Types.ObjectId;
      row.recipientPhotoChecksum = doc.checksum;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSignedPaymentVoucher(row),
      'Signatures attached; checksums stored',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireVoucher(id);
    if (!EDITABLE.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or returned vouchers can be submitted',
      );
    }
    this.assertSignaturesPresent(row);

    row.status = SignedPaymentVoucherStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSignedPaymentVoucher(row),
      'Signed payment voucher submitted',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireVoucher(id);
    if (row.status !== SignedPaymentVoucherStatus.Submitted) {
      throw new BadRequestException('Only submitted vouchers can be approved');
    }
    if (row.submittedBy && String(row.submittedBy) === actorId) {
      throw new ForbiddenException(
        'Approver cannot be the same user who submitted the voucher',
      );
    }
    this.assertSignaturesPresent(row);

    const project = await this.requireProject(String(row.projectId));
    const pdfBuffer = await this.pdfService.buildPdfBuffer(row);
    const pdfDoc = await this.documentsService.createActiveFromBuffer(
      {
        companyId: project.companyId ? String(project.companyId) : null,
        projectId: String(row.projectId),
        module: MODULE,
        entityType: ENTITY_TYPE,
        entityId: String(row._id),
        documentType: 'voucher_pdf',
        originalFileName: `${row.voucherNumber}.pdf`,
        mimeType: 'application/pdf',
      },
      pdfBuffer,
      actorId,
    );

    row.voucherPdfDocumentId = new Types.ObjectId(pdfDoc.data!.id);
    row.voucherPdfChecksum = pdfDoc.data!.checksum;
    row.status = SignedPaymentVoucherStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicSignedPaymentVoucher(row),
      'Signed payment voucher approved; PDF stored in S3',
    );
  }

  async post(id: string, actorId: string, idempotencyKey?: string | null) {
    const row = await this.requireVoucher(id);
    const postKey =
      idempotencyKey?.trim() || `spv-post:${String(row._id)}`;

    const begin = await this.idempotencyService.begin({
      key: postKey,
      scope: SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
      userId: actorId,
      requestHash: this.idempotencyService.hashRequest({
        voucherId: String(row._id),
        action: 'post',
      }),
    });
    if (begin.outcome === 'replay') {
      return begin.response as unknown as ApiResponseDto<PublicSignedPaymentVoucher>;
    }

    try {
      if (row.status !== SignedPaymentVoucherStatus.Approved) {
        throw new BadRequestException('Only approved vouchers can be posted');
      }
      if (row.journalEntryId) {
        throw new ConflictException('Voucher already has a journal entry');
      }
      if (row.approvedBy && String(row.approvedBy) === actorId) {
        throw new ForbiddenException(
          'Poster cannot be the same user who approved the voucher',
        );
      }

      const project = await this.requireProject(String(row.projectId));
      await this.financialYearService.assertPostingAllowed(
        row.capturedAt,
        project.companyId ? String(project.companyId) : undefined,
      );

      const cash = await this.requirePettyCash(
        String(row.pettyCashAccountId),
        String(row.projectId),
      );
      await this.cashAccountsService.assertSufficientBalance(
        String(row.pettyCashAccountId),
        row.netAmount,
      );

      const debitAccountId = await this.resolveExpenseAccount(
        row.voucherType,
      );

      const journalResponse = await this.journalService.create(
        {
          journalDate: row.capturedAt.toISOString().slice(0, 10),
          projectId: String(row.projectId),
          sourceModule: 'signed_payment',
          sourceEntityType: 'payment_voucher',
          sourceEntityId: String(row._id),
          narration: `${row.voucherNumber} — ${row.workDescription}`.slice(
            0,
            500,
          ),
          lines: [
            {
              accountId: debitAccountId,
              debit: row.netAmount,
              credit: 0,
              projectId: String(row.projectId),
              description: row.workDescription,
            },
            {
              accountId: cash.ledgerAccountId,
              debit: 0,
              credit: row.netAmount,
              projectId: String(row.projectId),
              description: `Payment to ${row.recipientName}`,
            },
          ],
          post: true,
        },
        actorId,
        `spv-journal:${String(row._id)}`,
      );

      const journalId = journalResponse.data?.id;
      if (!journalId) {
        throw new BadRequestException('Journal entry creation failed');
      }

      row.journalEntryId = new Types.ObjectId(journalId);
      row.status = SignedPaymentVoucherStatus.Posted;
      row.postedBy = new Types.ObjectId(actorId);
      row.postedAt = new Date();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();

      const response = createSuccessResponse(
        toPublicSignedPaymentVoucher(row),
        'Signed payment voucher posted',
      );
      await this.idempotencyService.complete(
        postKey,
        SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
        response as unknown as Record<string, unknown>,
      );
      return response;
    } catch (error) {
      await this.idempotencyService.fail(
        postKey,
        SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE,
      );
      throw error;
    }
  }

  /**
   * Reverse posted voucher journal and optionally create a replacement draft
   * (new signatures required — originals stay on the reversed voucher).
   */
  async reverse(
    id: string,
    dto: ReverseSignedPaymentVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    if (row.status !== SignedPaymentVoucherStatus.Posted) {
      throw new BadRequestException('Only posted vouchers can be reversed');
    }
    if (!row.journalEntryId) {
      throw new BadRequestException('Posted voucher has no journal entry');
    }
    if (row.reversalJournalEntryId) {
      throw new ConflictException('Voucher has already been reversed');
    }

    const reversal = await this.journalService.reverse(
      String(row.journalEntryId),
      actorId,
      {
        narration: `Reversal of ${row.voucherNumber}: ${dto.reason.trim()}`,
      },
    );
    const reversalId =
      reversal.data &&
      'reversal' in reversal.data &&
      reversal.data.reversal?.id
        ? reversal.data.reversal.id
        : (reversal.data as { id?: string } | undefined)?.id;
    if (!reversalId) {
      throw new BadRequestException('Journal reversal failed');
    }

    row.status = SignedPaymentVoucherStatus.Reversed;
    row.reversalJournalEntryId = new Types.ObjectId(reversalId);
    row.reversedBy = new Types.ObjectId(actorId);
    row.reversedAt = new Date();
    row.reversalReason = dto.reason.trim();

    let replacementPublic: PublicSignedPaymentVoucher | null = null;
    if (dto.createReplacement !== false) {
      const voucherNumber = await this.numberingService.nextCode(
        NumberEntityType.PAYMENT_VOUCHER,
        {
          asOf: new Date(),
          projectId: String(row.projectId),
          projectScoped: true,
        },
      );
      const replacement = await this.voucherModel.create({
        voucherNumber,
        voucherType: row.voucherType,
        projectId: row.projectId,
        pettyCashAccountId: row.pettyCashAccountId,
        recipientName: row.recipientName,
        recipientMobile: row.recipientMobile,
        workDescription: row.workDescription,
        grossAmount: row.grossAmount,
        deductions: row.deductions,
        netAmount: row.netAmount,
        requiresWitnessSignature: row.requiresWitnessSignature,
        requiresRecipientPhoto: row.requiresRecipientPhoto,
        latitude: row.latitude,
        longitude: row.longitude,
        capturedAt: new Date(),
        deviceId: row.deviceId,
        status: SignedPaymentVoucherStatus.Draft,
        replacesVoucherId: row._id,
        createdBy: new Types.ObjectId(actorId),
      });
      row.replacementVoucherId = replacement._id as Types.ObjectId;
      replacementPublic = toPublicSignedPaymentVoucher(replacement);
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      {
        reversed: toPublicSignedPaymentVoucher(row),
        replacement: replacementPublic,
      },
      replacementPublic
        ? 'Voucher reversed; replacement draft created (new signatures required)'
        : 'Voucher reversed',
    );
  }

  async cancel(
    id: string,
    dto: CancelSignedPaymentVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    if (
      [
        SignedPaymentVoucherStatus.Posted,
        SignedPaymentVoucherStatus.Reversed,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Posted/reversed vouchers cannot be cancelled; use reverse for posted',
      );
    }
    row.status = SignedPaymentVoucherStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.cancellationReason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSignedPaymentVoucher(row),
      'Signed payment voucher cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireVoucher(id);
    return createSuccessResponse(toPublicSignedPaymentVoucher(row));
  }

  async list(query: ListSignedPaymentVouchersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SignedPaymentVoucher> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.voucherType) filter.voucherType = query.voucherType;
    if (query.status) filter.status = query.status;
    if (query.replacesVoucherId) {
      filter.replacesVoucherId = new Types.ObjectId(query.replacesVoucherId);
    }

    const sort: Record<string, SortOrder> = { capturedAt: -1, createdAt: -1 };
    const [rows, total] = await Promise.all([
      this.voucherModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.voucherModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicSignedPaymentVoucher(r)),
      'Signed payment vouchers',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private assertEditable(row: SignedPaymentVoucher) {
    if (
      [
        SignedPaymentVoucherStatus.Approved,
        SignedPaymentVoucherStatus.Posted,
        SignedPaymentVoucherStatus.Reversed,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Voucher cannot be updated after approval',
      );
    }
    if (!EDITABLE.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or returned vouchers can be updated',
      );
    }
  }

  private assertAmounts(gross: number, deductions: number): number {
    if (gross <= MONEY_EPS) {
      throw new BadRequestException('grossAmount must be greater than zero');
    }
    if (deductions < -MONEY_EPS) {
      throw new BadRequestException('deductions cannot be negative');
    }
    const net = Math.round((gross - deductions) * 100) / 100;
    if (net <= MONEY_EPS) {
      throw new BadRequestException(
        'netAmount must be greater than zero after deductions',
      );
    }
    return net;
  }

  private assertSignaturesPresent(row: SignedPaymentVoucher) {
    if (!row.recipientSignatureDocumentId || !row.recipientSignatureChecksum) {
      throw new BadRequestException('Recipient signature is required');
    }
    if (!row.engineerSignatureDocumentId || !row.engineerSignatureChecksum) {
      throw new BadRequestException('Engineer signature is required');
    }
    if (
      row.requiresWitnessSignature &&
      (!row.witnessSignatureDocumentId || !row.witnessSignatureChecksum)
    ) {
      throw new BadRequestException('Witness signature is required');
    }
    if (
      row.requiresRecipientPhoto &&
      (!row.recipientPhotoDocumentId || !row.recipientPhotoChecksum)
    ) {
      throw new BadRequestException('Recipient photo is required');
    }
  }

  private async bindDocument(
    documentId: string,
    voucherId: string,
    allowedTypes: string[],
  ) {
    const doc = await this.documentsService.requireActiveDocument(documentId);
    if (String(doc.entityId) !== voucherId) {
      throw new BadRequestException(
        'Document entityId must match this voucher',
      );
    }
    if (doc.module !== MODULE) {
      throw new BadRequestException(
        `Document module must be ${MODULE}`,
      );
    }
    if (!allowedTypes.includes(doc.documentType)) {
      throw new BadRequestException(
        `Document type must be one of: ${allowedTypes.join(', ')}`,
      );
    }
    return doc;
  }

  private async resolveExpenseAccount(
    voucherType: SignedPaymentVoucherType,
  ): Promise<string> {
    const preferredCategory =
      voucherType === SignedPaymentVoucherType.Labour
        ? AccountCategory.DirectExpense
        : AccountCategory.DirectExpense;

    let account = await this.accountModel
      .findOne({
        accountType: AccountType.Expense,
        accountCategory: preferredCategory,
        status: AccountStatus.Active,
        allowManualPosting: true,
      })
      .sort({ accountCode: 1 })
      .exec();

    if (!account) {
      account = await this.accountModel
        .findOne({
          accountType: AccountType.Expense,
          status: AccountStatus.Active,
          allowManualPosting: true,
        })
        .sort({ accountCode: 1 })
        .exec();
    }
    if (!account) {
      throw new BadRequestException(
        'No active expense ledger account found for posting',
      );
    }
    return String(account._id);
  }

  private async requirePettyCash(cashAccountId: string, projectId: string) {
    const res = await this.cashAccountsService.getById(cashAccountId);
    const cash = res.data;
    if (!cash) {
      throw new NotFoundException('Petty-cash account not found');
    }
    if (cash.kind !== CashAccountKind.PettyCash) {
      throw new BadRequestException(
        'pettyCashAccountId must be a petty-cash account',
      );
    }
    if (cash.status !== CashAccountStatus.Active) {
      throw new BadRequestException('Petty-cash account is not active');
    }
    if (String(cash.projectId) !== projectId) {
      throw new BadRequestException(
        'Petty-cash account belongs to a different project',
      );
    }
    return cash;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async requireVoucher(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Signed payment voucher not found');
    }
    const row = await this.voucherModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Signed payment voucher not found');
    }
    return row;
  }
}
