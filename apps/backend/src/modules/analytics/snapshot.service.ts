import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { Company } from '../company/schemas/company.schema';
import type {
  CreateSnapshotDto,
  ListSnapshotsQueryDto,
} from './dto/analytics-query.dto';
import {
  AnalyticsKpiSnapshot,
  AnalyticsSnapshotKind,
} from './schemas/analytics-kpi-snapshot.schema';

@Injectable()
export class AnalyticsSnapshotService {
  constructor(
    @InjectModel(AnalyticsKpiSnapshot.name)
    private readonly snapshotModel: Model<AnalyticsKpiSnapshot>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
  ) {}

  async create(
    dto: CreateSnapshotDto,
    actorId: string,
    payload: Record<string, unknown>,
  ) {
    const company = await this.requirePrimaryCompany();
    const asOfDate = this.startOfUtcDay(new Date(dto.asOfDate));
    const versionLabel =
      dto.versionLabel?.trim() ||
      `${dto.kind}-${asOfDate.toISOString().slice(0, 10)}`;

    try {
      const created = await this.snapshotModel.create({
        companyId: company._id,
        kind: dto.kind,
        projectId: dto.projectId
          ? new Types.ObjectId(dto.projectId)
          : undefined,
        asOfDate,
        versionLabel,
        payload,
        createdByUserId: new Types.ObjectId(actorId),
        immutable: true,
      });
      return createSuccessResponse(
        this.toPublic(created),
        'Analytics snapshot created (immutable)',
      );
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err && 'code' in err
          ? (err as { code?: number }).code
          : undefined;
      if (code === 11000) {
        throw new BadRequestException(
          'Snapshot already exists for this kind/date/project/version',
        );
      }
      throw err;
    }
  }

  async list(query: ListSnapshotsQueryDto) {
    const company = await this.requirePrimaryCompany();
    const filter: Record<string, unknown> = { companyId: company._id };
    if (query.kind) filter.kind = query.kind;
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    const limit = query.limit ?? 50;
    const rows = await this.snapshotModel
      .find(filter)
      .sort({ asOfDate: -1, createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((row) => this.toPublic(row)),
      'Analytics snapshots',
    );
  }

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Snapshot not found');
    }
    const row = await this.snapshotModel.findById(id).lean().exec();
    if (!row) {
      throw new NotFoundException('Snapshot not found');
    }
    return createSuccessResponse(this.toPublic(row), 'Analytics snapshot');
  }

  /**
   * Snapshots are immutable — any update/delete attempt fails.
   */
  async assertImmutable(id: string): Promise<void> {
    const row = await this.snapshotModel.findById(id).lean().exec();
    if (!row) {
      throw new NotFoundException('Snapshot not found');
    }
    if (row.immutable !== false) {
      throw new BadRequestException(
        'Analytics snapshots are immutable and cannot be modified',
      );
    }
  }

  async tryUpdateBlocked(id: string): Promise<never> {
    await this.assertImmutable(id);
    throw new BadRequestException(
      'Analytics snapshots are immutable and cannot be modified',
    );
  }

  private async requirePrimaryCompany() {
    const company = await this.companyModel.findOne({ isPrimary: true }).exec();
    if (!company) {
      throw new NotFoundException('Primary company not found');
    }
    return company;
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private toPublic(row: {
    _id: Types.ObjectId;
    companyId: Types.ObjectId;
    kind: AnalyticsSnapshotKind;
    projectId?: Types.ObjectId;
    asOfDate: Date;
    versionLabel: string;
    payload: Record<string, unknown>;
    createdByUserId: Types.ObjectId;
    immutable?: boolean;
    createdAt?: Date;
  }) {
    return {
      id: String(row._id),
      companyId: String(row.companyId),
      kind: row.kind,
      projectId: row.projectId ? String(row.projectId) : null,
      asOfDate: row.asOfDate.toISOString(),
      versionLabel: row.versionLabel,
      payload: row.payload,
      createdByUserId: String(row.createdByUserId),
      immutable: row.immutable !== false,
      createdAt: row.createdAt?.toISOString() ?? null,
    };
  }
}
