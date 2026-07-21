import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  SiteSafety,
  SiteSafetySchema,
} from './schemas/site-safety.schema';
import { SiteSafetyController } from './site-safety.controller';
import { SiteSafetyService } from './site-safety.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteSafety.name, schema: SiteSafetySchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [SiteSafetyController],
  providers: [SiteSafetyService],
  exports: [SiteSafetyService, MongooseModule],
})
export class SiteSafetyModule {}
