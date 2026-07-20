import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { PushChannel } from './channels/push.channel';
import { PushAdapter } from './push.adapter';
import { PushTokenService } from './push-token.service';
import {
  PushDevicePlatform,
  PushDeviceToken,
  PushDeviceTokenSchema,
} from './schemas/push-device-token.schema';

describe('PushChannel', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let pushTokenService: PushTokenService;
  let pushChannel: PushChannel;
  let pushAdapter: PushAdapter;
  let tokenModel: Model<PushDeviceToken>;
  let userId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    tokenModel = connection.model(
      PushDeviceToken.name,
      PushDeviceTokenSchema,
    ) as Model<PushDeviceToken>;
    pushTokenService = new PushTokenService(tokenModel);
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    userId = new Types.ObjectId().toHexString();
    await tokenModel.deleteMany({});
  });

  function createChannel(pushEnabled: boolean) {
    const configService = {
      get: (key: string) => {
        if (key === 'pushEnabled') return pushEnabled;
        if (key === 'expoAccessToken') return '';
        return undefined;
      },
    } as unknown as ConfigService<AppConfig, true>;
    pushAdapter = new PushAdapter(configService);
    pushAdapter.send = jest.fn(async () => ({
      sent: 1,
      ticketIds: ['ticket-1'],
      invalidTokens: ['ExponentPushToken[bad]'],
      errors: [],
    }));
    pushChannel = new PushChannel(pushTokenService, pushAdapter);
  }

  it('uses stub delivery when push adapter is disabled', async () => {
    createChannel(false);
    const result = await pushChannel.deliver({
      userId,
      eventType: 'low_stock',
      subject: 'Low stock',
      body: 'Cement is low',
      data: {},
    });
    expect(result.success).toBe(true);
    expect(result.meta?.provider).toBe('stub');
  });

  it('skips when push is enabled but user has no tokens', async () => {
    createChannel(true);
    const result = await pushChannel.deliver({
      userId,
      eventType: 'low_stock',
      subject: 'Low stock',
      body: 'Cement is low',
      data: {},
    });
    expect(result.skipped).toBe(true);
    expect(result.errorMessage).toContain('No push tokens');
  });

  it('sends via adapter and invalidates bad tokens', async () => {
    createChannel(true);
    await pushTokenService.register(userId, {
      token: 'ExponentPushToken[good]',
      platform: PushDevicePlatform.Ios,
      deviceName: 'iPhone',
    });
    await pushTokenService.register(userId, {
      token: 'ExponentPushToken[bad]',
      platform: PushDevicePlatform.Ios,
      deviceName: 'Old phone',
    });

    const result = await pushChannel.deliver({
      userId,
      eventType: 'payment_due',
      subject: 'Payment due',
      body: 'Invoice due tomorrow',
      data: { amount: 1000 },
      notificationId: new Types.ObjectId().toHexString(),
    });

    expect(result.success).toBe(true);
    expect(pushAdapter.send).toHaveBeenCalled();
    expect(result.meta?.provider).toBe('expo');

    const bad = await tokenModel
      .findOne({ token: 'ExponentPushToken[bad]' })
      .lean()
      .exec();
    expect(bad?.invalidatedAt).toBeTruthy();
  });
});

describe('PushTokenService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: PushTokenService;
  let tokenModel: Model<PushDeviceToken>;
  let userId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    tokenModel = connection.model(
      PushDeviceToken.name,
      PushDeviceTokenSchema,
    ) as Model<PushDeviceToken>;
    service = new PushTokenService(tokenModel);
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    userId = new Types.ObjectId().toHexString();
    await tokenModel.deleteMany({});
  });

  it('registers, lists, and unregisters tokens for the owner', async () => {
    await service.register(userId, {
      token: 'ExponentPushToken[abc]',
      platform: PushDevicePlatform.Android,
      deviceName: 'Pixel',
    });

    const mine = await service.listMine(userId);
    expect(mine.data).toHaveLength(1);
    expect(mine.data![0].token).toBe('ExponentPushToken[abc]');

    await service.unregister(userId, { token: 'ExponentPushToken[abc]' });
    const after = await service.listMine(userId);
    expect(after.data).toHaveLength(0);
  });

  it('reassigns token when another user registers the same device token', async () => {
    const otherUser = new Types.ObjectId().toHexString();
    await service.register(userId, {
      token: 'ExponentPushToken[shared]',
      platform: PushDevicePlatform.Ios,
    });
    await service.register(otherUser, {
      token: 'ExponentPushToken[shared]',
      platform: PushDevicePlatform.Ios,
    });

    const row = await tokenModel
      .findOne({ token: 'ExponentPushToken[shared]' })
      .lean()
      .exec();
    expect(String(row?.userId)).toBe(otherUser);
  });

  it('invalidates tokens in bulk', async () => {
    await service.register(userId, {
      token: 'ExponentPushToken[one]',
      platform: PushDevicePlatform.Android,
    });
    await service.register(userId, {
      token: 'ExponentPushToken[two]',
      platform: PushDevicePlatform.Android,
    });

    const count = await service.invalidateTokens([
      'ExponentPushToken[one]',
      'ExponentPushToken[two]',
    ]);
    expect(count).toBe(2);
  });
});
