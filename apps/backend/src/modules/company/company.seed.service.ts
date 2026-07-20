import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { LUXARIA_COMPANY_SEED } from './company.seed';
import {
  CompanyAddressHistory,
  CompanyAddressType,
} from './schemas/company-address-history.schema';
import {
  CompanyCapitalHistory,
  CompanyCapitalType,
} from './schemas/company-capital-history.schema';
import { Company } from './schemas/company.schema';

@Injectable()
export class CompanySeedService implements OnModuleInit {
  private readonly logger = new Logger(CompanySeedService.name);

  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(CompanyAddressHistory.name)
    private readonly addressHistoryModel: Model<CompanyAddressHistory>,
    @InjectModel(CompanyCapitalHistory.name)
    private readonly capitalHistoryModel: Model<CompanyCapitalHistory>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPrimaryCompany();
  }

  /**
   * Ensures the primary Luxaria company exists once.
   * Does not overwrite capital history or address history after first seed.
   */
  async seedPrimaryCompany(): Promise<{ created: boolean; companyId: string }> {
    const existing = await this.companyModel
      .findOne({
        $or: [
          { isPrimary: true },
          { companyCode: LUXARIA_COMPANY_SEED.companyCode },
          { legalName: LUXARIA_COMPANY_SEED.legalName },
        ],
      })
      .setOptions({ withDeleted: true })
      .exec();

    if (existing) {
      await this.companyModel
        .updateOne(
          { _id: existing._id },
          {
            $set: {
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              isPrimary: true,
              status: LUXARIA_COMPANY_SEED.status,
            },
          },
        )
        .setOptions({ withDeleted: true })
        .exec();
      this.logger.log(
        `Company seed skipped (already present): ${existing.companyCode}`,
      );
      return { created: false, companyId: String(existing._id) };
    }

    const company = await this.companyModel.create({
      ...LUXARIA_COMPANY_SEED,
      registeredAddress: { ...LUXARIA_COMPANY_SEED.registeredAddress },
      corporateAddress: { ...LUXARIA_COMPANY_SEED.corporateAddress },
    });

    const effectiveFrom = new Date();

    await this.addressHistoryModel.create([
      {
        companyId: company._id,
        addressType: CompanyAddressType.Registered,
        address: { ...LUXARIA_COMPANY_SEED.registeredAddress },
        effectiveFrom,
        effectiveTo: null,
        changeReason: 'Initial seed',
      },
      {
        companyId: company._id,
        addressType: CompanyAddressType.Corporate,
        address: { ...LUXARIA_COMPANY_SEED.corporateAddress },
        effectiveFrom,
        effectiveTo: null,
        changeReason: 'Initial seed',
      },
    ]);

    await this.capitalHistoryModel.create([
      {
        companyId: company._id,
        capitalType: CompanyCapitalType.Authorised,
        previousAmount: 0,
        newAmount: LUXARIA_COMPANY_SEED.authorisedShareCapital,
        effectiveFrom,
        changeReason: 'Initial authorised share capital',
        reference: 'SEED',
      },
      {
        companyId: company._id,
        capitalType: CompanyCapitalType.PaidUp,
        previousAmount: 0,
        newAmount: LUXARIA_COMPANY_SEED.paidUpShareCapital,
        effectiveFrom,
        changeReason: 'Initial paid-up share capital',
        reference: 'SEED',
      },
    ]);

    this.logger.log(
      `Seeded primary company ${company.companyCode} with authorised capital ₹${LUXARIA_COMPANY_SEED.authorisedShareCapital.toLocaleString('en-IN')}`,
    );

    return { created: true, companyId: String(company._id) };
  }
}
