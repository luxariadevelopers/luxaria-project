import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqItem, BoqItemSchema } from '../boq/schemas/boq.schema';
import { DocumentsModule } from '../documents/documents.module';
import { MaterialIssuesModule } from '../material-issues/material-issues.module';
import {
  MaterialIssue,
  MaterialIssueSchema,
} from '../material-issues/schemas/material-issue.schema';
import {
  Material,
  MaterialSchema,
} from '../material-master/schemas/material.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { SitesModule } from '../sites/sites.module';
import { Site, SiteSchema } from '../sites/schemas/site.schema';
import { StockReservationsModule } from '../stock-reservations/stock-reservations.module';
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
      { name: Site.name, schema: SiteSchema },
      { name: MaterialIssue.name, schema: MaterialIssueSchema },
      { name: Material.name, schema: MaterialSchema },
    ]),
    DocumentsModule,
    SitesModule,
    forwardRef(() => MaterialIssuesModule),
    StockReservationsModule,
  ],
  controllers: [DprController],
  providers: [DprService, DprPdfService, DprScheduler],
  exports: [DprService, MongooseModule],
})
export class DailyProgressReportsModule {}
