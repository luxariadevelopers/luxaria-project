import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqItem, BoqItemSchema } from '../boq/schemas/boq.schema';
import { DocumentsModule } from '../documents/documents.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { DprPdfService } from './dpr-pdf.service';
import { DprController } from './dpr.controller';
import { DprScheduler } from './dpr.scheduler';
import { DprService } from './dpr.service';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
} from './schemas/daily-progress-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyProgressReport.name, schema: DailyProgressReportSchema },
      { name: DprMissingAlert.name, schema: DprMissingAlertSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
    ]),
    DocumentsModule,
  ],
  controllers: [DprController],
  providers: [DprService, DprPdfService, DprScheduler],
  exports: [DprService, MongooseModule],
})
export class DailyProgressReportsModule {}
