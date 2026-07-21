import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SiteAccessController } from './site-access.controller';
import { SiteAccessService } from './site-access.service';
import {
  SiteAssignment,
  SiteAssignmentSchema,
} from './schemas/site-assignment.schema';
import { Site, SiteSchema } from './schemas/site.schema';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Site.name, schema: SiteSchema },
      { name: SiteAssignment.name, schema: SiteAssignmentSchema },
    ]),
    RbacModule,
    forwardRef(() => ProjectAccessModule),
  ],
  controllers: [SitesController, SiteAccessController],
  providers: [SitesService, SiteAccessService],
  exports: [SitesService, SiteAccessService, MongooseModule],
})
export class SitesModule {}
