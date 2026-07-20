import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqVersion, BoqVersionSchema } from '../boq/schemas/boq.schema';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  ContributionReceipt,
  ContributionReceiptSchema,
} from '../contribution-receipts/schemas/contribution-receipt.schema';
import {
  Investor,
  InvestorSchema,
} from '../investors/schemas/investor.schema';
import {
  ContributionCommitment,
  ContributionCommitmentSchema,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ProjectParticipantFile,
  ProjectParticipantFileSchema,
} from '../project-participants/schemas/project-participant-document.schema';
import {
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { InvestorPortalController } from './investor-portal.controller';
import { InvestorPortalService } from './investor-portal.service';
import {
  InvestorProfitAllocation,
  InvestorProfitAllocationSchema,
} from './schemas/investor-profit-allocation.schema';
import {
  InvestorVisibleReport,
  InvestorVisibleReportSchema,
} from './schemas/investor-visible-report.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investor.name, schema: InvestorSchema },
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      { name: ContributionCommitment.name, schema: ContributionCommitmentSchema },
      { name: ContributionReceipt.name, schema: ContributionReceiptSchema },
      { name: ProjectParticipantFile.name, schema: ProjectParticipantFileSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: VendorInvoice.name, schema: VendorInvoiceSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      { name: InvestorVisibleReport.name, schema: InvestorVisibleReportSchema },
      {
        name: InvestorProfitAllocation.name,
        schema: InvestorProfitAllocationSchema,
      },
    ]),
  ],
  controllers: [InvestorPortalController],
  providers: [InvestorPortalService],
  exports: [InvestorPortalService],
})
export class InvestorPortalModule {}
