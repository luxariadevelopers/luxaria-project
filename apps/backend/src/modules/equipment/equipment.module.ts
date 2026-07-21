import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import {
  EquipmentUtilization,
  EquipmentUtilizationSchema,
} from './schemas/equipment-utilization.schema';
import { Equipment, EquipmentSchema } from './schemas/equipment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Equipment.name, schema: EquipmentSchema },
      { name: EquipmentUtilization.name, schema: EquipmentUtilizationSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService, MongooseModule],
})
export class EquipmentModule {}
