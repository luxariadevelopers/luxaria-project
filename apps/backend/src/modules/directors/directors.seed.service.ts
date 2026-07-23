import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { hashPassword } from '../../common/utils/crypto.util';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Role } from '../rbac/schemas/role.schema';
import { formatEmployeeId } from '../users/employee-id';
import { User, UserStatus } from '../users/schemas/user.schema';
import {
  DEFAULT_FACE_VALUE,
  DIRECTOR_PLACEHOLDER_SEEDS,
  PERCENTAGE_PER_DIRECTOR,
  SHARES_PER_DIRECTOR,
} from './directors.seed';
import { CompanyShareholding } from './schemas/company-shareholding.schema';
import { Director, DirectorStatus } from './schemas/director.schema';

/** Temporary password for auto-linked director logins — must change on first sign-in. */
const DIRECTOR_SEED_PASSWORD = 'Director@ChangeMe1';

/**
 * Preferred existing logins for known directors (do not auto-create a second user).
 * Gold Jeniston uses the primary MD account already created in this environment.
 */
const PREFERRED_DIRECTOR_LOGIN_EMAIL: Record<string, string> = {
  'DIR-0001': 'jenigoldjeni@gmail.com',
};

@Injectable()
export class DirectorsSeedService implements OnModuleInit {
  private readonly logger = new Logger(DirectorsSeedService.name);

  constructor(
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(CompanyShareholding.name)
    private readonly shareholdingModel: Model<CompanyShareholding>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly numberingService: NumberingService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPlaceholderDirectors();
    await this.ensureDirectorUserLinks();
    await this.ensureLinkedUsersHaveCodes();
  }

  /**
   * Seeds four placeholder directors with 25% company shareholding each.
   * Does not touch project investment data.
   */
  async seedPlaceholderDirectors(): Promise<{ created: boolean }> {
    const existingPlaceholders = await this.directorModel
      .countDocuments({ isPlaceholder: true })
      .exec();
    if (existingPlaceholders >= 4) {
      this.logger.log('Director/shareholding seed skipped (placeholders already present)');
      return { created: false };
    }

    const company = await this.companyModel.findOne({ isPrimary: true }).lean().exec();
    if (!company) {
      this.logger.warn('Director seed deferred: primary company not found yet');
      return { created: false };
    }

    const companyId = company._id as Types.ObjectId;
    const appointmentDate = new Date();
    const directors: Array<{ _id: Types.ObjectId }> = [];

    for (const seed of DIRECTOR_PLACEHOLDER_SEEDS) {
      const existing = await this.directorModel
        .findOne({ din: seed.din })
        .setOptions({ withDeleted: true })
        .exec();
      if (existing) {
        directors.push({ _id: existing._id as Types.ObjectId });
        continue;
      }

      const directorCode = await this.numberingService.nextCode(NumberEntityType.DIRECTOR);
      const created = await this.directorModel.create({
        companyId,
        directorCode,
        userId: null,
        fullName: seed.fullName,
        din: seed.din,
        pan: seed.pan,
        email: seed.email,
        phone: seed.phone,
        address: null,
        appointmentDate,
        status: DirectorStatus.Active,
        isPlaceholder: true,
      });
      directors.push({ _id: created._id as Types.ObjectId });
    }

    const activeHoldings = await this.shareholdingModel
      .countDocuments({ companyId, effectiveTo: null })
      .exec();

    if (activeHoldings === 0 && directors.length === 4) {
      const effectiveFrom = appointmentDate;
      await this.shareholdingModel.insertMany(
        directors.map((director) => ({
          companyId,
          directorId: director._id,
          effectiveFrom,
          effectiveTo: null,
          numberOfShares: SHARES_PER_DIRECTOR,
          faceValue: DEFAULT_FACE_VALUE,
          percentage: PERCENTAGE_PER_DIRECTOR,
          approvalReference: 'SEED-INITIAL-25PCT',
          documentId: null,
          version: 1,
          changeRequestId: null,
        })),
      );
      this.logger.log(
        'Seeded 4 placeholder directors with 25% company shareholding each (version 1)',
      );
    } else {
      this.logger.log('Director placeholders ensured; shareholding already present');
    }

    return { created: true };
  }

  /**
   * Every active director must have a linked system user.
   * Creates a Director-role user when none exists for that director.
   */
  async ensureDirectorUserLinks(): Promise<void> {
    const directors = await this.directorModel
      .find({
        status: DirectorStatus.Active,
        $or: [{ userId: null }, { userId: { $exists: false } }],
      })
      .exec();
    if (!directors.length) {
      return;
    }

    const directorRole = await this.roleModel
      .findOne({ code: 'DIRECTOR' })
      .select('_id')
      .lean()
      .exec();
    const roleIds = directorRole?._id
      ? [directorRole._id as Types.ObjectId]
      : [];
    const passwordHash = await hashPassword(DIRECTOR_SEED_PASSWORD);
    let linked = 0;

    for (const director of directors) {
      const userId = await this.resolveOrCreateUserForDirector(
        director,
        roleIds,
        passwordHash,
      );
      if (!userId) continue;
      director.userId = userId;
      await director.save();
      linked += 1;
    }

    if (linked > 0) {
      this.logger.log(
        `Linked ${linked} director(s) to system users (temp password requires change on login)`,
      );
    }
  }

