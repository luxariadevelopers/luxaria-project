import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { AppConfig } from '../../../config/configuration';

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

export interface EmailTransport {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

@Injectable()
export class EmailSmtpProvider implements EmailTransport {
  private readonly logger = new Logger(EmailSmtpProvider.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  isConfigured(): boolean {
    const host = this.configService.get('smtpHost', { infer: true });
    const from = this.configService.get('emailFrom', { infer: true });
    return Boolean(host && from);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      throw new Error('SMTP email provider is not configured');
    }

    const from = this.configService.get('emailFrom', { infer: true });
    if (!from) {
      throw new Error('SMTP email provider is not configured');
    }
    const transport = this.getTransporter();
    const info = (await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? undefined,
    })) as {
      messageId?: string;
      accepted?: Array<string | { address?: string }>;
      rejected?: Array<string | { address?: string }>;
    };

    const messageId = String(info.messageId ?? '');
    const accepted = (info.accepted ?? []).map(String);
    const rejected = (info.rejected ?? []).map(String);

    if (rejected.length > 0) {
      throw new Error(`SMTP rejected recipient(s): ${rejected.join(', ')}`);
    }

    this.logger.debug(
      `Email sent messageId=${messageId} to=${input.to} accepted=${accepted.length}`,
    );

    return { messageId, accepted, rejected };
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get('smtpHost', { infer: true });
    const port = this.configService.get('smtpPort', { infer: true });
    const secure = this.configService.get('smtpSecure', { infer: true });
    const user = this.configService.get('smtpUser', { infer: true });
    const pass = this.configService.get('smtpPass', { infer: true });

    this.transporter = nodemailer.createTransport({
      host: host ?? undefined,
      port: Number(port),
      secure: Boolean(secure),
      auth: user ? { user, pass: pass ?? undefined } : undefined,
    } as Parameters<typeof nodemailer.createTransport>[0]);

    return this.transporter;
  }
}
