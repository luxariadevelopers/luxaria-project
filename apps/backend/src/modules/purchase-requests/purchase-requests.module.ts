import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaterialMasterModule } from '../material-master/material-master.module';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import { Material, MaterialSchema } from '../material-master/schemas/material.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from './schemas/purchase-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: Material.name, schema: MaterialSchema },
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      { name: Project.name, schema: ProjectSchema },
    ]),
    MaterialMasterModule,
    RbacModule,
  ],
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  exports: [PurchaseRequestsService, MongooseModule],
})
export class PurchaseRequestsModule {}
