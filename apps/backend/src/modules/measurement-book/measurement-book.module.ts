import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqItem, BoqItemSchema } from '../boq/schemas/boq.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { MeasurementBookController } from './measurement-book.controller';
import { MeasurementBookService } from './measurement-book.service';
import {
  MeasurementBookEntry,
  MeasurementBookEntrySchema,
} from './schemas/measurement-book-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MeasurementBookEntry.name, schema: MeasurementBookEntrySchema },
      { name: BoqItem.name, schema: BoqItemSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
    SitesModule,
  ],
  controllers: [MeasurementBookController],
  providers: [MeasurementBookService],
  exports: [MeasurementBookService, MongooseModule],
})
export class MeasurementBookModule {}
