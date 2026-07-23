import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ActorContextService } from '../project-access/actor-context.service';
import { ProjectAccessService } from '../project-access/project-access.service';
import { PermissionOverridesService } from '../rbac/permission-overrides.service';
import { RolesService } from '../rbac/roles.service';
import { SiteAccessService } from '../sites/site-access.service';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from './departments.service';
import { DesignationsService } from './designations.service';
import type {
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  ProvisionSiteEngineerDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';
import { toPublicEmployee } from './employees.mapper';
import {
  Employee,
  EmployeeStatus,
} from './schemas/employee.schema';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
    private readonly departmentsService: DepartmentsService,
    private readonly designationsService: DesignationsService,
    private readonly numberingService: NumberingService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => ProjectAccessService))
    private readonly projectAccessService: ProjectAccessService,
    @Inject(forwardRef(() => SiteAccessService))
    private readonly siteAccessService: SiteAccessService,
    private readonly permissionOverridesService: PermissionOverridesService,
    @Inject(forwardRef(() => ActorContextService))
    private readonly actorContextService: ActorContextService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateEmployeeDto, companyId: string, actorId?: string) {
    this.requireCompany(companyId);
    await this.departmentsService.requireDepartment(dto.departmentId, companyId);
    await this.designationsService.requireDesignation(
      dto.designationId,
      companyId,
    );

    if (dto.reportingManagerUserId) {
      await this.assertNoCircularReporting(
        null,
        dto.reportingManagerUserId,
        companyId,
      );
    }

    const employeeCode = dto.employeeCode
      ? dto.employeeCode.trim().toUpperCase()
      : await this.numberingService.nextCode(NumberEntityType.EMPLOYEE);
    const displayName =
      dto.displayName?.trim() ||
      `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim();

    try {
      const row = await this.employeeModel.create({
        companyId: new Types.ObjectId(companyId),
        employeeCode,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        displayName,
        email: dto.email.trim().toLowerCase(),
        mobile: dto.mobile?.trim() ?? null,
        departmentId: new Types.ObjectId(dto.departmentId),
        designationId: new Types.ObjectId(dto.designationId),
        reportingManagerUserId: dto.reportingManagerUserId
          ? new Types.ObjectId(dto.reportingManagerUserId)
          : null,
        employmentType: dto.employmentType?.trim() || 'full_time',
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        status: dto.status ?? EmployeeStatus.Active,
        primaryWorkLocation: dto.primaryWorkLocation?.trim() ?? null,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });

      await this.safeAudit({
        userId: actorId,
        action: AuditAction.CREATE,
        module: 'employees',
        entityType: 'Employee',
        entityId: String(row._id),
        afterData: toPublicEmployee(row),
      });

      return createSuccessResponse(toPublicEmployee(row), 'Employee created');
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          'Employee code or email already exists for this company',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireEmployee(id, companyId);
    const before = toPublicEmployee(row);

    if (dto.departmentId !== undefined) {
      await this.departmentsService.requireDepartment(
        dto.departmentId,
        companyId,
      );
      row.departmentId = new Types.ObjectId(dto.departmentId);
    }
    if (dto.designationId !== undefined) {
      await this.designationsService.requireDesignation(
        dto.designationId,
        companyId,
      );
      row.designationId = new Types.ObjectId(dto.designationId);
    }
    if (dto.reportingManagerUserId !== undefined) {
      if (dto.reportingManagerUserId) {
        await this.assertNoCircularReporting(
          id,
          dto.reportingManagerUserId,
          companyId,
        );
        row.reportingManagerUserId = new Types.ObjectId(
          dto.reportingManagerUserId,
        );
      } else {
        row.reportingManagerUserId = null;
      }
    }
    if (dto.firstName !== undefined) row.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) row.lastName = dto.lastName.trim();
    if (dto.displayName !== undefined) {
      row.displayName = dto.displayName.trim();
    } else if (dto.firstName !== undefined || dto.lastName !== undefined) {
      row.displayName = `${row.firstName} ${row.lastName}`.trim();
    }
    if (dto.email !== undefined) row.email = dto.email.trim().toLowerCase();
    if (dto.mobile !== undefined) row.mobile = dto.mobile?.trim() ?? null;
    if (dto.employmentType !== undefined) {
      row.employmentType = dto.employmentType.trim();
    }
    if (dto.joiningDate !== undefined) {
      row.joiningDate = dto.joiningDate ? new Date(dto.joiningDate) : null;
    }
    if (dto.relievingDate !== undefined) {
      row.relievingDate = dto.relievingDate
        ? new Date(dto.relievingDate)
        : null;
    }
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.primaryWorkLocation !== undefined) {
      row.primaryWorkLocation = dto.primaryWorkLocation?.trim() ?? null;
    }
    if (dto.profilePhoto !== undefined) {
      row.profilePhoto = dto.profilePhoto?.trim() ?? null;
    }

    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    try {
      await row.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          'Employee code or email already exists for this company',
        );
      }
      throw error;
    }

    await this.safeAudit({
      userId: actorId,
      action: AuditAction.UPDATE,
      module: 'employees',
      entityType: 'Employee',
      entityId: id,
      beforeData: before,
      afterData: toPublicEmployee(row),
    });

    if (row.userId) {
      this.actorContextService.invalidate(String(row.userId));
    }

    return createSuccessResponse(toPublicEmployee(row), 'Employee updated');
  }

  async deactivate(id: string, companyId: string, actorId?: string) {
    return this.update(
      id,
      { status: EmployeeStatus.Suspended },
      companyId,
      actorId,
    );
  }

  async list(query: ListEmployeesQueryDto, companyId: string) {
    this.requireCompany(companyId);
    const filter: FilterQuery<Employee> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.status) filter.status = query.status;
    if (query.departmentId) {
      filter.departmentId = new Types.ObjectId(query.departmentId);
    }
    if (query.designationId) {
      filter.designationId = new Types.ObjectId(query.designationId);
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { firstName: new RegExp(q, 'i') },
        { lastName: new RegExp(q, 'i') },
        { displayName: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { employeeCode: new RegExp(q, 'i') },
      ];
    }

    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;

    const [items, total] = await Promise.all([
      this.employeeModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.employeeModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicEmployee(item)),
      'Employees fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string, companyId: string) {
    const row = await this.requireEmployee(id, companyId);
    return createSuccessResponse(toPublicEmployee(row), 'Employee fetched');
  }

  async getAccessSummary(id: string, companyId: string) {
    const employee = await this.requireEmployee(id, companyId);
    if (!employee.userId) {
      return createSuccessResponse(
        {
          employee: toPublicEmployee(employee),
          roles: [],
          projects: [],
          sites: [],
          overrides: [],
        },
        'Employee access summary',
      );
    }

    const userId = String(employee.userId);
    const user = await this.usersService.findById(userId);
    const roleIds = (user?.roleIds ?? []).map(String);
    const roles = [];
    for (const roleId of roleIds) {
      const role = await this.rolesService.findById(roleId);
      if (role) {
        roles.push({ id: String(role._id), code: role.code, name: role.name });
      }
    }

    const projects =
      await this.projectAccessService.listAccessibleProjectIds(userId);
    const sites = await this.siteAccessService.listAuthorisedSiteIds(userId);
    const overrides =
      await this.permissionOverridesService.listActiveForUser(userId);

    return createSuccessResponse(
      {
        employee: toPublicEmployee(employee),
        roles,
        projects,
        sites,
        overrides,
      },
      'Employee access summary',
    );
  }

  async syncModuleAccess(
    id: string,
    dto: {
      denyPermissions: string[];
      catalogPermissions: string[];
    },
    companyId: string,
    actorId: string,
  ) {
    const employee = await this.requireEmployee(id, companyId);
    if (!employee.userId) {
      throw new BadRequestException(
        'Employee has no login user — create a login before setting module access',
      );
    }

    const result =
      await this.permissionOverridesService.syncGlobalDenyOverrides({
        userId: String(employee.userId),
        companyId,
        denyPermissions: dto.denyPermissions ?? [],
        catalogPermissions: dto.catalogPermissions ?? [],
        reason: 'Employee module access',
        actorId,
      });

    await this.safeAudit({
      userId: actorId,
      action: AuditAction.UPDATE,
      module: 'employees',
      entityType: 'Employee',
      entityId: id,
      afterData: {
        step: 'module_access_synced',
        created: result.created,
        inactivated: result.inactivated,
        activeDenies: result.activeDenies,
      },
    });

    const summary = await this.getAccessSummary(id, companyId);
    return createSuccessResponse(
      {
        ...summary.data,
        sync: result,
      },
      'Employee module access updated',
    );
  }

  findByUserId(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return Promise.resolve(null);
    }
    return this.employeeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  /**
   * Composite provision: Employee + User + SITE_ENGINEER role +
   * project assignment + site assignment + optional deny overrides.
   */
  async provisionSiteEngineer(
    dto: ProvisionSiteEngineerDto,
    companyId: string,
    actorId: string,
    actorCanBypass: boolean,
  ) {
    this.requireCompany(companyId);

    if (!dto.createLogin) {
      throw new BadRequestException(
        'createLogin must be true for site engineer provision in this slice',
      );
    }
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException(
        'password (min 8) is required when createLogin is true',
      );
    }

    const department = await this.ensureEngineeringDepartment(
      companyId,
      dto.departmentId,
      dto.departmentCode,
    );
    const designation = await this.ensureSiteEngineerDesignation(
      companyId,
      String(department._id),
      dto.designationId,
      dto.designationCode,
    );

    const reportingOfficers = [
      ...new Set(
        [
          ...(dto.reportingOfficerUserIds ?? []),
          ...(dto.reportingManagerUserId ? [dto.reportingManagerUserId] : []),
        ]
          .map((id) => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (reportingOfficers.length > 2) {
      throw new BadRequestException(
        'Select at most 2 reporting officers for Site Engineer provision',
      );
    }
    const primaryReportingManager =
      dto.reportingManagerUserId &&
      reportingOfficers.includes(dto.reportingManagerUserId)
        ? dto.reportingManagerUserId
        : (reportingOfficers[0] ?? null);

    for (const officerId of reportingOfficers) {
      await this.assertNoCircularReporting(null, officerId, companyId);
    }

    const employeeCode = dto.employeeCode
      ? dto.employeeCode.trim().toUpperCase()
      : await this.numberingService.nextCode(NumberEntityType.EMPLOYEE);
    const displayName =
      dto.displayName?.trim() ||
      `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim();

    let employee;
    try {
      [employee] = await this.employeeModel.create([
        {
          companyId: new Types.ObjectId(companyId),
          employeeCode,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          displayName,
          email: dto.email.trim().toLowerCase(),
          mobile: dto.mobile?.trim() ?? null,
          departmentId: department._id,
          designationId: designation._id,
          reportingManagerUserId: primaryReportingManager
            ? new Types.ObjectId(primaryReportingManager)
            : null,
          employmentType: 'full_time',
          joiningDate: new Date(),
          status: EmployeeStatus.Active,
          createdBy: new Types.ObjectId(actorId),
        },
      ]);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          'Employee code or email already exists for this company',
        );
      }
      throw error;
    }

    await this.safeAudit({
      userId: actorId,
      action: AuditAction.CREATE,
      module: 'employees',
      entityType: 'Employee',
      entityId: String(employee._id),
      projectId: dto.projectId,
      afterData: { step: 'employee_created', employeeCode },
    });

    const roleCode = (dto.roleCode ?? 'SITE_ENGINEER').trim().toUpperCase();
    const role = await this.rolesService.findByCode(roleCode);
    if (!role) {
      throw new BadRequestException(`Role ${roleCode} not found`);
    }

    const userResponse = await this.usersService.create(
      {
        fullName: displayName,
        email: dto.email.trim().toLowerCase(),
        mobile: dto.mobile?.trim() ?? null,
        password: dto.password,
        employeeId: employeeCode,
        designation: designation.name,
        department: department.name,
        roleIds: [String(role._id)],
        reportingManager: primaryReportingManager,
        reportingOfficers,
        reportingApprovalMode: dto.reportingApprovalMode,
        joiningDate: new Date().toISOString(),
      },
      actorId,
      actorCanBypass,
      companyId,
    );

    const user = userResponse.data;
    if (!user?.id) {
      throw new BadRequestException('Failed to create login user');
    }

    employee.userId = new Types.ObjectId(user.id);
    await employee.save();

    await this.safeAudit({
      userId: actorId,
      action: AuditAction.CREATE,
      module: 'employees',
      entityType: 'User',
      entityId: user.id,
      projectId: dto.projectId,
      afterData: { step: 'user_created', linkedEmployeeId: String(employee._id) },
    });

    const accessStartDate = dto.accessStartDate ?? new Date().toISOString();
    const projectAssignmentResponse = await this.projectAccessService.create(
      {
        userId: user.id,
        projectId: dto.projectId,
        globalAccess: false,
        accessStartDate,
        accessEndDate: dto.accessEndDate ?? null,
        notes: 'Provisioned with site engineer',
      },
      actorId,
    );

    await this.safeAudit({
      userId: actorId,
      action: AuditAction.CREATE,
      module: 'project_access',
      entityType: 'ProjectAssignment',
      entityId: projectAssignmentResponse.data?.id ?? null,
      projectId: dto.projectId,
      afterData: { step: 'project_assignment_created' },
    });

    const siteAssignmentResponse = await this.siteAccessService.createAssignment(
      {
        userId: user.id,
        projectId: dto.projectId,
        siteId: dto.siteId,
        employeeId: String(employee._id),
        projectAssignmentId: projectAssignmentResponse.data?.id ?? null,
        roleInSite: roleCode,
        effectiveFrom: accessStartDate,
        effectiveTo: dto.accessEndDate ?? null,
        isDefault: true,
        notes: 'Provisioned with site engineer',
      },
      companyId,
      actorId,
    );

    await this.safeAudit({
      userId: actorId,
      action: AuditAction.CREATE,
      module: 'site_access',
      entityType: 'SiteAssignment',
      entityId: siteAssignmentResponse.data?.id ?? null,
      projectId: dto.projectId,
      afterData: { step: 'site_assignment_created', siteId: dto.siteId },
    });

    if (dto.permissionDenies?.length) {
      await this.permissionOverridesService.createDenyOverrides({
        userId: user.id,
        companyId,
        permissions: dto.permissionDenies,
        reason: 'Provision permission deny',
        projectId: dto.projectId,
        siteId: dto.siteId,
        effectiveFrom: new Date(accessStartDate),
        effectiveTo: dto.accessEndDate ? new Date(dto.accessEndDate) : null,
        actorId,
      });
      await this.safeAudit({
        userId: actorId,
        action: AuditAction.UPDATE,
        module: 'rbac',
        entityType: 'PermissionOverride',
        entityId: user.id,
        projectId: dto.projectId,
        afterData: {
          step: 'permission_denies_applied',
          permissions: dto.permissionDenies,
        },
      });
    }

    // sendInvitation stub — no email sent in this slice
    void dto.sendInvitation;

    this.actorContextService.invalidate(user.id);

    return createSuccessResponse(
      {
        employee: toPublicEmployee(employee),
        user,
        roleIds: [String(role._id)],
        projectAssignment: projectAssignmentResponse.data,
        siteAssignment: siteAssignmentResponse.data,
      },
      'Site engineer provisioned successfully',
    );
  }

  /**
   * Walk reportingManagerUserId chain (via linked employees) to prevent cycles.
   */
  async assertNoCircularReporting(
    employeeId: string | null,
    managerUserId: string,
    companyId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(managerUserId)) {
      throw new BadRequestException('Invalid reportingManagerUserId');
    }

    const managerEmployee = await this.employeeModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        userId: new Types.ObjectId(managerUserId),
      })
      .exec();

    if (!managerEmployee) {
      // Manager may be a user without employee record — allowed, no cycle path.
      return;
    }

    if (employeeId && String(managerEmployee._id) === employeeId) {
      throw new BadRequestException('Employee cannot report to themselves');
    }

    const visited = new Set<string>(employeeId ? [employeeId] : []);
    let current: typeof managerEmployee | null = managerEmployee;
    let depth = 0;
    while (current && depth < 50) {
      const currentId = String(current._id);
      if (visited.has(currentId)) {
        throw new BadRequestException('Circular reporting relationship detected');
      }
      visited.add(currentId);
      if (!current.reportingManagerUserId) break;
      current = await this.employeeModel
        .findOne({
          companyId: new Types.ObjectId(companyId),
          userId: current.reportingManagerUserId,
        })
        .exec();
      depth += 1;
    }
  }

  private async ensureEngineeringDepartment(
    companyId: string,
    departmentId?: string,
    departmentCode?: string,
  ) {
    if (departmentId) {
      return this.departmentsService.requireDepartment(departmentId, companyId);
    }
    const code = (departmentCode ?? 'ENGINEERING').trim().toUpperCase();
    return this.departmentsService.ensureByCode(
      companyId,
      code,
      code === 'ENGINEERING' ? 'Engineering' : code,
      code === 'ENGINEERING'
        ? 'Site engineering and construction delivery'
        : null,
    );
  }

  private async ensureSiteEngineerDesignation(
    companyId: string,
    departmentId: string,
    designationId?: string,
    designationCode?: string,
  ) {
    if (designationId) {
      return this.designationsService.requireDesignation(
        designationId,
        companyId,
      );
    }
    const code = (designationCode ?? 'SITE_ENGINEER').trim().toUpperCase();
    return this.designationsService.ensureByCode({
      companyId,
      code,
      name: code === 'SITE_ENGINEER' ? 'Site Engineer' : code,
      departmentId,
      defaultRoleCode: code === 'SITE_ENGINEER' ? 'SITE_ENGINEER' : code,
      reportingLevel: 3,
      mobileEligible: true,
    });
  }

  private async requireEmployee(id: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Employee not found');
    }
    const row = await this.employeeModel.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Employee not found');
    }
    return row;
  }

  private requireCompany(
    companyId: string | null | undefined,
  ): asserts companyId is string {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new ForbiddenException('Authenticated company context required');
    }
  }

  private async safeAudit(
    input: Parameters<AuditLogService['record']>[0],
  ): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch {
      // Audit must not roll back business writes.
    }
  }
}
