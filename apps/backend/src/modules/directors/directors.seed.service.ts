import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  DEFAULT_FACE_VALUE,
  DIRECTOR_PLACEHOLDER_SEEDS,
  PERCENTAGE_PER_DIRECTOR,
  SHARES_PER_DIRECTOR,
} from './directors.seed';
import { CompanyShareholding } from './schemas/company-shareholding.schema';
import { Director, DirectorStatus } from './schemas/director.schema';

@Injectable()
export class DirectorsSeedService implements OnModuleInit {
  private readonly logger = new Logger(DirectorsSeedService.name);

  constructor(
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(CompanyShareholding.name)
    private readonly shareholdingModel: Model<CompanyShareholding>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly numberingService: NumberingService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPlaceholderDirectors();
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
}
