import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, PipelineStage, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  IdempotencyService,
  PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
} from '../../database/services/idempotency.service';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import {
  BankAccountStatus,
  CompanyBankAccount,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import { JournalService } from '../journal/journal.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { PettyCashRequirementsService } from '../petty-cash-requirements/petty-cash-requirements.service';
import { PettyCashRequirementStatus } from '../petty-cash-requirements/schemas/petty-cash-requirement.schema';
import type {
  CancelPettyCashFundTransferDto,
  CreatePettyCashFundTransferDto,
  ListPettyCashFundTransfersQueryDto,
  UpdatePettyCashFundTransferDto,
} from './dto/petty-cash-fund-transfer.dto';
import {
  type PublicPettyCashFundTransfer,
  toPublicFundTransfer,
} from './petty-cash-fund-transfers.mapper';
import {
  PettyCashFundTransfer,
  PettyCashFundTransferStatus,
} from './schemas/petty-cash-fund-transfer.schema';

const MONEY_EPS = 0.005;
const ACTIVE_TRANSFER_STATUSES = [
  PettyCashFundTransferStatus.Draft,
  PettyCashFundTransferStatus.Verified,
  PettyCashFundTransferStatus.Posted,
];

@Injectable()
export class PettyCashFundTransfersService {
  constructor(
    @InjectModel(PettyCashFundTransfer.name)
    private readonly transferModel: Model<PettyCashFundTransfer>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    private readonly cashAccountsService: CashAccountsService,
    private readonly requirementsService: PettyCashRequirementsService,
    private readonly journalService: JournalService,
    private readonly numberingService: NumberingService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(
    dto: CreatePettyCashFundTransferDto,
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
        scope: PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicPettyCashFundTransfer>;
      }
    }

    try {
      if (idempotencyKey) {
        const dup = await this.transferModel
          .findOne({ idempotencyKey: idempotencyKey.trim() })
          .lean()
          .exec();
        if (dup) {
          throw new ConflictException(
            'A fund transfer with this idempotency key already exists',
          );
        }
      }

      await this.assertTransferPayload(dto);

      const transferDate = new Date(dto.transferDate);
      const transferNumber = await this.numberingService.nextCode(
        NumberEntityType.PETTY_CASH_FUND_TRANSFER,
        {
          asOf: transferDate,
          projectId: dto.projectId,
          projectScoped: true,
        },
      );

      const row = await this.transferModel.create({
        transferNumber,
        projectId: new Types.ObjectId(dto.projectId),
        requestId: new Types.ObjectId(dto.requestId),
        sourceBankAccountId: new Types.ObjectId(dto.sourceBankAccountId),
        destinationPettyCashAccountId: new Types.ObjectId(
          dto.destinationPettyCashAccountId,
        ),
        transferDate,
        amount: dto.amount,
        transactionReference: dto.transactionReference?.trim() || null,
        paymentProof: dto.paymentProof?.trim() || null,
        status: PettyCashFundTransferStatus.Draft,
        idempotencyKey: idempotencyKey?.trim() ?? null,
        journalEntryId: null,
        createdBy: new Types.ObjectId(actorId),
      });

      const response = createSuccessResponse(
        toPublicFundTransfer(row),
        'Petty-cash fund transfer created as draft',
      );

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdatePettyCashFundTransferDto,
    actorId: string,
  ) {
    const row = await this.requireTransfer(id);
    if (row.status !== PettyCashFundTransferStatus.Draft) {
      throw new BadRequestException('Only draft transfers can be updated');
    }

    const next = {
      projectId: dto.projectId ?? String(row.projectId),
      requestId: dto.requestId ?? String(row.requestId),
      sourceBankAccountId:
        dto.sourceBankAccountId ?? String(row.sourceBankAccountId),
      destinationPettyCashAccountId:
        dto.destinationPettyCashAccountId ??
        String(row.destinationPettyCashAccountId),
      transferDate: dto.transferDate ?? row.transferDate.toISOString(),
      amount: dto.amount ?? row.amount,
      transactionReference:
        dto.transactionReference !== undefined
          ? dto.transactionReference
          : row.transactionReference,
      paymentProof:
        dto.paymentProof !== undefined ? dto.paymentProof : row.paymentProof,
    };

    await this.assertTransferPayload(next, String(row._id));

    row.projectId = new Types.ObjectId(next.projectId);
    row.requestId = new Types.ObjectId(next.requestId);
    row.sourceBankAccountId = new Types.ObjectId(next.sourceBankAccountId);
    row.destinationPettyCashAccountId = new Types.ObjectId(
      next.destinationPettyCashAccountId,
    );
    row.transferDate = new Date(next.transferDate);
    row.amount = next.amount;
    row.transactionReference = next.transactionReference?.trim() || null;
    row.paymentProof = next.paymentProof?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicFundTransfer(row),
      'Petty-cash fund transfer updated',
    );
  }

  async verify(id: string, actorId: string) {
    const row = await this.requireTransfer(id);
    if (row.status !== PettyCashFundTransferStatus.Draft) {
      throw new BadRequestException('Only draft transfers can be verified');
    }
    if (!row.paymentProof?.trim()) {
      throw new BadRequestException(
        'paymentProof is required before verification',
      );
    }
    if (!row.transactionReference?.trim()) {
      throw new BadRequestException(
        'transactionReference is required before verification',
      );
    }

    await this.assertTransferPayload(
      {
        projectId: String(row.projectId),
        requestId: String(row.requestId),
        sourceBankAccountId: String(row.sourceBankAccountId),
        destinationPettyCashAccountId: String(
          row.destinationPettyCashAccountId,
        ),
        transferDate: row.transferDate.toISOString(),
        amount: row.amount,
      },
      String(row._id),
    );

    row.status = PettyCashFundTransferStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicFundTransfer(row),
      'Petty-cash fund transfer verified',
    );
  }

  /**
   * Posts the transfer: creates Dr Petty Cash / Cr Bank via JournalService,
   * then updates the requirement funded amount. Cash balances update only
   * through the posted journal lines.
   */
  async post(id: string, actorId: string, idempotencyKey?: string | null) {
    const row = await this.requireTransfer(id);
    const postKey =
      idempotencyKey?.trim() || `pcft-post:${String(row._id)}`;

    const requestHash = this.idempotencyService.hashRequest({
      transferId: String(row._id),
      action: 'post',
    });

    const begin = await this.idempotencyService.begin({
      key: postKey,
      scope: PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
      userId: actorId,
      requestHash,
    });
    if (begin.outcome === 'replay') {
      return begin.response as unknown as ApiResponseDto<PublicPettyCashFundTransfer>;
    }

    try {
      if (row.status !== PettyCashFundTransferStatus.Verified) {
        throw new BadRequestException('Only verified transfers can be posted');
      }
      if (row.journalEntryId) {
        throw new ConflictException('Transfer already has a journal entry');
      }

      await this.assertTransferPayload(
        {
          projectId: String(row.projectId),
          requestId: String(row.requestId),
          sourceBankAccountId: String(row.sourceBankAccountId),
          destinationPettyCashAccountId: String(
            row.destinationPettyCashAccountId,
          ),
          transferDate: row.transferDate.toISOString(),
          amount: row.amount,
        },
        String(row._id),
      );

      const bank = await this.requireActiveBank(
        String(row.sourceBankAccountId),
        String(row.projectId),
      );
      const cash = await this.requireActivePettyCash(
        String(row.destinationPettyCashAccountId),
        String(row.projectId),
      );

      const journalKey = `pcft-journal:${String(row._id)}`;
      const journalResponse = await this.journalService.create(
        {
          journalDate: row.transferDate.toISOString().slice(0, 10),
          projectId: String(row.projectId),
          sourceModule: 'petty_cash',
          sourceEntityType: 'fund_transfer',
          sourceEntityId: String(row._id),
          narration: `Petty-cash fund transfer ${row.transferNumber}${
            row.transactionReference
              ? ` (ref ${row.transactionReference})`
              : ''
          }`,
          lines: [
            {
              accountId: cash.ledgerAccountId,
              debit: row.amount,
              credit: 0,
              projectId: String(row.projectId),
              description: 'Site petty cash funding',
            },
            {
              accountId: String(bank.ledgerAccountId),
              debit: 0,
              credit: row.amount,
              projectId: String(row.projectId),
              description: 'Bank transfer to site petty cash',
            },
          ],
          post: true,
        },
        actorId,
        journalKey,
      );

      const journalId = journalResponse.data?.id;
      if (!journalId) {
        throw new BadRequestException('Journal entry creation failed');
      }

      await this.requirementsService.applyFundTransferPosted(
        String(row.requestId),
        row.amount,
        actorId,
      );

      row.journalEntryId = new Types.ObjectId(journalId);
      row.status = PettyCashFundTransferStatus.Posted;
      row.postedBy = new Types.ObjectId(actorId);
      row.postedAt = new Date();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();

      const response = createSuccessResponse(
        toPublicFundTransfer(row),
        'Petty-cash fund transfer posted',
      );

      await this.idempotencyService.complete(
        postKey,
        PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
        response as unknown as Record<string, unknown>,
      );

      return response;
    } catch (error) {
      await this.idempotencyService.fail(
        postKey,
        PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE,
      );
      throw error;
    }
  }

  async cancel(
    id: string,
    dto: CancelPettyCashFundTransferDto,
    actorId: string,
  ) {
    const row = await this.requireTransfer(id);
    if (
      ![
        PettyCashFundTransferStatus.Draft,
        PettyCashFundTransferStatus.Verified,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Posted transfers cannot be cancelled; reverse via journal',
      );
    }
    row.status = PettyCashFundTransferStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.cancellationReason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicFundTransfer(row),
      'Petty-cash fund transfer cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireTransfer(id);
    return createSuccessResponse(toPublicFundTransfer(row));
  }

  async list(query: ListPettyCashFundTransfersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<PettyCashFundTransfer> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.requestId) {
      filter.requestId = new Types.ObjectId(query.requestId);
    }
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { transferDate: -1, createdAt: -1 };
    const [rows, total] = await Promise.all([
      this.transferModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.transferModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicFundTransfer(r)),
      'Petty-cash fund transfers',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getApprovedRequestBalance(
    requestId: string,
    excludeTransferId?: string,
  ) {
    const requirement = await this.requirementsService.getById(requestId);
    const req = requirement.data;
    if (!req) {
      throw new NotFoundException('Petty-cash requirement not found');
    }
    if (req.approvedAmount == null) {
      throw new BadRequestException('Requirement has no approved amount');
    }
    const committed = await this.sumCommittedAmount(
      requestId,
      excludeTransferId,
    );
    const remaining = Math.max(
      0,
      req.approvedAmount - Math.max(req.fundedAmount ?? 0, committed),
    );
    return createSuccessResponse({
      requestId,
      approvedAmount: req.approvedAmount,
      fundedAmount: req.fundedAmount ?? 0,
      committedTransferAmount: committed,
      remainingApprovedBalance: remaining,
    });
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private async assertTransferPayload(
    dto: {
      projectId: string;
      requestId: string;
      sourceBankAccountId: string;
      destinationPettyCashAccountId: string;
      transferDate: string;
      amount: number;
    },
    excludeTransferId?: string,
  ) {
    if (dto.amount <= MONEY_EPS) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const requirement = await this.requirementsService.getById(dto.requestId);
    const req = requirement.data;
    if (!req) {
      throw new NotFoundException('Petty-cash requirement not found');
    }
    if (String(req.projectId) !== dto.projectId) {
      throw new BadRequestException(
        'projectId must match the petty-cash requirement project',
      );
    }
    if (
      ![
        PettyCashRequirementStatus.Approved,
        PettyCashRequirementStatus.Funded,
      ].includes(req.status)
    ) {
      throw new BadRequestException(
        'Fund transfers require an approved or funded requirement',
      );
    }
    if (req.approvedAmount == null) {
      throw new BadRequestException('Requirement has no approved amount');
    }
    if (
      String(req.pettyCashAccountId) !== dto.destinationPettyCashAccountId
    ) {
      throw new BadRequestException(
        'destinationPettyCashAccountId must match the requirement petty-cash account',
      );
    }

    await this.requireActivePettyCash(
      dto.destinationPettyCashAccountId,
      dto.projectId,
    );
    await this.requireActiveBank(dto.sourceBankAccountId, dto.projectId);

    const committed = await this.sumCommittedAmount(
      dto.requestId,
      excludeTransferId,
    );
    const used = Math.max(req.fundedAmount ?? 0, committed);
    const remaining = req.approvedAmount - used;
    if (dto.amount - remaining > MONEY_EPS) {
      throw new BadRequestException(
        `Transfer amount exceeds approved request balance (remaining ${remaining.toFixed(2)})`,
      );
    }
  }

  private async sumCommittedAmount(
    requestId: string,
    excludeTransferId?: string,
  ): Promise<number> {
    const filter: FilterQuery<PettyCashFundTransfer> = {
      requestId: new Types.ObjectId(requestId),
      status: { $in: ACTIVE_TRANSFER_STATUSES },
      isDeleted: { $ne: true },
    };
    if (excludeTransferId) {
      filter._id = { $ne: new Types.ObjectId(excludeTransferId) };
    }
    const [agg] = await this.transferModel
      .aggregate<{ total: number }>([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ] as PipelineStage[])
      .exec();
    return agg?.total ?? 0;
  }

  private async requireActiveBank(bankAccountId: string, projectId: string) {
    const bank = await this.bankModel.findById(bankAccountId).exec();
    if (!bank) {
      throw new NotFoundException('Source bank account not found');
    }
    if (bank.status !== BankAccountStatus.Active) {
      throw new BadRequestException('Source bank account is not active');
    }
    if (bank.projectId && String(bank.projectId) !== projectId) {
      throw new BadRequestException(
        'Source bank account is not available for this project',
      );
    }
    return bank;
  }

  private async requireActivePettyCash(
    cashAccountId: string,
    projectId: string,
  ) {
    const res = await this.cashAccountsService.getById(cashAccountId);
    const cash = res.data;
    if (!cash) {
      throw new NotFoundException('Destination petty-cash account not found');
    }
    if (cash.kind !== CashAccountKind.PettyCash) {
      throw new BadRequestException(
        'destinationPettyCashAccountId must be a petty-cash account',
      );
    }
    if (cash.status !== CashAccountStatus.Active) {
      throw new BadRequestException(
        'Destination petty-cash account is not active',
      );
    }
    if (String(cash.projectId) !== projectId) {
      throw new BadRequestException(
        'Destination petty-cash account belongs to a different project',
      );
    }
    return cash;
  }

  private async requireTransfer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Fund transfer not found');
    }
    const row = await this.transferModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Fund transfer not found');
    }
    return row;
  }
}