  private async resolveOrCreateUserForDirector(
    director: Director & { _id: Types.ObjectId },
    roleIds: Types.ObjectId[],
    passwordHash: string,
  ): Promise<Types.ObjectId | null> {
    const preferredEmail =
      PREFERRED_DIRECTOR_LOGIN_EMAIL[director.directorCode]?.toLowerCase() ??
      null;
    const email = preferredEmail ?? director.email?.trim().toLowerCase() ?? null;

    if (preferredEmail) {
      const preferred = await this.userModel
        .findOne({ email: preferredEmail, status: UserStatus.Active })
        .select('_id')
        .lean()
        .exec();
      if (
        preferred &&
        (await this.isUserFree(preferred._id as Types.ObjectId, director._id))
      ) {
        if (director.email?.toLowerCase() !== preferredEmail) {
          await this.directorModel
            .updateOne(
              { _id: director._id },
              { $set: { email: preferredEmail } },
            )
            .exec();
          director.email = preferredEmail;
        }
        return preferred._id as Types.ObjectId;
      }
    }

    if (email) {
      const byEmail = await this.userModel
        .findOne({ email })
        .select('_id')
        .lean()
        .exec();
      if (
        byEmail &&
        (await this.isUserFree(byEmail._id as Types.ObjectId, director._id))
      ) {
        return byEmail._id as Types.ObjectId;
      }
    }

    // Prefer an unlinked active user whose name overlaps the director name.
    const nameToken = director.fullName
      .split(/\s+/)
      .map((p) => p.replace(/[^A-Za-z]/g, ''))
      .filter((p) => p.length >= 4)
      .sort((a, b) => b.length - a.length)[0];
    if (nameToken) {
      const byName = await this.userModel
        .findOne({
          status: UserStatus.Active,
          fullName: { $regex: nameToken, $options: 'i' },
        })
        .select('_id')
        .lean()
        .exec();
      if (
        byName &&
        (await this.isUserFree(byName._id as Types.ObjectId, director._id))
      ) {
        return byName._id as Types.ObjectId;
      }
    }

    if (!email) {
      this.logger.warn(
        `Cannot auto-link director ${director.directorCode}: no email to create a user`,
      );
      return null;
    }

    const userCode = await this.numberingService.nextCode(NumberEntityType.USER);
    const employeeSeq = await this.numberingService.next(NumberEntityType.EMPLOYEE);
    const employeeId = formatEmployeeId('Board', 'Director', employeeSeq.sequence);
    const created = await this.userModel.create({
      userCode,
      fullName: director.fullName,
      email,
      mobile: director.phone ?? null,
      passwordHash,
      status: UserStatus.Active,
      companyId: director.companyId,
      roleIds,
      mustChangePassword: true,
      designation: 'Director',
      department: 'Board',
      employeeId,
    });
    return created._id as Types.ObjectId;
  }

  /** Ensure linked director users expose USR-/employee codes (never raw Mongo ids). */
  private async ensureLinkedUsersHaveCodes(): Promise<void> {
    const directors = await this.directorModel
      .find({
        status: DirectorStatus.Active,
        userId: { $ne: null },
      })
      .select('userId')
      .lean()
      .exec();
    const userIds = directors
      .map((d) => d.userId)
      .filter((id): id is Types.ObjectId => Boolean(id));
    if (!userIds.length) return;

    const users = await this.userModel
      .find({
        _id: { $in: userIds },
        $or: [
          { employeeId: null },
          { employeeId: { $exists: false } },
          { employeeId: '' },
        ],
      })
      .exec();

    let updated = 0;
    for (const user of users) {
      const employeeSeq = await this.numberingService.next(
        NumberEntityType.EMPLOYEE,
      );
      user.employeeId = formatEmployeeId(
        user.department ?? 'Board',
        user.designation ?? 'Director',
        employeeSeq.sequence,
      );
      if (!user.department) user.department = 'Board';
      if (!user.designation) user.designation = 'Director';
      await user.save();
      updated += 1;
    }
    if (updated > 0) {
      this.logger.log(`Assigned employee IDs to ${updated} director-linked user(s)`);
    }
  }

  private async isUserFree(
    userId: Types.ObjectId,
    excludeDirectorId?: Types.ObjectId,
  ): Promise<boolean> {
    const filter: { userId: Types.ObjectId; _id?: { $ne: Types.ObjectId } } = {
      userId,
    };
    if (excludeDirectorId) {
      filter._id = { $ne: excludeDirectorId };
    }
    const linked = await this.directorModel
      .findOne(filter)
      .select('_id')
      .lean()
      .exec();
    return !linked;
  }
}
