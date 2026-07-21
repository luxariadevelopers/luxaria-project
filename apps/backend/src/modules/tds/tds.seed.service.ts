import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { DEFAULT_TDS_SECTIONS } from './tds.seed';
import { TdsSection, TdsSectionStatus } from './schemas/tds-section.schema';

@Injectable()
export class TdsSeedService implements OnModuleInit {
  private readonly logger = new Logger(TdsSeedService.name);

  constructor(
    @InjectModel(TdsSection.name)
    private readonly sectionModel: Model<TdsSection>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const result = await this.seedDefaultSections();
      if (result.created > 0) {
        this.logger.log(`Seeded ${result.created} default TDS section(s)`);
      }
    } catch (error) {
      this.logger.warn(
        `TDS section seed skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async seedDefaultSections(): Promise<{ created: number; total: number }> {
    let created = 0;

    for (const seed of DEFAULT_TDS_SECTIONS) {
      const sectionCode = seed.sectionCode.toUpperCase();
      const existing = await this.sectionModel
        .findOne({ sectionCode })
        .exec();
      if (existing) continue;

      await this.sectionModel.create({
        sectionCode,
        name: seed.name,
        ratePercent: seed.ratePercent,
        thresholdAmount: seed.thresholdAmount,
        status: TdsSectionStatus.Active,
        notes: seed.notes,
        createdBy: null,
      });
      created += 1;
    }

    return { created, total: DEFAULT_TDS_SECTIONS.length };
  }
}
