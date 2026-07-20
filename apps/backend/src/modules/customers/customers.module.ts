import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { RbacModule } from '../rbac/rbac.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import {
  CustomerFile,
  CustomerFileSchema,
} from './schemas/customer-document.schema';
import { Customer, CustomerSchema } from './schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerFile.name, schema: CustomerFileSchema },
    ]),
    CompanyModule,
    RbacModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
