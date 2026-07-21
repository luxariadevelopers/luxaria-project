import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { NumberEntityType } from '../numbering/numbering.constants';
import { RoleStatus } from '../rbac/schemas/role.schema';
import { DepartmentsService } from './departments.service';
import { DesignationsService } from './designations.service';
import { EmployeesService } from './employees.service';
import {
  Department,
  DepartmentSchema,
  DepartmentStatus,
} from './schemas/department.schema';
import {
  Designation,
  DesignationSchema,
  DesignationStatus,
} from './schemas/designation.schema';
import {
  Employee,
  EmployeeSchema,
  EmployeeStatus,
} from './schemas/employee.schema';

describe('EmployeesService.provisionSiteEngineer', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let employeeModel: Model<Employee>;
  let departmentModel: Model<Department>;
  let designationModel: Model<Designation>;
  let service: EmployeesService;

  const companyId = new Types.ObjectId().toString();
  const actorId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const siteId = new Types.ObjectId().toString();
  const roleId = new Types.ObjectId();

  const usersService = {
    create: jest.fn(),
    findById: jest.fn(),
  };
  const rolesService = {
    findByCode: jest.fn(),
    findById: jest.fn(),
  };
  const projectAccessService = {
    create: jest.fn(),
    listAccessibleProjectIds: jest.fn(),
  };
  const siteAccessService = {
    createAssignment: jest.fn(),
    listAuthorisedSiteIds: jest.fn(),
  };
  const permissionOverridesService = {
    createDenyOverrides: jest.fn().mockResolvedValue([]),
    listActiveForUser: jest.fn().mockResolvedValue([]),
  };
  const actorContextService = {
    invalidate: jest.fn(),
  };
  const auditLogService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const numberingService = {
    nextCode: jest.fn().mockResolvedValue('EMP-000001'),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    employeeModel = connection.model(Employee.name, EmployeeSchema) as Model<Employee>;
    departmentModel = connection.model(
      Department.name,
      DepartmentSchema,
    ) as Model<Department>;
    designationModel = connection.model(
      Designation.name,
      DesignationSchema,
    ) as Model<Designation>;
    await employeeModel.syncIndexes();
    await departmentModel.syncIndexes();
    await designationModel.syncIndexes();

    const departmentsService = new DepartmentsService(departmentModel);
    const designationsService = new DesignationsService(designationModel);

    service = new EmployeesService(
      employeeModel,
      departmentsService,
      designationsService,
      numberingService as never,
      usersService as never,
      rolesService as never,
      projectAccessService as never,
      siteAccessService as never,
      permissionOverridesService as never,
      actorContextService as never,
      auditLogService as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await employeeModel.deleteMany({}).setOptions({ withDeleted: true });
    await departmentModel.deleteMany({}).setOptions({ withDeleted: true });
    await designationModel.deleteMany({}).setOptions({ withDeleted: true });

    numberingService.nextCode.mockResolvedValue('EMP-000001');
    rolesService.findByCode.mockResolvedValue({
      _id: roleId,
      code: 'SITE_ENGINEER',
      status: RoleStatus.Active,
    });
    usersService.create.mockResolvedValue({
      success: true,
      data: {
        id: new Types.ObjectId().toString(),
        fullName: 'Ravi Site',
        email: 'ravi@luxaria.dev',
      },
    });
    projectAccessService.create.mockResolvedValue({
      success: true,
      data: {
        id: new Types.ObjectId().toString(),
        projectId,
        userId: 'u1',
      },
    });
    siteAccessService.createAssignment.mockResolvedValue({
      success: true,
      data: {
        id: new Types.ObjectId().toString(),
        siteId,
        projectId,
      },
    });
  });

  it('provisions employee, user, role, project and site assignment', async () => {
    const result = await service.provisionSiteEngineer(
      {
        firstName: 'Ravi',
        lastName: 'Site',
        email: 'ravi@luxaria.dev',
        createLogin: true,
        password: 'ChangeMe123!',
        projectId,
        siteId,
        permissionDenies: ['expense.approve'],
      },
      companyId,
      actorId,
      true,
    );

    expect(result.success).toBe(true);
    expect(result.data?.employee.status).toBe(EmployeeStatus.Active);
    expect(result.data?.employee.userId).toBeTruthy();
    expect(result.data?.roleIds).toEqual([String(roleId)]);
    expect(result.data?.projectAssignment).toBeTruthy();
    expect(result.data?.siteAssignment).toBeTruthy();

    expect(numberingService.nextCode).toHaveBeenCalledWith(
      NumberEntityType.EMPLOYEE,
    );
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ravi@luxaria.dev',
        employeeId: 'EMP-000001',
        designation: 'Site Engineer',
        department: 'Engineering',
        roleIds: [String(roleId)],
        password: 'ChangeMe123!',
      }),
      actorId,
      true,
      companyId,
    );
    expect(projectAccessService.create).toHaveBeenCalled();
    expect(siteAccessService.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        siteId,
        isDefault: true,
      }),
      companyId,
      actorId,
    );
    expect(permissionOverridesService.createDenyOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: ['expense.approve'],
      }),
    );
    expect(actorContextService.invalidate).toHaveBeenCalled();

    const dept = await departmentModel.findOne({
      companyId: new Types.ObjectId(companyId),
      code: 'ENGINEERING',
    });
    expect(dept?.status).toBe(DepartmentStatus.Active);
    const desig = await designationModel.findOne({
      companyId: new Types.ObjectId(companyId),
      code: 'SITE_ENGINEER',
    });
    expect(desig?.status).toBe(DesignationStatus.Active);
    expect(desig?.defaultRoleCode).toBe('SITE_ENGINEER');
  });

  it('requires password when createLogin is true', async () => {
    await expect(
      service.provisionSiteEngineer(
        {
          firstName: 'A',
          lastName: 'B',
          email: 'ab@luxaria.dev',
          createLogin: true,
          projectId,
          siteId,
        },
        companyId,
        actorId,
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('detects circular reporting', async () => {
    const managerUserId = new Types.ObjectId();
    const [manager] = await employeeModel.create([
      {
        companyId: new Types.ObjectId(companyId),
        employeeCode: 'EMP-MGR',
        firstName: 'Mgr',
        lastName: 'One',
        displayName: 'Mgr One',
        email: 'mgr@luxaria.dev',
        departmentId: new Types.ObjectId(),
        designationId: new Types.ObjectId(),
        userId: managerUserId,
        status: EmployeeStatus.Active,
        employmentType: 'full_time',
      },
    ]);

    // Point manager at a second employee who points back via managerUserId later
    const subordinateUserId = new Types.ObjectId();
    const [sub] = await employeeModel.create([
      {
        companyId: new Types.ObjectId(companyId),
        employeeCode: 'EMP-SUB',
        firstName: 'Sub',
        lastName: 'Two',
        displayName: 'Sub Two',
        email: 'sub@luxaria.dev',
        departmentId: new Types.ObjectId(),
        designationId: new Types.ObjectId(),
        userId: subordinateUserId,
        reportingManagerUserId: managerUserId,
        status: EmployeeStatus.Active,
        employmentType: 'full_time',
      },
    ]);

    manager.reportingManagerUserId = subordinateUserId;
    await manager.save();

    await expect(
      service.assertNoCircularReporting(
        String(sub._id),
        String(managerUserId),
        companyId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
