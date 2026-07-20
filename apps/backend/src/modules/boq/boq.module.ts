import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { BoqExcelService } from './boq-excel.service';
import { BoqController } from './boq.controller';
import { BoqService } from './boq.service';
import {
  BoqBlock,
  BoqBlockSchema,
  BoqFloor,
  BoqFloorSchema,
  BoqItem,
  BoqItemSchema,
  BoqVersion,
  BoqVersionSchema,
  BoqWorkCategory,
  BoqWorkCategorySchema,
} from './schemas/boq.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BoqBlock.name, schema: BoqBlockSchema },
      { name: BoqFloor.name, schema: BoqFloorSchema },
      { name: BoqWorkCategory.name, schema: BoqWorkCategorySchema },
      { name: BoqItem.name, schema: BoqItemSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    ProjectAccessModule,
  ],
  controllers: [BoqController],
  providers: [BoqService, BoqExcelService],
  exports: [BoqService, MongooseModule],
})
export class BoqModule {}
