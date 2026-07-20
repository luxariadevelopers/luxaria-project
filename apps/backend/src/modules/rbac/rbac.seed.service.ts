import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { ROLE_SEEDS } from './role.seed';
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
   * Permissions on system roles are refreshed from seed on each boot
   * so catalog updates propagate without wiping custom roles.
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

      await this.roleModel
        .updateOne(
          { _id: existing._id },
          {
            $set: {
              name: seed.name,
              description: seed.description,
              permissions: [...seed.permissions],
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

    this.logger.log(
      `RBAC seed complete: ${created} created, ${updated} updated (${ROLE_SEEDS.length} system roles)`,
    );

    return { created, updated };
  }
}
