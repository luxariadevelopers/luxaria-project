import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import { DepartmentsService } from './departments.service';
import { DesignationsService } from './designations.service';
import { DEPARTMENT_SEEDS, DESIGNATION_SEEDS } from './employees.seed';

/**
 * Idempotent org-structure seed for the primary company (and any company
 * that already has no departments). Similar boot pattern to RbacSeedService.
 */
@Injectable()
export class EmployeesSeedService implements OnModuleInit {
  private readonly logger = new Logger(EmployeesSeedService.name);

  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly departmentsService: DepartmentsService,
    private readonly designationsService: DesignationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedPrimaryCompany();
    } catch (error) {
      this.logger.warn(
        `Employee org seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async seedForCompany(companyId: string): Promise<{
    departments: number;
    designations: number;
  }> {
    if (!Types.ObjectId.isValid(companyId)) {
      return { departments: 0, designations: 0 };
    }

    let departments = 0;
    const departmentIds = new Map<string, string>();

    for (const seed of DEPARTMENT_SEEDS) {
      const row = await this.departmentsService.ensureByCode(
        companyId,
        seed.code,
        seed.name,
        seed.description ?? null,
      );
      departmentIds.set(seed.code, String(row._id));
      departments += 1;
    }

    let designations = 0;
    for (const seed of DESIGNATION_SEEDS) {
      const departmentId = departmentIds.get(seed.departmentCode) ?? null;
      await this.designationsService.ensureByCode({
        companyId,
        code: seed.code,
        name: seed.name,
        departmentId,
        defaultRoleCode: seed.defaultRoleCode ?? null,
        reportingLevel: seed.reportingLevel ?? null,
        mobileEligible: seed.mobileEligible ?? false,
      });
      designations += 1;
    }

    return { departments, designations };
  }

  private async seedPrimaryCompany(): Promise<void> {
    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    if (!primary) {
      this.logger.debug('No primary company — skipping employee org seed');
      return;
    }

    const result = await this.seedForCompany(String(primary._id));
    this.logger.log(
      `Employee org seed complete for primary company: ${result.departments} departments, ${result.designations} designations`,
    );
  }
}
