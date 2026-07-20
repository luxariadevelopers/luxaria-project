import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type {
  ListPushTokensQueryDto,
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
} from './dto/notification.dto';
import {
  PushDevicePlatform,
  PushDeviceToken,
} from './schemas/push-device-token.schema';

@Injectable()
export class PushTokenService {
  constructor(
    @InjectModel(PushDeviceToken.name)
    private readonly tokenModel: Model<PushDeviceToken>,
  ) {}

  async register(userId: string, dto: RegisterPushTokenDto) {
    const token = dto.token.trim();
    const now = new Date();

    const row = await this.tokenModel
      .findOneAndUpdate(
        { token },
        {
          $set: {
            userId: new Types.ObjectId(userId),
            platform: dto.platform,
            deviceName: dto.deviceName?.trim() || null,
            invalidatedAt: null,
            lastUsedAt: now,
          },
          $setOnInsert: { token },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    return createSuccessResponse(
      this.toPublic(row!),
      'Push token registered',
    );
  }

  async unregister(userId: string, dto: UnregisterPushTokenDto) {
    const token = dto.token.trim();
    const row = await this.tokenModel.findOne({ token }).exec();
    if (!row) {
      return createSuccessResponse({ removed: false }, 'Push token not found');
    }
    if (String(row.userId) !== userId) {
      throw new ForbiddenException('Cannot unregister another user token');
    }

    row.invalidatedAt = new Date();
    await row.save();

    return createSuccessResponse({ removed: true }, 'Push token unregistered');
  }

  async listMine(userId: string) {
    const rows = await this.tokenModel
      .find({
        userId: new Types.ObjectId(userId),
        invalidatedAt: null,
      })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    return createSuccessResponse(
      rows.map((row) => this.toPublic(row)),
      'Push tokens',
    );
  }

  async listAdmin(query: ListPushTokensQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<PushDeviceToken> = {
      invalidatedAt: null,
    };
    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    const [rows, total] = await Promise.all([
      this.tokenModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.tokenModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((row) => this.toPublic(row)),
      'Push tokens',
      buildPaginationMeta(page, limit, total),
    );
  }

  async revokeById(tokenId: string) {
    const row = await this.tokenModel.findById(tokenId).exec();
    if (!row) {
      throw new NotFoundException('Push token not found');
    }
    row.invalidatedAt = new Date();
    await row.save();
    return createSuccessResponse(
      { id: tokenId, revoked: true },
      'Push token revoked',
    );
  }

  async findActiveTokensForUser(userId: string): Promise<PushDeviceToken[]> {
    return this.tokenModel
      .find({
        userId: new Types.ObjectId(userId),
        invalidatedAt: null,
      })
      .lean()
      .exec();
  }

  async invalidateTokens(tokens: string[]): Promise<number> {
    if (!tokens.length) {
      return 0;
    }
    const result = await this.tokenModel
      .updateMany(
        { token: { $in: tokens }, invalidatedAt: null },
        { $set: { invalidatedAt: new Date() } },
      )
      .exec();
    return result.modifiedCount;
  }

  private toPublic(row: {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    token: string;
    platform: PushDevicePlatform;
    deviceName?: string | null;
    invalidatedAt?: Date | null;
    lastUsedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      id: String(row._id),
      userId: String(row.userId),
      token: row.token,
      platform: row.platform,
      deviceName: row.deviceName ?? null,
      invalidatedAt: row.invalidatedAt
        ? new Date(row.invalidatedAt).toISOString()
        : null,
      lastUsedAt: row.lastUsedAt
        ? new Date(row.lastUsedAt).toISOString()
        : null,
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
      updatedAt: row.updatedAt
        ? new Date(row.updatedAt).toISOString()
        : null,
    };
  }
}
