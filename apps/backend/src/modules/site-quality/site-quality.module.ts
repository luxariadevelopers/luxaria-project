import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  SiteQuality,
  SiteQualitySchema,
} from './schemas/site-quality.schema';
import { SiteQualityController } from './site-quality.controller';
import { SiteQualityService } from './site-quality.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteQuality.name, schema: SiteQualitySchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [SiteQualityController],
  providers: [SiteQualityService],
  exports: [SiteQualityService, MongooseModule],
})
export class SiteQualityModule {}
