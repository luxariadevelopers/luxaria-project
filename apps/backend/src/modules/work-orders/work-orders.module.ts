import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import {
  WorkOrderAmendment,
  WorkOrderAmendmentSchema,
} from './schemas/work-order-amendment.schema';
import { WorkOrder, WorkOrderSchema } from './schemas/work-order.schema';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkOrder.name, schema: WorkOrderSchema },
      { name: WorkOrderAmendment.name, schema: WorkOrderAmendmentSchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    RbacModule,
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService, MongooseModule],
})
export class WorkOrdersModule {}
