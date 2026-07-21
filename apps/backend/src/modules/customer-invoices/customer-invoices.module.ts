import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Account,
  AccountSchema,
} from '../chart-of-accounts/schemas/account.schema';
import { JournalModule } from '../journal/journal.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { CustomerInvoicesController } from './customer-invoices.controller';
import { CustomerInvoicesService } from './customer-invoices.service';
import {
  CustomerInvoice,
  CustomerInvoiceSchema,
} from './schemas/customer-invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerInvoice.name, schema: CustomerInvoiceSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    JournalModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [CustomerInvoicesController],
  providers: [CustomerInvoicesService],
  exports: [CustomerInvoicesService, MongooseModule],
})
export class CustomerInvoicesModule {}
