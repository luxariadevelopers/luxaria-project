import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JournalModule } from '../journal/journal.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from './fixed-assets.service';
import {
  FixedAssetDepreciation,
  FixedAssetDepreciationSchema,
} from './schemas/fixed-asset-depreciation.schema';
import { FixedAsset, FixedAssetSchema } from './schemas/fixed-asset.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FixedAsset.name, schema: FixedAssetSchema },
      {
        name: FixedAssetDepreciation.name,
        schema: FixedAssetDepreciationSchema,
      },
    ]),
    JournalModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [FixedAssetsController],
  providers: [FixedAssetsService],
  exports: [FixedAssetsService, MongooseModule],
})
export class FixedAssetsModule {}
