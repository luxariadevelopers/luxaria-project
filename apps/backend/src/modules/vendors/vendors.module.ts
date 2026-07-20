import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import {
  VendorFile,
  VendorFileSchema,
} from './schemas/vendor-document.schema';
import {
  VendorProjectAssignment,
  VendorProjectAssignmentSchema,
} from './schemas/vendor-project-assignment.schema';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: VendorFile.name, schema: VendorFileSchema },
      {
        name: VendorProjectAssignment.name,
        schema: VendorProjectAssignmentSchema,
      },
      { name: Project.name, schema: ProjectSchema },
    ]),
    CompanyModule,
    RbacModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService, MongooseModule],
})
export class VendorsModule {}
