import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashAccountsModule } from '../cash-accounts/cash-accounts.module';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { DocumentsModule } from '../documents/documents.module';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import { JournalModule } from '../journal/journal.module';
import { ProjectsModule } from '../projects/projects.module';
import { RbacModule } from '../rbac/rbac.module';
import { SignedPaymentVoucherPdfService } from './signed-payment-voucher-pdf.service';
import { SignedPaymentVouchersController } from './signed-payment-vouchers.controller';
import { SignedPaymentVouchersService } from './signed-payment-vouchers.service';
import {
  SignedPaymentVoucher,
  SignedPaymentVoucherSchema,
} from './schemas/signed-payment-voucher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SignedPaymentVoucher.name, schema: SignedPaymentVoucherSchema },
    ]),
    CashAccountsModule,
    ChartOfAccountsModule,
    DocumentsModule,
    JournalModule,
    FinancialYearModule,
    ProjectsModule,
    RbacModule,
  ],
  controllers: [SignedPaymentVouchersController],
  providers: [SignedPaymentVouchersService, SignedPaymentVoucherPdfService],
  exports: [SignedPaymentVouchersService, MongooseModule],
})
export class SignedPaymentVouchersModule {}
