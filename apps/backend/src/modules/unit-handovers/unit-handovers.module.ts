import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import {
  UnitHandover,
  UnitHandoverSchema,
} from './schemas/unit-handover.schema';
import { UnitHandoversController } from './unit-handovers.controller';
import { UnitHandoversService } from './unit-handovers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitHandover.name, schema: UnitHandoverSchema },
      { name: Unit.name, schema: UnitSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [UnitHandoversController],
  providers: [UnitHandoversService],
  exports: [UnitHandoversService, MongooseModule],
})
export class UnitHandoversModule {}
