import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { CostCentresController } from './cost-centres.controller';
import { CostCentresService } from './cost-centres.service';
import { CostCentre, CostCentreSchema } from './schemas/cost-centre.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CostCentre.name, schema: CostCentreSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [CostCentresController],
  providers: [CostCentresService],
  exports: [CostCentresService, MongooseModule],
})
export class CostCentresModule {}
