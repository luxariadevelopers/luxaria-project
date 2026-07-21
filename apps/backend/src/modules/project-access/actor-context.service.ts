import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import {
  Employee,
  EMPLOYEE_LOGIN_ALLOWED_STATUSES,
} from '../employees/schemas/employee.schema';
import { PermissionsService } from '../rbac/permissions.service';
import { SiteAccessService } from '../sites/site-access.service';
import { User, UserStatus } from '../users/schemas/user.schema';
import type { AuthenticatedActorContext } from './authenticated-actor.context';
import { InvestorParticipationService } from './investor-participation.service';
import { ProjectAccessService } from './project-access.service';
import type { SystemExecutionContext } from './system-execution-context';

type CacheEntry = {
  expiresAt: number;
  value: AuthenticatedActorContext;
};

const ACTOR_CACHE_TTL_MS = 30_000;

@Injectable()
export class ActorContextService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<Employee>,
    private readonly permissionsService: PermissionsService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly investorParticipationService: InvestorParticipationService,
    @Inject(forwardRef(() => SiteAccessService))
    private readonly siteAccessService: SiteAccessService,
  ) {}

  /** Invalidate cached actor context (membership / assignment changes). */
  invalidate(actorId: string): void {
    this.cache.delete(actorId);
  }

  async resolvePrimaryCompanyId(): Promise<string> {
    const company = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    if (!company) {
      throw new UnauthorizedException('Primary company is not configured');
    }
    return String(company._id);
  }

  /**
   * Resolve authoritative actor context for a user id.
   * Company membership: user.companyId when set, otherwise primary company.
   */
  async resolveForUser(
    userId: string,
    options?: { skipCache?: boolean },
  ): Promise<AuthenticatedActorContext> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Invalid actor');
    }

    if (!options?.skipCache) {
      const hit = this.cache.get(userId);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }
    }

    const user = await this.userModel
      .findById(userId)
      .select('_id status companyId roleIds')
      .lean()
      .exec();
    if (!user) {
      throw new UnauthorizedException('User is not authorized');
    }
    if (user.status !== UserStatus.Active) {
      throw new UnauthorizedException('User is not authorized');
    }

    const employee = await this.employeeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('_id status departmentId designationId reportingManagerUserId')
      .lean()
      .exec();

    if (
      employee &&
      !EMPLOYEE_LOGIN_ALLOWED_STATUSES.includes(employee.status)
    ) {
      throw new UnauthorizedException('Employee is not authorised to access');
    }

    const primaryCompanyId = await this.resolvePrimaryCompanyId();
    const companyId = user.companyId
      ? String(user.companyId)
      : primaryCompanyId;

    // Revoked / unknown company membership fails closed.
    const company = await this.companyModel
      .findById(companyId)
      .select('_id status')
      .lean()
      .exec();
    if (!company) {
      throw new ForbiddenException('Access denied');
    }

    const rbac = await this.permissionsService.resolveUserAccess(userId);
    const projectAccess =
      await this.projectAccessService.listAccessibleProjectIds(userId);
    const investorId =
      await this.investorParticipationService.resolveLinkedInvestorId(userId);
    const siteAccess =
      await this.siteAccessService.listAuthorisedSiteIds(userId);

    const context: AuthenticatedActorContext = {
      actorId: userId,
      userId,
      actorType: investorId ? 'investor' : 'user',
      companyId,
      status: user.status,
      roleIds: (user.roleIds ?? []).map((id) => String(id)),
      permissions: rbac.permissions ?? [],
      bypassPermissions: Boolean(rbac.bypassPermissions),
      globalAccess: Boolean(
        projectAccess.globalAccess || rbac.bypassPermissions,
      ),
      authorisedProjectIds: projectAccess.projectIds,
      authorisedSiteIds: siteAccess.siteIds,
      employeeId: employee ? String(employee._id) : null,
      departmentId: employee?.departmentId
        ? String(employee.departmentId)
        : null,
      designationId: employee?.designationId
        ? String(employee.designationId)
        : null,
      reportingManagerId: employee?.reportingManagerUserId
        ? String(employee.reportingManagerUserId)
        : null,
      investorId,
      systemContext: null,
    };

    this.cache.set(userId, {
      value: context,
      expiresAt: Date.now() + ACTOR_CACHE_TTL_MS,
    });
    return context;
  }

  /** Explicit system job context — never constructable from a normal user path. */
  asSystem(
    system: SystemExecutionContext,
    companyId: string,
  ): AuthenticatedActorContext {
    return {
      actorId: `system:${system.jobName}`,
      userId: undefined,
      actorType: 'system',
      companyId,
      status: 'active',
      roleIds: [],
      permissions: [],
      bypassPermissions: false,
      globalAccess: false,
      authorisedProjectIds: system.projectId ? [system.projectId] : [],
      authorisedSiteIds: [],
      employeeId: null,
      departmentId: null,
      designationId: null,
      reportingManagerId: null,
      investorId: null,
      systemContext: system,
    };
  }
}
