import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { generateOpaqueToken, hashToken } from '../../common/utils/crypto.util';
import { PasswordResetToken } from './schemas/password-reset-token.schema';
import { RefreshToken } from './schemas/refresh-token.schema';

export type DeviceContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
};

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
    @InjectModel(PasswordResetToken.name)
    private readonly passwordResetTokenModel: Model<PasswordResetToken>,
  ) {}

  async createRefreshSession(
    userId: Types.ObjectId | string,
    expiresAt: Date,
    device: DeviceContext,
  ) {
    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);
    const familyId = randomUUID();

    await this.refreshTokenModel.create({
      userId,
      tokenHash,
      familyId,
      deviceName: device.deviceName ?? null,
      userAgent: device.userAgent ?? null,
      ipAddress: device.ipAddress ?? null,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      lastUsedAt: new Date(),
    });

    return { refreshToken, tokenHash, familyId };
  }

  async findActiveRefreshSession(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    return this.refreshTokenModel
      .findOne({
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async findRefreshSessionByToken(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    return this.refreshTokenModel.findOne({ tokenHash }).exec();
  }

  /**
   * Rotate refresh token: revoke previous, issue new in same family.
   */
  async rotateRefreshSession(
    current: {
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      familyId: string;
      deviceName?: string | null;
      userAgent?: string | null;
      ipAddress?: string | null;
    },
    expiresAt: Date,
    device: DeviceContext,
  ) {
    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);

    await this.refreshTokenModel.create({
      userId: current.userId,
      tokenHash,
      familyId: current.familyId,
      deviceName: device.deviceName ?? current.deviceName,
      userAgent: device.userAgent ?? current.userAgent,
      ipAddress: device.ipAddress ?? current.ipAddress,
      expiresAt,
      revokedAt: null,
      replacedByTokenHash: null,
      lastUsedAt: new Date(),
    });

    await this.refreshTokenModel
      .findByIdAndUpdate(current._id, {
        revokedAt: new Date(),
        replacedByTokenHash: tokenHash,
        lastUsedAt: new Date(),
      })
      .exec();

    return { refreshToken, tokenHash };
  }

  async revokeRefreshToken(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    return this.refreshTokenModel
      .findOneAndUpdate(
        { tokenHash, revokedAt: null },
        { revokedAt: new Date(), lastUsedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async revokeAllForUser(userId: Types.ObjectId | string) {
    return this.refreshTokenModel
      .updateMany(
        { userId, revokedAt: null },
        { revokedAt: new Date(), lastUsedAt: new Date() },
      )
      .exec();
  }

  /** If a revoked token is reused, revoke the whole family (theft detection). */
  async revokeFamily(familyId: string) {
    return this.refreshTokenModel
      .updateMany({ familyId, revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }

  async touchSession(tokenHash: string) {
    return this.refreshTokenModel
      .findOneAndUpdate({ tokenHash }, { lastUsedAt: new Date() })
      .exec();
  }

  async createPasswordResetToken(
    userId: Types.ObjectId | string,
    expiresAt: Date,
    device: DeviceContext,
  ) {
    const token = generateOpaqueToken(32);
    const tokenHash = hashToken(token);

    await this.passwordResetTokenModel.updateMany(
      { userId, usedAt: null },
      { usedAt: new Date() },
    );

    await this.passwordResetTokenModel.create({
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
      ipAddress: device.ipAddress ?? null,
      userAgent: device.userAgent ?? null,
    });

    return { token, tokenHash };
  }

  async findValidPasswordResetToken(token: string) {
    const tokenHash = hashToken(token);
    return this.passwordResetTokenModel
      .findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async markPasswordResetUsed(id: Types.ObjectId | string) {
    return this.passwordResetTokenModel
      .findByIdAndUpdate(id, { usedAt: new Date() }, { new: true })
      .exec();
  }
}
