import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { Site, SiteSchema } from '../sites/schemas/site.schema';
import {
  WarehouseLocation,
  WarehouseLocationSchema,
} from './schemas/warehouse-location.schema';
import { WarehouseLocationsController } from './warehouse-locations.controller';
import { WarehouseLocationsService } from './warehouse-locations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarehouseLocation.name, schema: WarehouseLocationSchema },
      { name: Site.name, schema: SiteSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [WarehouseLocationsController],
  providers: [WarehouseLocationsService],
  exports: [WarehouseLocationsService, MongooseModule],
})
export class WarehouseLocationsModule {}
