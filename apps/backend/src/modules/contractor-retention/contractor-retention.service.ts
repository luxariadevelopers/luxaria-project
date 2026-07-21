import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import { toPublicContractorRetention } from './contractor-retention.mapper';
import type {
  CreateContractorRetentionDto,
  ListContractorRetentionQueryDto,
  RejectContractorRetentionDto,
  RetentionRegisterQueryDto,
  UpdateContractorRetentionDto,
} from './dto/contractor-retention.dto';
import {
  ContractorRetention,
  RetentionKind,
  RetentionReleaseStage,
  RetentionStatus,
} from './schemas/contractor-retention.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const HELD_STATUSES: RetentionStatus[] = [
  RetentionStatus.Approved,
  RetentionStatus.Released,
];

@Injectable()
export class ContractorRetentionService {
  constructor(
    @InjectModel(ContractorRetention.name)
    private readonly model: Model<ContractorRetention>,
    @InjectModel(ContractorBill.name)
    private readonly billModel: Model<ContractorBill>,
  ) {}

  async create(dto: CreateContractorRetentionDto, actorId: string) {
    this.assertCreateShape(dto);

    if (dto.kind === RetentionKind.Deduction) {
      await this.assertBillForDeduction(dto);
      await this.assertCeilingAllows(dto, null);
    } else {
      await this.assertReleaseAgainstHeld(dto, null);
    }

    const retentionNumber = await this.nextNumber(dto.projectId);
    const row = await this.model.create({
      retentionNumber,
      projectId: new Types.ObjectId(dto.projectId),
      contractorId: new Types.ObjectId(dto.contractorId),
      agreementId: dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null,
      billId: dto.billId ? new Types.ObjectId(dto.billId) : null,
      kind: dto.kind,
      ceilingAmount: roundMoney(dto.ceilingAmount),
      amount: roundMoney(dto.amount),
      releaseStage:
        dto.kind === RetentionKind.Release
          ? (dto.releaseStage as RetentionReleaseStage)
          : null,
      bgReference:
        dto.kind === RetentionKind.Release &&
        dto.releaseStage === RetentionReleaseStage.BgReplacement
          ? (dto.bgReference?.trim() ?? null)
          : (dto.bgReference?.trim() ?? null),
      status: RetentionStatus.Draft,
      notes: dto.notes?.trim() ?? null,
      rejectionReason: null,
      requestedBy: null,
      requestedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      releasedBy: null,
      releasedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention record created',
    );
  }

  async update(
    id: string,
    dto: UpdateContractorRetentionDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== RetentionStatus.Draft) {
      throw new BadRequestException('Only draft retention records can be updated');
    }

    if (dto.agreementId !== undefined) {
      row.agreementId = dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null;
    }
    if (dto.billId !== undefined) {
      row.billId = dto.billId ? new Types.ObjectId(dto.billId) : null;
    }
    if (dto.ceilingAmount !== undefined) {
      row.ceilingAmount = roundMoney(dto.ceilingAmount);
    }
    if (dto.amount !== undefined) {
      row.amount = roundMoney(dto.amount);
    }
    if (dto.releaseStage !== undefined) {
      if (row.kind !== RetentionKind.Release) {
        throw new BadRequestException('releaseStage applies only to releases');
      }
      row.releaseStage = dto.releaseStage ?? null;
    }
    if (dto.bgReference !== undefined) {
      row.bgReference = dto.bgReference?.trim() ?? null;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }

    if (row.kind === RetentionKind.Deduction) {
      if (!row.billId) {
        throw new BadRequestException('Deduction requires billId');
      }
      await this.assertBillForDeduction({
        projectId: String(row.projectId),
        contractorId: String(row.contractorId),
        agreementId: row.agreementId ? String(row.agreementId) : null,
        billId: String(row.billId),
        kind: RetentionKind.Deduction,
        ceilingAmount: row.ceilingAmount,
        amount: row.amount,
      });
      await this.assertCeilingAllows(
        {
          projectId: String(row.projectId),
          contractorId: String(row.contractorId),
          agreementId: row.agreementId ? String(row.agreementId) : null,
          ceilingAmount: row.ceilingAmount,
          amount: row.amount,
          kind: RetentionKind.Deduction,
        },
        String(row._id),
      );
    } else {
      if (!row.releaseStage) {
        throw new BadRequestException('Release requires releaseStage');
      }
      await this.assertReleaseAgainstHeld(
        {
          projectId: String(row.projectId),
          contractorId: String(row.contractorId),
          agreementId: row.agreementId ? String(row.agreementId) : null,
          ceilingAmount: row.ceilingAmount,
          amount: row.amount,
          kind: RetentionKind.Release,
          releaseStage: row.releaseStage,
        },
        String(row._id),
      );
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention record updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== RetentionStatus.Draft) {
      throw new BadRequestException('Only draft records can be submitted');
    }
    row.status = RetentionStatus.PendingApproval;
    row.requestedBy = new Types.ObjectId(actorId);
    row.requestedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention submitted for approval',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== RetentionStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval records can be approved',
      );
    }

    if (row.kind === RetentionKind.Deduction) {
      await this.assertCeilingAllows(
        {
          projectId: String(row.projectId),
          contractorId: String(row.contractorId),
          agreementId: row.agreementId ? String(row.agreementId) : null,
          ceilingAmount: row.ceilingAmount,
          amount: row.amount,
          kind: RetentionKind.Deduction,
        },
        String(row._id),
      );
    } else {
      await this.assertReleaseAgainstHeld(
        {
          projectId: String(row.projectId),
          contractorId: String(row.contractorId),
          agreementId: row.agreementId ? String(row.agreementId) : null,
          ceilingAmount: row.ceilingAmount,
          amount: row.amount,
          kind: RetentionKind.Release,
          releaseStage: row.releaseStage,
        },
        String(row._id),
      );
    }

    row.status = RetentionStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention approved',
    );
  }

  async reject(
    id: string,
    dto: RejectContractorRetentionDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (row.status !== RetentionStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending_approval records can be rejected',
      );
    }
    row.status = RetentionStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention rejected',
    );
  }

  /** Finalise an approved release (requires contractor_retention.release). */
  async release(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.kind !== RetentionKind.Release) {
      throw new BadRequestException('Only release records can be released');
    }
    if (row.status !== RetentionStatus.Approved) {
      throw new BadRequestException(
        'Only approved release records can be released',
      );
    }
    await this.assertReleaseAgainstHeld(
      {
        projectId: String(row.projectId),
        contractorId: String(row.contractorId),
        agreementId: row.agreementId ? String(row.agreementId) : null,
        ceilingAmount: row.ceilingAmount,
        amount: row.amount,
        kind: RetentionKind.Release,
        releaseStage: row.releaseStage,
      },
      String(row._id),
    );

    row.status = RetentionStatus.Released;
    row.releasedBy = new Types.ObjectId(actorId);
    row.releasedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention released',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== RetentionStatus.Draft &&
      row.status !== RetentionStatus.PendingApproval &&
      row.status !== RetentionStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft, pending_approval, or rejected records can be cancelled',
      );
    }
    row.status = RetentionStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicContractorRetention(row),
      'Retention record fetched',
    );
  }

  async list(query: ListContractorRetentionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorRetention> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.agreementId) {
      filter.agreementId = new Types.ObjectId(query.agreementId);
    }
    if (query.billId) filter.billId = new Types.ObjectId(query.billId);
    if (query.kind) filter.kind = query.kind;
    if (query.status) filter.status = query.status;
    if (query.releaseStage) filter.releaseStage = query.releaseStage;

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
      items.map((row) => toPublicContractorRetention(row)),
      'Retention records fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  /** Contractor-wise held / released register. */
  async register(query: RetentionRegisterQueryDto) {
    const match: FilterQuery<ContractorRetention> = {
      status: { $in: HELD_STATUSES },
    };
    if (query.projectId) {
      match.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      match.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.agreementId) {
      match.agreementId = new Types.ObjectId(query.agreementId);
    }

    const rows = await this.model
      .aggregate<{
        _id: {
          projectId: Types.ObjectId;
          contractorId: Types.ObjectId;
          agreementId: Types.ObjectId | null;
        };
        ceilingAmount: number;
        totalDeducted: number;
        totalReleased: number;
        deductionCount: number;
        releaseCount: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: {
              projectId: '$projectId',
              contractorId: '$contractorId',
              agreementId: '$agreementId',
            },
            ceilingAmount: { $max: '$ceilingAmount' },
            totalDeducted: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$kind', RetentionKind.Deduction] },
                      { $eq: ['$status', RetentionStatus.Approved] },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
            totalReleased: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$kind', RetentionKind.Release] },
                      { $eq: ['$status', RetentionStatus.Released] },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
            deductionCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$kind', RetentionKind.Deduction] },
                      { $eq: ['$status', RetentionStatus.Approved] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            releaseCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$kind', RetentionKind.Release] },
                      { $eq: ['$status', RetentionStatus.Released] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { '_id.contractorId': 1 } },
      ])
      .exec();

    const data = rows.map((r) => {
      const totalDeducted = roundMoney(r.totalDeducted);
      const totalReleased = roundMoney(r.totalReleased);
      return {
        projectId: String(r._id.projectId),
        contractorId: String(r._id.contractorId),
        agreementId: r._id.agreementId ? String(r._id.agreementId) : null,
        ceilingAmount: roundMoney(r.ceilingAmount),
        totalDeducted,
        totalReleased,
        balanceHeld: roundMoney(Math.max(0, totalDeducted - totalReleased)),
        deductionCount: r.deductionCount,
        releaseCount: r.releaseCount,
      };
    });

    return createSuccessResponse(data, 'Retention register fetched');
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private assertCreateShape(dto: CreateContractorRetentionDto) {
    if (dto.kind === RetentionKind.Deduction) {
      if (!dto.billId) {
        throw new BadRequestException('Deduction requires billId');
      }
      if (dto.releaseStage) {
        throw new BadRequestException(
          'releaseStage is only valid on release records',
        );
      }
    } else {
      if (!dto.releaseStage) {
        throw new BadRequestException('Release requires releaseStage');
      }
      if (
        dto.releaseStage === RetentionReleaseStage.BgReplacement &&
        !dto.bgReference?.trim()
      ) {
        throw new BadRequestException(
          'bg_replacement releases require bgReference',
        );
      }
    }
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('amount must be > 0');
    }
    if (!Number.isFinite(dto.ceilingAmount) || dto.ceilingAmount < 0) {
      throw new BadRequestException('ceilingAmount must be ≥ 0');
    }
  }

  private async assertBillForDeduction(dto: {
    projectId: string;
    contractorId: string;
    agreementId?: string | null;
    billId?: string | null;
    kind: RetentionKind;
    ceilingAmount: number;
    amount: number;
  }) {
    if (!dto.billId || !Types.ObjectId.isValid(dto.billId)) {
      throw new BadRequestException('Invalid billId');
    }
    const bill = await this.billModel.findById(dto.billId).exec();
    if (!bill) throw new NotFoundException('Contractor bill not found');
    if (
      bill.status !== ContractorBillStatus.Posted &&
      bill.status !== ContractorBillStatus.PartiallyPaid &&
      bill.status !== ContractorBillStatus.Paid &&
      bill.status !== ContractorBillStatus.Closed
    ) {
      throw new BadRequestException(
        'Retention deduction requires a posted or paid RA bill',
      );
    }
    if (String(bill.projectId) !== dto.projectId) {
      throw new BadRequestException('billId project mismatch');
    }
    if (String(bill.contractorId) !== dto.contractorId) {
      throw new BadRequestException('billId contractor mismatch');
    }
    if (bill.retention <= 0) {
      throw new BadRequestException('Bill has no retention withheld');
    }
    if (roundMoney(dto.amount) > roundMoney(bill.retention) + 0.001) {
      throw new BadRequestException(
        `Deduction amount cannot exceed bill retention (${bill.retention})`,
      );
    }
  }

  private async balances(scope: {
    projectId: string;
    contractorId: string;
    agreementId?: string | null;
    excludeId?: string | null;
  }) {
    const filter: FilterQuery<ContractorRetention> = {
      projectId: new Types.ObjectId(scope.projectId),
      contractorId: new Types.ObjectId(scope.contractorId),
      status: { $in: HELD_STATUSES },
    };
    if (scope.agreementId) {
      filter.agreementId = new Types.ObjectId(scope.agreementId);
    } else {
      filter.agreementId = null;
    }
    if (scope.excludeId && Types.ObjectId.isValid(scope.excludeId)) {
      filter._id = { $ne: new Types.ObjectId(scope.excludeId) };
    }

    const rows = await this.model.find(filter).lean().exec();
    let deducted = 0;
    let released = 0;
    let ceiling = 0;
    for (const r of rows) {
      ceiling = Math.max(ceiling, r.ceilingAmount ?? 0);
      if (
        r.kind === RetentionKind.Deduction &&
        r.status === RetentionStatus.Approved
      ) {
        deducted += r.amount;
      }
      if (
        r.kind === RetentionKind.Release &&
        r.status === RetentionStatus.Released
      ) {
        released += r.amount;
      }
    }
    return {
      deducted: roundMoney(deducted),
      released: roundMoney(released),
      held: roundMoney(Math.max(0, deducted - released)),
      ceiling: roundMoney(ceiling),
    };
  }

  private async assertCeilingAllows(
    dto: {
      projectId: string;
      contractorId: string;
      agreementId?: string | null;
      ceilingAmount: number;
      amount: number;
      kind: RetentionKind;
    },
    excludeId: string | null,
  ) {
    const bal = await this.balances({
      projectId: dto.projectId,
      contractorId: dto.contractorId,
      agreementId: dto.agreementId ?? null,
      excludeId,
    });
    const ceiling = roundMoney(
      Math.max(dto.ceilingAmount, bal.ceiling),
    );
    const nextHeld = roundMoney(bal.held + dto.amount);
    if (ceiling > 0 && nextHeld > ceiling + 0.001) {
      throw new BadRequestException(
        `Retention ceiling ${ceiling} exceeded (held would be ${nextHeld})`,
      );
    }
  }

  private async assertReleaseAgainstHeld(
    dto: {
      projectId: string;
      contractorId: string;
      agreementId?: string | null;
      ceilingAmount: number;
      amount: number;
      kind: RetentionKind;
      releaseStage?: RetentionReleaseStage | null;
    },
    excludeId: string | null,
  ) {
    const bal = await this.balances({
      projectId: dto.projectId,
      contractorId: dto.contractorId,
      agreementId: dto.agreementId ?? null,
      excludeId,
    });
    // Approved-but-not-yet-released releases also reserve held balance.
    const pendingReleaseFilter: FilterQuery<ContractorRetention> = {
      projectId: new Types.ObjectId(dto.projectId),
      contractorId: new Types.ObjectId(dto.contractorId),
      kind: RetentionKind.Release,
      status: {
        $in: [
          RetentionStatus.Draft,
          RetentionStatus.PendingApproval,
          RetentionStatus.Approved,
        ],
      },
    };
    if (dto.agreementId) {
      pendingReleaseFilter.agreementId = new Types.ObjectId(dto.agreementId);
    } else {
      pendingReleaseFilter.agreementId = null;
    }
    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      pendingReleaseFilter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const pending = await this.model.find(pendingReleaseFilter).lean().exec();
    const reserved = roundMoney(
      pending.reduce((sum, r) => sum + r.amount, 0),
    );
    const available = roundMoney(bal.held - reserved);
    if (roundMoney(dto.amount) > available + 0.001) {
      throw new BadRequestException(
        `Release amount ${dto.amount} exceeds available held retention ${available}`,
      );
    }
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `RET-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid retention id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Retention record not found');
    return row;
  }
}
