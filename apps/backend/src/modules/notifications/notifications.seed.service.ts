import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  ALL_NOTIFICATION_EVENTS,
  NotificationChannel,
  NotificationEventType,
} from './notifications.constants';
import { NotificationTemplate } from './schemas/notification-template.schema';

type SeedTemplate = {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
};

@Injectable()
export class NotificationsSeedService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsSeedService.name);

  constructor(
    @InjectModel(NotificationTemplate.name)
    private readonly templateModel: Model<NotificationTemplate>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultTemplates();
    } catch (error) {
      this.logger.warn(
        `Notification template seed skipped: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async seedDefaultTemplates() {
    const seeds = this.buildSeeds();
    let upserted = 0;
    for (const seed of seeds) {
      const result = await this.templateModel.updateOne(
        { eventType: seed.eventType, channel: seed.channel },
        {
          $setOnInsert: {
            ...seed,
            isActive: true,
            description: 'System default template',
          },
        },
        { upsert: true },
      );
      if (result.upsertedCount) {
        upserted += 1;
      }
    }
    this.logger.log(
      `Notification templates ready (${upserted} inserted, ${seeds.length} total defaults)`,
    );
    return { upserted, total: seeds.length };
  }

  private buildSeeds(): SeedTemplate[] {
    const defs: Array<{
      eventType: NotificationEventType;
      subject: string;
      body: string;
      variables: string[];
    }> = [
      {
        eventType: NotificationEventType.ApprovalPending,
        subject: 'Approval pending: {{entityLabel}}',
        body: 'An approval request for {{entityLabel}} is pending your action. Project: {{projectName}}.',
        variables: ['entityLabel', 'projectName'],
      },
      {
        eventType: NotificationEventType.ApprovalRejected,
        subject: 'Approval rejected: {{entityLabel}}',
        body: 'Your approval request for {{entityLabel}} was rejected. Reason: {{reason}}',
        variables: ['entityLabel', 'reason'],
      },
      {
        eventType: NotificationEventType.PaymentDue,
        subject: 'Payment due {{dueDate}}',
        body: 'A payment of {{amount}} is due on {{dueDate}} for {{projectName}}.',
        variables: ['amount', 'dueDate', 'projectName'],
      },
      {
        eventType: NotificationEventType.PaymentOverdue,
        subject: 'Payment overdue',
        body: 'Payment of {{amount}} for {{projectName}} is overdue since {{dueDate}}.',
        variables: ['amount', 'dueDate', 'projectName'],
      },
      {
        eventType: NotificationEventType.LowStock,
        subject: 'Low stock: {{materialName}}',
        body: '{{materialName}} is below reorder level on {{projectName}}. Available: {{availableStock}}.',
        variables: ['materialName', 'projectName', 'availableStock'],
      },
      {
        eventType: NotificationEventType.StockOutForecast,
        subject: 'Stock-out forecast: {{materialName}}',
        body: '{{materialName}} on {{projectName}} is forecast to stock out by {{estimatedStockOutDate}}.',
        variables: ['materialName', 'projectName', 'estimatedStockOutDate'],
      },
      {
        eventType: NotificationEventType.MaterialVariance,
        subject: 'Material variance: {{materialName}}',
        body: 'Material variance detected for {{materialName}} on {{projectName}}. Variance: {{variancePercent}}%.',
        variables: ['materialName', 'projectName', 'variancePercent'],
      },
      {
        eventType: NotificationEventType.LabourShortfall,
        subject: 'Labour shortfall on {{projectName}}',
        body: 'Labour shortfall alert: {{message}}',
        variables: ['projectName', 'message'],
      },
      {
        eventType: NotificationEventType.ContractorAgreementExpiry,
        subject: 'Contractor agreement expiring',
        body: 'Agreement {{agreementNumber}} on {{projectName}} expires on {{expiryDate}}.',
        variables: ['agreementNumber', 'projectName', 'expiryDate'],
      },
      {
        eventType: NotificationEventType.MissingDpr,
        subject: 'Missing DPR: {{projectName}}',
        body: 'Daily progress report is missing for {{projectName}} on {{reportDate}}.',
        variables: ['projectName', 'reportDate'],
      },
      {
        eventType: NotificationEventType.PettyCashSettlementDelay,
        subject: 'Petty-cash settlement delayed',
        body: 'Funded petty cash on {{projectName}} remains unsettled ({{amount}}).',
        variables: ['projectName', 'amount'],
      },
      {
        eventType: NotificationEventType.CustomerPaymentOverdue,
        subject: 'Customer payment overdue',
        body: 'Customer schedule installment of {{amount}} for {{projectName}} is overdue (due {{dueDate}}).',
        variables: ['amount', 'projectName', 'dueDate'],
      },
      {
        eventType: NotificationEventType.InvestorContributionOverdue,
        subject: 'Investor contribution overdue',
        body: 'Contribution of {{amount}} for {{projectName}} is overdue (due {{dueDate}}).',
        variables: ['amount', 'projectName', 'dueDate'],
      },
      {
        eventType: NotificationEventType.BudgetOverrun,
        subject: 'Budget overrun: {{projectName}}',
        body: 'Project {{projectName}} funds utilised ({{fundsUtilised}}) exceed budget threshold ({{budgetAmount}}).',
        variables: ['projectName', 'fundsUtilised', 'budgetAmount'],
      },
      {
        eventType: NotificationEventType.DirectorDailyDigest,
        subject: 'Daily director digest — {{digestDate}}',
        body: '{{summaryText}}',
        variables: ['digestDate', 'summaryText', 'directorName'],
      },
    ];

    const channels = [
      NotificationChannel.InApp,
      NotificationChannel.Push,
      NotificationChannel.Email,
      NotificationChannel.WhatsApp,
    ];

    const seeds: SeedTemplate[] = [];
    for (const def of defs) {
      for (const channel of channels) {
        seeds.push({
          eventType: def.eventType,
          channel,
          subject: def.subject,
          body: def.body,
          variables: def.variables,
        });
      }
    }

    // Sanity: every event covered
    for (const eventType of ALL_NOTIFICATION_EVENTS) {
      if (!seeds.some((s) => s.eventType === eventType)) {
        throw new Error(`Missing seed template for ${eventType}`);
      }
    }

    return seeds;
  }
}
