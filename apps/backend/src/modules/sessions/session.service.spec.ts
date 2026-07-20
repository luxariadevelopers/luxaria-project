import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { hashToken } from '../../common/utils/crypto.util';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { SessionService } from './session.service';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';

describe('SessionService refresh rotation', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let refreshModel: Model<RefreshToken>;
  let service: SessionService;
  const userId = new Types.ObjectId();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    refreshModel = connection.model(
      RefreshToken.name,
      RefreshTokenSchema,
    ) as Model<RefreshToken>;
    const resetModel = connection.model(
      PasswordResetToken.name,
      PasswordResetTokenSchema,
    ) as Model<PasswordResetToken>;
    service = new SessionService(refreshModel, resetModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await refreshModel.deleteMany({});
  });

  it('rotates refresh token in the same family and revokes the previous', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    const created = await service.createRefreshSession(userId, expiresAt, {
      ipAddress: '1.1.1.1',
      userAgent: 'test',
    });

    const current = await service.findActiveRefreshSession(created.refreshToken);
    expect(current).toBeTruthy();

    const rotated = await service.rotateRefreshSession(
      current!,
      expiresAt,
      { ipAddress: '1.1.1.1' },
    );

    const old = await refreshModel.findOne({
      tokenHash: hashToken(created.refreshToken),
    });
    const next = await service.findActiveRefreshSession(rotated.refreshToken);

    expect(old?.revokedAt).toBeTruthy();
    expect(old?.replacedByTokenHash).toBe(hashToken(rotated.refreshToken));
    expect(next?.familyId).toBe(created.familyId);
    expect(next?.revokedAt).toBeNull();
  });

  it('revokes an entire family on reuse detection helper', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    const created = await service.createRefreshSession(userId, expiresAt, {});
    const current = await service.findActiveRefreshSession(created.refreshToken);
    const rotated = await service.rotateRefreshSession(
      current!,
      expiresAt,
      {},
    );

    await service.revokeFamily(created.familyId);

    const active = await service.findActiveRefreshSession(rotated.refreshToken);
    expect(active).toBeNull();
  });
});
