import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsModule } from '../approvals/approvals.module';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
} from '../purchase-requests/schemas/purchase-request.schema';
import { RbacModule } from '../rbac/rbac.module';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import {
  VendorQuotation,
  VendorQuotationSchema,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { QuotationComparisonPdfService } from './quotation-comparison-pdf.service';
import { QuotationComparisonsController } from './quotation-comparisons.controller';
import { QuotationComparisonsSeedService } from './quotation-comparisons.seed.service';
import { QuotationComparisonsService } from './quotation-comparisons.service';
import {
  QuotationComparison,
  QuotationComparisonSchema,
} from './schemas/quotation-comparison.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuotationComparison.name, schema: QuotationComparisonSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: VendorQuotation.name, schema: VendorQuotationSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    ApprovalsModule,
    RbacModule,
  ],
  controllers: [QuotationComparisonsController],
  providers: [
    QuotationComparisonsService,
    QuotationComparisonPdfService,
    QuotationComparisonsSeedService,
  ],
  exports: [QuotationComparisonsService, MongooseModule],
})
export class QuotationComparisonsModule {}
