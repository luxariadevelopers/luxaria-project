import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractorBillsModule } from '../contractor-bills/contractor-bills.module';
import {
  ContractorRecovery,
  ContractorRecoverySchema,
} from '../contractor-recoveries/schemas/contractor-recovery.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { MaterialReconciliationController } from './material-reconciliation.controller';
import { MaterialReconciliationService } from './material-reconciliation.service';
import {
  ContractorMaterialReconciliation,
  ContractorMaterialReconciliationSchema,
} from './schemas/contractor-material-reconciliation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ContractorMaterialReconciliation.name,
        schema: ContractorMaterialReconciliationSchema,
      },
      { name: ContractorRecovery.name, schema: ContractorRecoverySchema },
    ]),
    forwardRef(() => ContractorBillsModule),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [MaterialReconciliationController],
  providers: [MaterialReconciliationService],
  exports: [MaterialReconciliationService, MongooseModule],
})
export class MaterialReconciliationModule {}
