import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { SiteIssue, SiteIssueSchema } from './schemas/site-issue.schema';
import { SiteIssuesController } from './site-issues.controller';
import { SiteIssuesService } from './site-issues.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteIssue.name, schema: SiteIssueSchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    RbacModule,
  ],
  controllers: [SiteIssuesController],
  providers: [SiteIssuesService],
  exports: [SiteIssuesService, MongooseModule],
})
export class SiteIssuesModule {}
