import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../../config/configuration';
import { User, UserStatus } from '../../users/schemas/user.schema';
import { NotificationChannel } from '../notifications.constants';
import type {
  ChannelDeliveryInput,
  ChannelDeliveryResult,
  NotificationChannelHandler,
} from './notification-channel.interface';
import {
  hasRenderableContent,
  isDeliverableUserStatus,
  isValidEmailAddress,
  normalizeEmailAddress,
} from './email-recipient.util';
import { EmailSmtpProvider } from './email-smtp.provider';

/**
 * Email channel — SMTP via nodemailer when configured; stub mode for local/dev.
 */
@Injectable()
export class EmailChannel implements NotificationChannelHandler {
  readonly channel = NotificationChannel.Email;
  private readonly logger = new Logger(EmailChannel.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly smtpProvider: EmailSmtpProvider,
  ) {}

  async deliver(input: ChannelDeliveryInput): Promise<ChannelDeliveryResult> {
    if (!hasRenderableContent(input.subject, input.body)) {
      return {
        success: true,
        skipped: true,
        providerMessageId: null,
        errorMessage: 'Email subject/body empty after template render',
        meta: { provider: 'email', reason: 'empty_content' },
      };
    }

    if (!this.smtpProvider.isConfigured()) {
      return this.deliverStub(input);
    }

    const recipient = await this.resolveRecipient(input.userId);
    if (!recipient.ok) {
      return {
        success: true,
        skipped: true,
        providerMessageId: null,
        errorMessage: recipient.reason,
        meta: {
          provider: 'smtp',
          reason: recipient.code,
          toUserId: input.userId,
        },
      };
    }

    try {
      const result = await this.smtpProvider.send({
        to: recipient.email,
        subject: input.subject.trim(),
        text: input.body.trim(),
      });

      return {
        success: true,
        providerMessageId: result.messageId || null,
        meta: {
          provider: 'smtp',
          to: recipient.email,
          toUserId: input.userId,
          accepted: result.accepted,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'SMTP delivery failed';
      this.logger.warn(
        `Email delivery failed user=${input.userId} to=${recipient.email}: ${message}`,
      );
      return {
        success: false,
        errorMessage: message,
        meta: {
          provider: 'smtp',
          to: recipient.email,
          toUserId: input.userId,
        },
      };
    }
  }

  private async deliverStub(
    input: ChannelDeliveryInput,
  ): Promise<ChannelDeliveryResult> {
    const messageId = `email-stub:${Date.now()}:${input.userId}`;
    this.logger.log(
      `Email (stub) → user=${input.userId} subject="${input.subject}"`,
    );
    return {
      success: true,
      providerMessageId: messageId,
      meta: {
        provider: 'stub',
        toUserId: input.userId,
        subject: input.subject,
        bodyPreview: input.body.slice(0, 120),
      },
    };
  }

  private async resolveRecipient(userId: string): Promise<
    | { ok: true; email: string }
    | { ok: false; code: string; reason: string }
  > {
    if (!Types.ObjectId.isValid(userId)) {
      return {
        ok: false,
        code: 'invalid_user_id',
        reason: 'Invalid user id for email delivery',
      };
    }

    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      return {
        ok: false,
        code: 'user_not_found',
        reason: 'User not found for email delivery',
      };
    }

    if (!isDeliverableUserStatus(user.status as UserStatus)) {
      return {
        ok: false,
        code: 'user_inactive',
        reason: `User status ${user.status} suppresses email delivery`,
      };
    }

    if (!isValidEmailAddress(user.email)) {
      return {
        ok: false,
        code: 'missing_email',
        reason: 'User has no valid email address',
      };
    }

    return {
      ok: true,
      email: normalizeEmailAddress(user.email!),
    };
  }
}
