import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoodsReceiptsModule } from '../goods-receipts/goods-receipts.module';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import { RbacModule } from '../rbac/rbac.module';
import { QualityInspectionsController } from './quality-inspections.controller';
import { QualityInspectionsService } from './quality-inspections.service';
import {
  QualityInspection,
  QualityInspectionSchema,
} from './schemas/quality-inspection.schema';
import {
  VendorQualityScore,
  VendorQualityScoreSchema,
} from './schemas/vendor-quality-score.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QualityInspection.name, schema: QualityInspectionSchema },
      { name: VendorQualityScore.name, schema: VendorQualityScoreSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
    ]),
    GoodsReceiptsModule,
    RbacModule,
  ],
  controllers: [QualityInspectionsController],
  providers: [QualityInspectionsService],
  exports: [QualityInspectionsService, MongooseModule],
})
export class QualityInspectionsModule {}
