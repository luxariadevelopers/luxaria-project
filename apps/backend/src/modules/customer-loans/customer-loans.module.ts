import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { CustomerLoansController } from './customer-loans.controller';
import { CustomerLoansService } from './customer-loans.service';
import {
  CustomerLoan,
  CustomerLoanSchema,
} from './schemas/customer-loan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerLoan.name, schema: CustomerLoanSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [CustomerLoansController],
  providers: [CustomerLoansService],
  exports: [CustomerLoansService, MongooseModule],
})
export class CustomerLoansModule {}
