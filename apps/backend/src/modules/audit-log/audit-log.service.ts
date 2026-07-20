import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  extractAuditRequestContext,
  type AuditRequestContext,
} from './audit-log.context';
import { maskSensitiveData } from './audit-log.mask';
import type { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditAction, AuditLog } from './schemas/audit-log.schema';

export type RecordAuditInput = {
  userId?: string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  deviceId?: string | null;
  timestamp?: Date;
  /** When provided, fills missing IP / UA / requestId / deviceId */
  request?: Request | null;
};

export type PublicAuditLog = {
  id: string;
  userId: string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  deviceId: string | null;
  timestamp: Date;
};

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  /**
   * Insert-only write path for other modules.
   * Sensitive fields in before/after are masked before persistence.
   */
  async record(input: RecordAuditInput): Promise<PublicAuditLog> {
    const ctx: AuditRequestContext = extractAuditRequestContext(input.request);
    const before =
      input.beforeData === undefined || input.beforeData === null
        ? null
        : (maskSensitiveData(this.toPlainObject(input.beforeData)) as Record<
            string,
            unknown
          >);
    const after =
      input.afterData === undefined || input.afterData === null
        ? null
        : (maskSensitiveData(this.toPlainObject(input.afterData)) as Record<
            string,
            unknown
          >);

    const [row] = await this.auditLogModel.create([
      {
        userId: input.userId ? new Types.ObjectId(input.userId) : null,
        action: input.action,
        module: input.module.trim().toLowerCase(),
        entityType: input.entityType.trim().toLowerCase(),
        entityId: input.entityId ? String(input.entityId) : null,
        projectId: input.projectId
          ? new Types.ObjectId(input.projectId)
          : null,
        beforeData: before,
        afterData: after,
        ipAddress: input.ipAddress ?? ctx.ipAddress,
        userAgent: input.userAgent ?? ctx.userAgent,
        requestId: input.requestId ?? ctx.requestId,
        deviceId: input.deviceId ?? ctx.deviceId,
        timestamp: input.timestamp ?? new Date(),
      },
    ]);

    return this.toPublic(row);
  }

  async list(query: QueryAuditLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.buildFilter(query);

    const sortField =
      query.sortBy === 'timestamp' || !query.sortBy
        ? 'timestamp'
        : query.sortBy === 'createdAt'
          ? 'timestamp'
          : 'timestamp';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [rows, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => this.toPublic(r)),
      'Audit logs',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Audit log not found');
    }
    const row = await this.auditLogModel.findById(id).lean().exec();
    if (!row) {
      throw new NotFoundException('Audit log not found');
    }
    return createSuccessResponse(this.toPublic(row), 'Audit log');
  }

  private buildFilter(query: QueryAuditLogDto): FilterQuery<AuditLog> {
    const filter: FilterQuery<AuditLog> = {};

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query.module) {
      filter.module = query.module.trim().toLowerCase();
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.entityType) {
      filter.entityType = query.entityType.trim().toLowerCase();
    }
    if (query.entityId) {
      filter.entityId = String(query.entityId);
    }

    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(query.from);
      }
      if (query.to) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(query.to);
      }
    }

    return filter;
  }

  private toPlainObject(value: unknown): unknown {
    if (value == null) return value;
    if (typeof value === 'object' && typeof (value as any).toObject === 'function') {
      return (value as { toObject: () => unknown }).toObject();
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  private toPublic(row: {
    _id: Types.ObjectId | string;
    userId?: Types.ObjectId | string | null;
    action: AuditAction;
    module: string;
    entityType: string;
    entityId?: string | null;
    projectId?: Types.ObjectId | string | null;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    deviceId?: string | null;
    timestamp: Date;
  }): PublicAuditLog {
    return {
      id: String(row._id),
      userId: row.userId ? String(row.userId) : null,
      action: row.action,
      module: row.module,
      entityType: row.entityType,
      entityId: row.entityId ?? null,
      projectId: row.projectId ? String(row.projectId) : null,
      beforeData: row.beforeData ?? null,
      afterData: row.afterData ?? null,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      requestId: row.requestId ?? null,
      deviceId: row.deviceId ?? null,
      timestamp: row.timestamp,
    };
  }
}
