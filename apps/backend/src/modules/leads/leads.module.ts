import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { NumberingModule } from '../numbering/numbering.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead, LeadSchema } from './schemas/lead.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    NumberingModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService, MongooseModule],
})
export class LeadsModule {}
