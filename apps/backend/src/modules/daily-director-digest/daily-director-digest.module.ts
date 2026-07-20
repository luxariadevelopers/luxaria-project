import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import type { AppConfig } from '../../config/configuration';
import {
  ApprovalRequest,
  ApprovalRequestSchema,
} from '../approvals/schemas/approval-request.schema';
import {
  CashAccount,
  CashAccountSchema,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  ContributionReceipt,
  ContributionReceiptSchema,
} from '../contribution-receipts/schemas/contribution-receipt.schema';
import {
  ContractorPayment,
  ContractorPaymentSchema,
} from '../contractor-payments/schemas/contractor-payment.schema';
import {
  CustomerReceipt,
  CustomerReceiptSchema,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  Director,
  DirectorSchema,
} from '../directors/schemas/director.schema';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  LabourAttendance,
  LabourAttendanceSchema,
} from '../labour-attendance/schemas/labour-attendance.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import {
  SiteExpenseVoucher,
  SiteExpenseVoucherSchema,
} from '../site-expense-vouchers/schemas/site-expense-voucher.schema';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
} from '../stock-reorder/schemas/stock-reorder-alert.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentSchema,
} from '../vendor-payments/schemas/vendor-payment.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { DIRECTOR_DIGEST_QUEUE } from './daily-director-digest.constants';
import { DailyDirectorDigestController } from './daily-director-digest.controller';
import { DailyDirectorDigestProcessor } from './daily-director-digest.processor';
import { DailyDirectorDigestScheduler } from './daily-director-digest.scheduler';
import { DailyDirectorDigestService } from './daily-director-digest.service';
import {
  DailyDirectorDigest,
  DailyDirectorDigestSchema,
} from './schemas/daily-director-digest.schema';

const redisEnabled =
  String(process.env.REDIS_ENABLED ?? 'false').toLowerCase() === 'true';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: DailyDirectorDigest.name, schema: DailyDirectorDigestSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Director.name, schema: DirectorSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      { name: SiteExpenseVoucher.name, schema: SiteExpenseVoucherSchema },
      { name: ContributionReceipt.name, schema: ContributionReceiptSchema },
      { name: VendorPayment.name, schema: VendorPaymentSchema },
      { name: ContractorPayment.name, schema: ContractorPaymentSchema },
      { name: CompanyBankAccount.name, schema: CompanyBankAccountSchema },
      { name: CashAccount.name, schema: CashAccountSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: LabourAttendance.name, schema: LabourAttendanceSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: StockReorderAlert.name, schema: StockReorderAlertSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: CustomerReceipt.name, schema: CustomerReceiptSchema },
      { name: ApprovalRequest.name, schema: ApprovalRequestSchema },
    ]),
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService<AppConfig, true>) => {
              const password = config.get('redisPassword', { infer: true });
              return {
                connection: {
                  host: config.get('redisHost', { infer: true }),
                  port: config.get('redisPort', { infer: true }),
                  ...(password ? { password } : {}),
                  maxRetriesPerRequest: null,
                },
              };
            },
          }),
          BullModule.registerQueue({ name: DIRECTOR_DIGEST_QUEUE }),
        ]
      : []),
  ],
  controllers: [DailyDirectorDigestController],
  providers: [
    DailyDirectorDigestService,
    DailyDirectorDigestScheduler,
    ...(redisEnabled ? [DailyDirectorDigestProcessor] : []),
  ],
  exports: [DailyDirectorDigestService, DailyDirectorDigestScheduler],
})
export class DailyDirectorDigestModule {}
