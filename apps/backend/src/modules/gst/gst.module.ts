import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { GstController } from './gst.controller';
import { GstService } from './gst.service';
import {
  GstDocument,
  GstDocumentSchema,
} from './schemas/gst-document.schema';
import { GstReturn, GstReturnSchema } from './schemas/gst-return.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GstDocument.name, schema: GstDocumentSchema },
      { name: GstReturn.name, schema: GstReturnSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [GstController],
  providers: [GstService],
  exports: [GstService, MongooseModule],
})
export class GstModule {}
