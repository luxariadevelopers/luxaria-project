import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { UsersModule } from '../users/users.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';
import { EmployeesController } from './employees.controller';
import { EmployeesSeedService } from './employees.seed.service';
import { EmployeesService } from './employees.service';
import {
  Department,
  DepartmentSchema,
} from './schemas/department.schema';
import {
  Designation,
  DesignationSchema,
} from './schemas/designation.schema';
import { Employee, EmployeeSchema } from './schemas/employee.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    CompanyModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RbacModule),
    forwardRef(() => ProjectAccessModule),
    forwardRef(() => SitesModule),
  ],
  controllers: [
    DepartmentsController,
    DesignationsController,
    EmployeesController,
  ],
  providers: [
    DepartmentsService,
    DesignationsService,
    EmployeesService,
    EmployeesSeedService,
  ],
  exports: [
    EmployeesService,
    DepartmentsService,
    DesignationsService,
    MongooseModule,
  ],
})
export class EmployeesModule {}
