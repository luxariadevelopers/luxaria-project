import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { CustomerWarrantiesController } from './customer-warranties.controller';
import { CustomerWarrantiesService } from './customer-warranties.service';
import {
  CustomerWarranty,
  CustomerWarrantySchema,
} from './schemas/customer-warranty.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerWarranty.name, schema: CustomerWarrantySchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [CustomerWarrantiesController],
  providers: [CustomerWarrantiesService],
  exports: [CustomerWarrantiesService, MongooseModule],
})
export class CustomerWarrantiesModule {}
