import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { SitePhoto, SitePhotoSchema } from './schemas/site-photo.schema';
import { SitePhotosController } from './site-photos.controller';
import { SitePhotosService } from './site-photos.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SitePhoto.name, schema: SitePhotoSchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    RbacModule,
  ],
  controllers: [SitePhotosController],
  providers: [SitePhotosService],
  exports: [SitePhotosService, MongooseModule],
})
export class SitePhotosModule {}
