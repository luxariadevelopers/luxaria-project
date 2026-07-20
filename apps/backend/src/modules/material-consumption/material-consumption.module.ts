import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BoqItem,
  BoqItemSchema,
  BoqVersion,
  BoqVersionSchema,
} from '../boq/schemas/boq.schema';
import {
  MaterialConsumptionStandard,
  MaterialConsumptionStandardSchema,
} from '../material-consumption-standards/schemas/material-consumption-standard.schema';
import {
  MaterialIssue,
  MaterialIssueSchema,
} from '../material-issues/schemas/material-issue.schema';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { RbacModule } from '../rbac/rbac.module';
import {
  StockCount,
  StockCountSchema,
} from '../stock-counts/schemas/stock-count.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { MaterialConsumptionController } from './material-consumption.controller';
import { MaterialConsumptionService } from './material-consumption.service';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportSchema,
} from './schemas/material-consumption-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MaterialConsumptionReport.name,
        schema: MaterialConsumptionReportSchema,
      },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: MaterialIssue.name, schema: MaterialIssueSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: Material.name, schema: MaterialSchema },
      {
        name: MaterialConsumptionStandard.name,
        schema: MaterialConsumptionStandardSchema,
      },
      { name: StockCount.name, schema: StockCountSchema },
    ]),
    RbacModule,
  ],
  controllers: [MaterialConsumptionController],
  providers: [MaterialConsumptionService],
  exports: [MaterialConsumptionService, MongooseModule],
})
export class MaterialConsumptionModule {}
