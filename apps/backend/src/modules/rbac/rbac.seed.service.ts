import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  PETTY_CASH_REQUEST_CREATOR_ROLE_CODES,
  ROLE_SEEDS,
} from './role.seed';
import { Role } from './schemas/role.schema';

@Injectable()
export class RbacSeedService implements OnModuleInit {
  private readonly logger = new Logger(RbacSeedService.name);

  constructor(@InjectModel(Role.name) private readonly roleModel: Model<Role>) {}

  async onModuleInit(): Promise<void> {
    await this.seedRoles();
  }

  /**
   * Upserts system roles by code. Custom roles are left untouched.
   * On update: metadata is refreshed from seed, and permissions are the
   * union of seed + existing so catalog additions apply without wiping
   * permissions granted in the UI.
   *
   * After upsert, `petty_cash.request` is revoked from system roles that are
   * not site request creators (union alone cannot remove stale grants).
   */
  async seedRoles(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const seed of ROLE_SEEDS) {
      const existing = await this.roleModel
        .findOne({ code: seed.code })
        .setOptions({ withDeleted: true })
        .exec();

      if (!existing) {
        await this.roleModel.create({
          code: seed.code,
          name: seed.name,
          description: seed.description,
          permissions: [...seed.permissions],
          bypassPermissions: Boolean(seed.bypassPermissions),
          isSystem: true,
          status: seed.status,
        });
        created += 1;
        continue;
      }

      const permissions = [
        ...new Set([...(existing.permissions ?? []), ...seed.permissions]),
      ].sort();

      await this.roleModel
        .updateOne(
          { _id: existing._id },
          {
            $set: {
              name: seed.name,
              description: seed.description,
              permissions,
              bypassPermissions: Boolean(seed.bypassPermissions),
              isSystem: true,
              status: seed.status,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
            },
          },
        )
        .setOptions({ withDeleted: true })
        .exec();
      updated += 1;
    }

    const revoked = await this.revokePettyCashRequestFromNonCreators();
    this.logger.log(
      `RBAC seed complete: ${created} created, ${updated} updated (${ROLE_SEEDS.length} system roles)` +
        (revoked > 0
          ? `; revoked petty_cash.request from ${revoked} system role(s)`
          : ''),
    );

    return { created, updated };
  }

  /**
   * Site supervisors / engineers create requests; MD / Director / finance approve.
   * Custom (non-system) roles are left as configured in RBAC admin.
   */
  private async revokePettyCashRequestFromNonCreators(): Promise<number> {
    const result = await this.roleModel
      .updateMany(
        {
          isSystem: true,
          bypassPermissions: { $ne: true },
          code: { $nin: [...PETTY_CASH_REQUEST_CREATOR_ROLE_CODES] },
          permissions: 'petty_cash.request',
        },
        { $pull: { permissions: 'petty_cash.request' } },
      )
      .setOptions({ withDeleted: true })
      .exec();

    return result.modifiedCount ?? 0;
  }
}
