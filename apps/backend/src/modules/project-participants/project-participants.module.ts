import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { DirectorsModule } from '../directors/directors.module';
import { InvestorsModule } from '../investors/investors.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectParticipantsController } from './project-participants.controller';
import { ProjectParticipantsService } from './project-participants.service';
import {
  ProjectParticipantConfig,
  ProjectParticipantConfigSchema,
} from './schemas/project-participant-config.schema';
import {
  ProjectParticipantFile,
  ProjectParticipantFileSchema,
} from './schemas/project-participant-document.schema';
import {
  ProjectParticipant,
  ProjectParticipantSchema,
} from './schemas/project-participant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      {
        name: ProjectParticipantConfig.name,
        schema: ProjectParticipantConfigSchema,
      },
      {
        name: ProjectParticipantFile.name,
        schema: ProjectParticipantFileSchema,
      },
    ]),
    ProjectsModule,
    DirectorsModule,
    InvestorsModule,
    CompanyModule,
  ],
  controllers: [ProjectParticipantsController],
  providers: [ProjectParticipantsService],
  exports: [ProjectParticipantsService, MongooseModule],
})
export class ProjectParticipantsModule {}
