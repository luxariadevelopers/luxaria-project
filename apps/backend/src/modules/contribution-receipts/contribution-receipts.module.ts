import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialYearModule } from '../financial-year/financial-year.module';
import { ProjectCommitmentsModule } from '../project-commitments/project-commitments.module';
import { ProjectParticipantsModule } from '../project-participants/project-participants.module';
import { ProjectsModule } from '../projects/projects.module';
import { ContributionReceiptPdfService } from './contribution-receipt-pdf.service';
import { ContributionReceiptsController } from './contribution-receipts.controller';
import { ContributionReceiptsService } from './contribution-receipts.service';
import {
  ParticipantContributionBalance,
  ParticipantContributionBalanceSchema,
  ProjectContributionBalance,
  ProjectContributionBalanceSchema,
} from './schemas/contribution-balance.schema';
import {
  ContributionReceipt,
  ContributionReceiptSchema,
} from './schemas/contribution-receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContributionReceipt.name, schema: ContributionReceiptSchema },
      {
        name: ProjectContributionBalance.name,
        schema: ProjectContributionBalanceSchema,
      },
      {
        name: ParticipantContributionBalance.name,
        schema: ParticipantContributionBalanceSchema,
      },
    ]),
    ProjectsModule,
    ProjectParticipantsModule,
    ProjectCommitmentsModule,
    FinancialYearModule,
  ],
  controllers: [ContributionReceiptsController],
  providers: [ContributionReceiptsService, ContributionReceiptPdfService],
  exports: [ContributionReceiptsService, MongooseModule],
})
export class ContributionReceiptsModule {}
