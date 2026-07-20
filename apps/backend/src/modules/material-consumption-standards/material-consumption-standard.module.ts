import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqItem, BoqItemSchema } from '../boq/schemas/boq.schema';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { MaterialConsumptionStandardController } from './material-consumption-standard.controller';
import { MaterialConsumptionStandardService } from './material-consumption-standard.service';
import {
  MaterialConsumptionStandard,
  MaterialConsumptionStandardSchema,
} from './schemas/material-consumption-standard.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MaterialConsumptionStandard.name,
        schema: MaterialConsumptionStandardSchema,
      },
      { name: Material.name, schema: MaterialSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
    ]),
  ],
  controllers: [MaterialConsumptionStandardController],
  providers: [MaterialConsumptionStandardService],
  exports: [MaterialConsumptionStandardService, MongooseModule],
})
export class MaterialConsumptionStandardsModule {}
