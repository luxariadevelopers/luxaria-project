import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { InventoryCostingService } from './inventory-costing.service';
import { CostLayer, CostLayerSchema } from './schemas/cost-layer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CostLayer.name, schema: CostLayerSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  providers: [InventoryCostingService],
  exports: [InventoryCostingService, MongooseModule],
})
export class InventoryCostingModule {}
