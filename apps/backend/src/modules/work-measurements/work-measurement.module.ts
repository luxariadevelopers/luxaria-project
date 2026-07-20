import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BoqItem,
  BoqItemSchema,
  BoqVersion,
  BoqVersionSchema,
} from '../boq/schemas/boq.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { WorkMeasurementController } from './work-measurement.controller';
import { WorkMeasurementService } from './work-measurement.service';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from './schemas/work-measurement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
    ]),
  ],
  controllers: [WorkMeasurementController],
  providers: [WorkMeasurementService],
  exports: [WorkMeasurementService, MongooseModule],
})
export class WorkMeasurementsModule {}
