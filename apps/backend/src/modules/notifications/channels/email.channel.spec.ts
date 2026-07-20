import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../../config/configuration';
import { User, UserStatus } from '../../users/schemas/user.schema';
import { NotificationEventType } from '../notifications.constants';
import { EmailChannel } from './email.channel';
import { EmailSmtpProvider } from './email-smtp.provider';

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let smtpProvider: { isConfigured: jest.Mock; send: jest.Mock };
  let userModel: { findById: jest.Mock };

  const baseInput = {
    userId: new Types.ObjectId().toHexString(),
    eventType: NotificationEventType.LowStock,
    subject: 'Low stock alert',
    body: 'Cement is below threshold.',
    data: {},
  };

  beforeEach(async () => {
    smtpProvider = {
      isConfigured: jest.fn().mockReturnValue(false),
      send: jest.fn(),
    };

    userModel = {
      findById: jest.fn().mockReturnValue({
        lean: () => ({
          exec: async () => ({
            email: 'engineer@luxaria.dev',
            status: UserStatus.Active,
          }),
        }),
      }),
    };

    const configService = {
      get: jest.fn(),
    } as unknown as ConfigService<AppConfig, true>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailChannel,
        { provide: ConfigService, useValue: configService },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: EmailSmtpProvider, useValue: smtpProvider },
      ],
    }).compile();

    channel = moduleRef.get(EmailChannel);
  });

  it('uses stub mode when SMTP is not configured', async () => {
    const result = await channel.deliver(baseInput);

    expect(result.success).toBe(true);
    expect(result.meta?.provider).toBe('stub');
    expect(result.providerMessageId).toMatch(/^email-stub:/);
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('skips when rendered content is empty', async () => {
    const result = await channel.deliver({
      ...baseInput,
      subject: '   ',
      body: 'content',
    });

    expect(result.skipped).toBe(true);
    expect(result.meta?.reason).toBe('empty_content');
  });

  it('sends via SMTP when configured and user has email', async () => {
    smtpProvider.isConfigured.mockReturnValue(true);
    smtpProvider.send.mockResolvedValue({
      messageId: '<smtp-123>',
      accepted: ['engineer@luxaria.dev'],
      rejected: [],
    });

    const result = await channel.deliver(baseInput);

    expect(smtpProvider.send).toHaveBeenCalledWith({
      to: 'engineer@luxaria.dev',
      subject: 'Low stock alert',
      text: 'Cement is below threshold.',
    });
    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe('<smtp-123>');
    expect(result.meta?.provider).toBe('smtp');
  });

  it('skips SMTP delivery when user has no email', async () => {
    smtpProvider.isConfigured.mockReturnValue(true);
    userModel.findById.mockReturnValue({
      lean: () => ({
        exec: async () => ({
          email: null,
          status: UserStatus.Active,
        }),
      }),
    });

    const result = await channel.deliver(baseInput);

    expect(result.skipped).toBe(true);
    expect(result.meta?.reason).toBe('missing_email');
    expect(smtpProvider.send).not.toHaveBeenCalled();
  });

  it('returns failure when SMTP send throws', async () => {
    smtpProvider.isConfigured.mockReturnValue(true);
    smtpProvider.send.mockRejectedValue(new Error('Connection refused'));

    const result = await channel.deliver(baseInput);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Connection refused');
  });
});
