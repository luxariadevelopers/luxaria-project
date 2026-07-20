import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectParticipantsModule } from '../project-participants/project-participants.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectCommitmentsController } from './project-commitments.controller';
import { ProjectCommitmentsService } from './project-commitments.service';
import {
  ContributionCommitment,
  ContributionCommitmentSchema,
} from './schemas/contribution-commitment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ContributionCommitment.name,
        schema: ContributionCommitmentSchema,
      },
    ]),
    ProjectsModule,
    ProjectParticipantsModule,
  ],
  controllers: [ProjectCommitmentsController],
  providers: [ProjectCommitmentsService],
  exports: [ProjectCommitmentsService, MongooseModule],
})
export class ProjectCommitmentsModule {}
