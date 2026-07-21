import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import {
  SiteDiaryEntry,
  SiteDiaryEntrySchema,
} from './schemas/site-diary-entry.schema';
import { SiteDiaryController } from './site-diary.controller';
import { SiteDiaryService } from './site-diary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteDiaryEntry.name, schema: SiteDiaryEntrySchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    RbacModule,
  ],
  controllers: [SiteDiaryController],
  providers: [SiteDiaryService],
  exports: [SiteDiaryService, MongooseModule],
})
export class SiteDiaryModule {}
