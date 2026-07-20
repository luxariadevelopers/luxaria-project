import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashAccountsModule } from '../cash-accounts/cash-accounts.module';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import { JournalModule } from '../journal/journal.module';
import { ProjectsModule } from '../projects/projects.module';
import { RbacModule } from '../rbac/rbac.module';
import { SiteExpenseVouchersController } from './site-expense-vouchers.controller';
import { SiteExpenseVouchersService } from './site-expense-vouchers.service';
import {
  SiteExpenseVoucher,
  SiteExpenseVoucherSchema,
} from './schemas/site-expense-voucher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteExpenseVoucher.name, schema: SiteExpenseVoucherSchema },
    ]),
    CashAccountsModule,
    ExpenseCategoriesModule,
    ChartOfAccountsModule,
    JournalModule,
    FinancialYearModule,
    ProjectsModule,
    RbacModule,
  ],
  controllers: [SiteExpenseVouchersController],
  providers: [SiteExpenseVouchersService],
  exports: [SiteExpenseVouchersService, MongooseModule],
})
export class SiteExpenseVouchersModule {}
