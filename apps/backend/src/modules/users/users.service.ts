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
import type { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { Types as MongooseTypes } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { hashPassword, verifyPassword } from '../../common/utils/crypto.util';
import { softDeleteById } from '../../database/utils/soft-delete.helper';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectAccessService } from '../project-access/project-access.service';
import { RolesService } from '../rbac/roles.service';
import { SessionService } from '../sessions/session.service';
import type { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import type { AssignProjectsDto } from './dto/assign-projects.dto';
import type { AssignRolesDto } from './dto/assign-roles.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { RemoveProjectsDto } from './dto/remove-projects.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { formatEmployeeId } from './employee-id';
import {
  ReportingApprovalMode,
  User,
  UserStatus,
} from './schemas/user.schema';
import { toPublicUser } from './users.mapper';

const ALLOWED_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'fullName',
  'email',
  'department',
  'status',
  'joiningDate',
  'lastLoginAt',
  'userCode',
]);

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly numberingService: NumberingService,
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
    @Inject(forwardRef(() => ProjectAccessService))
    private readonly projectAccessService: ProjectAccessService,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
  ) {}

  findById(id: string | Types.ObjectId) {
    return this.userModel.findById(id).exec();
  }

  findByIdWithPassword(id: string | Types.ObjectId) {
    return this.userModel.findById(id).select('+passwordHash').exec();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  findByMobile(mobile: string) {
    return this.userModel.findOne({ mobile: mobile.trim() }).exec();
  }

  findByEmailOrMobile(identifier: string) {
    const value = identifier.trim();
    const isEmail = value.includes('@');

    if (isEmail) {
      return this.userModel.findOne({ email: value.toLowerCase() }).exec();
    }

    return this.userModel.findOne({ mobile: value }).exec();
  }

  findByEmailOrMobileWithPassword(identifier: string) {
    const value = identifier.trim();
    const isEmail = value.includes('@');

    if (isEmail) {
      return this.userModel
        .findOne({ email: value.toLowerCase() })
        .select('+passwordHash')
        .exec();
    }

    return this.userModel.findOne({ mobile: value }).select('+passwordHash').exec();
  }

  async createUser(input: {
    userCode: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
    passwordHash: string;
    status?: UserStatus;
    employeeId?: string | null;
    designation?: string | null;
    department?: string | null;
    profilePhoto?: string | null;
    assignedProjects?: Types.ObjectId[];
    companyId?: Types.ObjectId | null;
    roleIds?: Types.ObjectId[];
    reportingManager?: Types.ObjectId | null;
    reportingOfficers?: Types.ObjectId[];
    reportingApprovalMode?: ReportingApprovalMode;
    mustChangePassword?: boolean;
    joiningDate?: Date | null;
  }) {
    const [user] = await this.userModel.create([
      {
        userCode: input.userCode,
        fullName: input.fullName,
        email: input.email ? input.email.trim().toLowerCase() : null,
        mobile: input.mobile ? input.mobile.trim() : null,
        passwordHash: input.passwordHash,
        status: input.status ?? UserStatus.Active,
        employeeId: input.employeeId ?? null,
        designation: input.designation ?? null,
        department: input.department ?? null,
        profilePhoto: input.profilePhoto ?? null,
        assignedProjects: input.assignedProjects ?? [],
        companyId: input.companyId ?? null,
        roleIds: input.roleIds ?? [],
        reportingManager: input.reportingManager ?? null,
        reportingOfficers: input.reportingOfficers ?? [],
        reportingApprovalMode:
          input.reportingApprovalMode ?? ReportingApprovalMode.Any,
        mustChangePassword: input.mustChangePassword ?? true,
        joiningDate: input.joiningDate ?? null,
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLoginAt: null,
      },
    ]);
    return user;
  }

  async create(
    dto: CreateUserDto,
    actorId?: string,
    actorCanBypass = false,
    authenticatedCompanyId?: string | null,
  ) {
    if (!dto.email?.trim() && !dto.mobile?.trim()) {
      throw new BadRequestException(
        'Email or mobile is required — they are used as login credentials',
      );
    }
    await this.assertUniqueEmailMobile(dto.email, dto.mobile);

    const reporting = await this.resolveReportingAssignment(
      {
        reportingManager: dto.reportingManager,
        reportingOfficers: dto.reportingOfficers,
        reportingApprovalMode: dto.reportingApprovalMode,
      },
      authenticatedCompanyId,
    );

    await this.rolesService.assertRoleAssignmentAllowed(
      dto.roleIds ?? [],
      actorCanBypass,
    );

    const userCode = await this.numberingService.nextCode(NumberEntityType.USER);
    const employeeId = await this.resolveEmployeeId(
      dto.employeeId,
      dto.department,
      dto.designation,
    );
    const passwordHash = await hashPassword(dto.password);

    const user = await this.createUser({
      userCode,
      fullName: dto.fullName.trim(),
      email: dto.email ?? null,
      mobile: dto.mobile ?? null,
      passwordHash,
      status: dto.status ?? UserStatus.Active,
      employeeId,
      designation: dto.designation ?? null,
      department: dto.department ?? null,
      profilePhoto: dto.profilePhoto ?? null,
      assignedProjects: [],
      companyId: authenticatedCompanyId
        ? new MongooseTypes.ObjectId(authenticatedCompanyId)
        : null,
      roleIds: (dto.roleIds ?? []).map((id) => new MongooseTypes.ObjectId(id)),
      reportingManager: reporting.primary,
      reportingOfficers: reporting.officers,
      reportingApprovalMode: reporting.mode,
      mustChangePassword: true,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
    });

    if (actorId) {
      await this.userModel
        .findByIdAndUpdate(user!._id, { createdBy: new MongooseTypes.ObjectId(actorId) })
        .exec();
    }

    if (dto.assignedProjects?.length) {
      await this.projectAccessService.assignProjectsToUser(
        String(user!._id),
        dto.assignedProjects,
        actorId,
      );
    }

    const created = await this.userModel.findById(user!._id).exec();
    return createSuccessResponse(toPublicUser(created!), 'User created successfully');
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    authenticatedCompanyId?: string | null,
  ) {
    const user = await this.requireUser(id, authenticatedCompanyId);

    if (dto.email !== undefined || dto.mobile !== undefined) {
      const nextEmail = dto.email === undefined ? user.email : dto.email;
      const nextMobile = dto.mobile === undefined ? user.mobile : dto.mobile;
      if (!nextEmail?.toString().trim() && !nextMobile?.toString().trim()) {
        throw new BadRequestException(
          'Email or mobile is required — they are used as login credentials',
        );
      }
      await this.assertUniqueEmailMobile(nextEmail, nextMobile, id);
    }

    const update: Record<string, unknown> = {};
    if (dto.fullName !== undefined) update.fullName = dto.fullName.trim();
    if (dto.email !== undefined) {
      update.email = dto.email ? dto.email.trim().toLowerCase() : null;
    }
    if (dto.mobile !== undefined) {
      update.mobile = dto.mobile ? dto.mobile.trim() : null;
    }
    if (dto.designation !== undefined) update.designation = dto.designation;
    if (dto.department !== undefined) update.department = dto.department;
    if (dto.profilePhoto !== undefined) update.profilePhoto = dto.profilePhoto;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.joiningDate !== undefined) {
      update.joiningDate = dto.joiningDate ? new Date(dto.joiningDate) : null;
    }

    if (
      dto.reportingManager !== undefined ||
      dto.reportingOfficers !== undefined ||
      dto.reportingApprovalMode !== undefined
    ) {
      const reporting = await this.resolveReportingAssignment(
        {
          reportingManager:
            dto.reportingManager !== undefined
              ? dto.reportingManager
              : user.reportingManager
                ? String(user.reportingManager)
                : null,
          reportingOfficers:
            dto.reportingOfficers !== undefined
              ? dto.reportingOfficers
              : (user.reportingOfficers ?? []).map(String),
          reportingApprovalMode:
            dto.reportingApprovalMode ??
            user.reportingApprovalMode ??
            ReportingApprovalMode.Any,
        },
        authenticatedCompanyId,
        id,
      );
      update.reportingManager = reporting.primary;
      update.reportingOfficers = reporting.officers;
      update.reportingApprovalMode = reporting.mode;
    }

    // Employee ID is server-assigned from department + designation; keep once set.
    if (!user.employeeId) {
      update.employeeId = await this.resolveEmployeeId(
        null,
        dto.department !== undefined ? dto.department : user.department,
        dto.designation !== undefined ? dto.designation : user.designation,
      );
    }

    if (dto.temporaryPassword?.trim()) {
      update.passwordHash = await hashPassword(dto.temporaryPassword.trim());
      update.mustChangePassword = true;
      update.failedLoginAttempts = 0;
      update.lockUntil = null;
      update.status = UserStatus.Active;
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    if (dto.status === UserStatus.Inactive || dto.temporaryPassword?.trim()) {
      await this.sessionService.revokeAllForUser(id);
    }

    return createSuccessResponse(toPublicUser(updated!), 'User updated successfully');
  }

  async setProfilePhoto(
    id: string,
    photoPath: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireUser(id, authenticatedCompanyId);
    const updated = await this.userModel
      .findByIdAndUpdate(id, { profilePhoto: photoPath }, { new: true })
      .exec();
    return createSuccessResponse(
      toPublicUser(updated!),
      'Profile photo updated successfully',
    );
  }

  async activate(id: string, authenticatedCompanyId?: string | null) {
    await this.requireUser(id, authenticatedCompanyId);
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          status: UserStatus.Active,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
        { new: true },
      )
      .exec();
    return createSuccessResponse(toPublicUser(updated!), 'User activated successfully');
  }

  async deactivate(id: string, authenticatedCompanyId?: string | null) {
    await this.requireUser(id, authenticatedCompanyId);
    const updated = await this.userModel
      .findByIdAndUpdate(id, { status: UserStatus.Inactive }, { new: true })
      .exec();
    await this.sessionService.revokeAllForUser(id);
    return createSuccessResponse(toPublicUser(updated!), 'User deactivated successfully');
  }

  async softDeleteUser(
    id: string,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireUser(id, authenticatedCompanyId);
    const deleted = await softDeleteById(
      this.userModel,
      id,
      actorId ? new MongooseTypes.ObjectId(actorId) : null,
    );
    await this.sessionService.revokeAllForUser(id);
    return createSuccessResponse(
      deleted ? toPublicUser(deleted as never) : null,
      'User deleted successfully',
    );
  }

  async adminResetPassword(
    id: string,
    dto: AdminResetPasswordDto,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireUser(id, authenticatedCompanyId);
    const passwordHash = await hashPassword(dto.newPassword);
    await this.userModel
      .findByIdAndUpdate(id, {
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        status: UserStatus.Active,
      })
      .exec();
    await this.sessionService.revokeAllForUser(id);
    return createSuccessResponse(
      null,
      'Temporary password set — user must change it on next login',
    );
  }

  async changeOwnPassword(
    userId: string,
    newPassword: string,
    currentPassword?: string,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select('+passwordHash')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const forced = Boolean(user.mustChangePassword);
    if (!forced) {
      if (!currentPassword?.trim()) {
        throw new BadRequestException('Current password is required');
      }
      const ok = await verifyPassword(
        user.passwordHash,
        currentPassword.trim(),
      );
      if (!ok) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    if (
      currentPassword?.trim() &&
      currentPassword.trim() === newPassword.trim()
    ) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    // When forcing a first-time change, reject reuse of the temporary password.
    if (forced) {
      const reusesTemp = await verifyPassword(
        user.passwordHash,
        newPassword.trim(),
      );
      if (reusesTemp) {
        throw new BadRequestException(
          'New password must be different from the temporary password',
        );
      }
    }

    const passwordHash = await hashPassword(newPassword.trim());
    await this.userModel
      .findByIdAndUpdate(userId, {
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockUntil: null,
        status: UserStatus.Active,
      })
      .exec();
    await this.sessionService.revokeAllForUser(userId);
    return createSuccessResponse(
      null,
      'Password updated successfully — please sign in again',
    );
  }

  async assignRoles(
    id: string,
    dto: AssignRolesDto,
    actorCanBypass = false,
    authenticatedCompanyId?: string | null,
  ) {
    const user = await this.requireUser(id, authenticatedCompanyId);
    await this.rolesService.assertRoleReplacementAllowed(
      (user.roleIds ?? []).map(String),
      dto.roleIds,
      actorCanBypass,
    );
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { roleIds: dto.roleIds.map((roleId) => new MongooseTypes.ObjectId(roleId)) },
        { new: true },
      )
      .exec();
    return createSuccessResponse(toPublicUser(updated!), 'Roles assigned successfully');
  }

  async assignProjects(
    id: string,
    dto: AssignProjectsDto,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireUser(id, authenticatedCompanyId);
    await this.projectAccessService.assignProjectsToUser(id, dto.projectIds, actorId);
    const updated = await this.userModel.findById(id).exec();
    return createSuccessResponse(toPublicUser(updated!), 'Projects assigned successfully');
  }

  async removeProjects(
    id: string,
    dto: RemoveProjectsDto,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireUser(id, authenticatedCompanyId);
    await this.projectAccessService.removeProjectsFromUser(id, dto.projectIds, actorId);
    const updated = await this.userModel.findById(id).exec();
    return createSuccessResponse(toPublicUser(updated!), 'Projects removed successfully');
  }

  async getById(id: string, authenticatedCompanyId?: string | null) {
    const user = await this.requireUser(id, authenticatedCompanyId);
    return createSuccessResponse(toPublicUser(user), 'User retrieved successfully');
  }

  async list(
    query: ListUsersQueryDto,
    authenticatedCompanyId?: string | null,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = ALLOWED_SORT_FIELDS.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const filter = this.buildListFilter(query);
    Object.assign(
      filter,
      await this.buildCompanyFilter(authenticatedCompanyId),
    );
    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicUser(item)),
      'Users retrieved successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async recordSuccessfulLogin(userId: Types.ObjectId | string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLoginAt: new Date(),
          status: UserStatus.Active,
        },
        { new: true },
      )
      .exec();
  }

  async recordFailedLogin(
    userId: Types.ObjectId | string,
    maxAttempts: number,
    lockMinutes: number,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return null;
    }

    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const update: Record<string, unknown> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= maxAttempts) {
      update.lockUntil = new Date(Date.now() + lockMinutes * 60_000);
      update.status = UserStatus.Locked;
    }

    return this.userModel.findByIdAndUpdate(userId, update, { new: true }).exec();
  }

  async updatePassword(userId: Types.ObjectId | string, passwordHash: string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          passwordHash,
          failedLoginAttempts: 0,
          lockUntil: null,
          status: UserStatus.Active,
        },
        { new: true },
      )
      .exec();
  }

  private buildListFilter(query: ListUsersQueryDto): FilterQuery<User> {
    const filter: FilterQuery<User> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.department) {
      filter.department = query.department.trim();
    }
    if (query.projectId) {
      filter.assignedProjects = new MongooseTypes.ObjectId(query.projectId);
    }
    if (query.roleId) {
      filter.roleIds = new MongooseTypes.ObjectId(query.roleId);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      filter.$or = [
        { fullName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } },
        { employeeId: { $regex: term, $options: 'i' } },
        { userCode: { $regex: term, $options: 'i' } },
      ];
    }

    return filter;
  }

  private async resolveReportingAssignment(
    input: {
      reportingManager?: string | null;
      reportingOfficers?: string[] | null;
      reportingApprovalMode?: ReportingApprovalMode | string | null;
    },
    authenticatedCompanyId?: string | null,
    selfUserId?: string,
  ): Promise<{
    primary: Types.ObjectId | null;
    officers: Types.ObjectId[];
    mode: ReportingApprovalMode;
  }> {
    const mode =
      input.reportingApprovalMode === ReportingApprovalMode.All
        ? ReportingApprovalMode.All
        : ReportingApprovalMode.Any;

    const officerIds = [
      ...new Set(
        [
          ...(input.reportingOfficers ?? []),
          ...(input.reportingManager ? [input.reportingManager] : []),
        ]
          .map((id) => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (selfUserId && officerIds.includes(selfUserId)) {
      throw new BadRequestException(
        'User cannot be their own reporting officer',
      );
    }

    for (const officerId of officerIds) {
      await this.assertUserExists(officerId, authenticatedCompanyId);
    }

    let primaryId = input.reportingManager?.trim() || null;
    if (primaryId && !officerIds.includes(primaryId)) {
      officerIds.unshift(primaryId);
    }
    if (!primaryId && officerIds.length > 0) {
      primaryId = officerIds[0]!;
    }
    if (primaryId && !officerIds.includes(primaryId)) {
      throw new BadRequestException(
        'Primary reporting officer must be one of the selected officers',
      );
    }

    return {
      primary: primaryId ? new MongooseTypes.ObjectId(primaryId) : null,
      officers: officerIds.map((id) => new MongooseTypes.ObjectId(id)),
      mode,
    };
  }

  /**
   * Prefer an explicit employeeId; otherwise allocate
   * `{DEPT}-{DESIG}-{######}` from the EMPLOYEE counter.
   */
  private async resolveEmployeeId(
    explicit: string | null | undefined,
    department: string | null | undefined,
    designation: string | null | undefined,
  ): Promise<string> {
    const trimmed = explicit?.trim();
    if (trimmed) return trimmed;

    const allocated = await this.numberingService.next(
      NumberEntityType.EMPLOYEE,
    );
    return formatEmployeeId(department, designation, allocated.sequence);
  }

  private async buildCompanyFilter(
    authenticatedCompanyId?: string | null,
  ): Promise<FilterQuery<User>> {
    if (authenticatedCompanyId === undefined) {
      return {};
    }
    if (
      !authenticatedCompanyId ||
      !MongooseTypes.ObjectId.isValid(authenticatedCompanyId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    const companyObjectId = new MongooseTypes.ObjectId(
      authenticatedCompanyId,
    );
    const primaryCompany = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    const isPrimaryCompany =
      Boolean(primaryCompany?._id) &&
      String(primaryCompany?._id) === authenticatedCompanyId;

    return {
      companyId: isPrimaryCompany
        ? { $in: [companyObjectId, null] }
        : companyObjectId,
    };
  }

  private async requireUser(
    id: string,
    authenticatedCompanyId?: string | null,
  ) {
    if (!MongooseTypes.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }
    const user = await this.userModel
      .findOne({
        _id: new MongooseTypes.ObjectId(id),
        ...(await this.buildCompanyFilter(authenticatedCompanyId)),
      })
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async assertUserExists(
    id: string,
    authenticatedCompanyId?: string | null,
  ) {
    const user = await this.requireUser(id, authenticatedCompanyId).catch(
      () => null,
    );
    if (!user) {
      throw new BadRequestException('Reporting manager not found');
    }
  }

  private async assertUniqueEmailMobile(
    email?: string | null,
    mobile?: string | null,
    excludeUserId?: string,
  ) {
    if (email) {
      const existing = await this.userModel
        .findOne({
          email: email.trim().toLowerCase(),
          ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
        })
        .exec();
      if (existing) {
        throw new ConflictException('Email is already in use');
      }
    }

    if (mobile) {
      const existing = await this.userModel
        .findOne({
          mobile: mobile.trim(),
          ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
        })
        .exec();
      if (existing) {
        throw new ConflictException('Mobile number is already in use');
      }
    }
  }
}
