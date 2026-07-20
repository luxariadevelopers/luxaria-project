import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { LabourCategoriesController } from './labour-categories.controller';
import { LabourCategoriesService } from './labour-categories.service';
import {
  LabourCategory,
  LabourCategoryRate,
  LabourCategoryRateSchema,
  LabourCategorySchema,
} from './schemas/labour-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LabourCategory.name, schema: LabourCategorySchema },
      { name: LabourCategoryRate.name, schema: LabourCategoryRateSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contractor.name, schema: ContractorSchema },
    ]),
    RbacModule,
  ],
  controllers: [LabourCategoriesController],
  providers: [LabourCategoriesService],
  exports: [LabourCategoriesService, MongooseModule],
})
export class LabourCategoriesModule {}
