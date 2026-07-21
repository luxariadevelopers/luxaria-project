import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import { UnitQuotationsController } from './unit-quotations.controller';
import { UnitQuotationsService } from './unit-quotations.service';
import {
  UnitQuotation,
  UnitQuotationSchema,
} from './schemas/unit-quotation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitQuotation.name, schema: UnitQuotationSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Unit.name, schema: UnitSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [UnitQuotationsController],
  providers: [UnitQuotationsService],
  exports: [UnitQuotationsService, MongooseModule],
})
export class UnitQuotationsModule {}
