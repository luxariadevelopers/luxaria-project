import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsModule } from '../documents/documents.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { Drawing, DrawingSchema } from './schemas/drawing.schema';
import { DrawingsController } from './drawings.controller';
import { DrawingsService } from './drawings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Drawing.name, schema: DrawingSchema },
    ]),
    DocumentsModule,
    SitesModule,
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [DrawingsController],
  providers: [DrawingsService],
  exports: [DrawingsService, MongooseModule],
})
export class DrawingsModule {}
