import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  TdsDeduction,
  TdsDeductionSchema,
} from './schemas/tds-deduction.schema';
import { TdsReturn, TdsReturnSchema } from './schemas/tds-return.schema';
import { TdsSection, TdsSectionSchema } from './schemas/tds-section.schema';
import { TdsController } from './tds.controller';
import { TdsSeedService } from './tds.seed.service';
import { TdsService } from './tds.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TdsSection.name, schema: TdsSectionSchema },
      { name: TdsDeduction.name, schema: TdsDeductionSchema },
      { name: TdsReturn.name, schema: TdsReturnSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [TdsController],
  providers: [TdsService, TdsSeedService],
  exports: [TdsService, MongooseModule],
})
export class TdsModule {}
