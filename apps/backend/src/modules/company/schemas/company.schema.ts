import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { AddressEmbed, AddressEmbedSchema } from './address.embed';

export type CompanyDocument = HydratedDocument<Company>;

export enum CompanyStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Schema({
  collection: 'companies',
  timestamps: true,
})
export class Company {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  companyCode!: string;

  @Prop({ required: true, trim: true })
  legalName!: string;

  @Prop({ required: true, trim: true })
  tradeName!: string;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  cin!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  pan!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  tan!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  gstin!: string | null;

  @Prop({ type: AddressEmbedSchema, required: true })
  registeredAddress!: AddressEmbed;

  @Prop({ type: AddressEmbedSchema, required: true })
  corporateAddress!: AddressEmbed;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, default: null })
  website!: string | null;

  /** Current authorised share capital (INR). Historical values live in capital history. */
  @Prop({ type: Number, required: true, min: 0 })
  authorisedShareCapital!: number;

  /** Current paid-up share capital (INR). */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  paidUpShareCapital!: number;

  /** Month number 1–12 when financial year starts (India default: April = 4). */
  @Prop({ type: Number, required: true, min: 1, max: 12, default: 4 })
  financialYearStartMonth!: number;

  /** Relative path or URL to logo file */
  @Prop({ type: String, trim: true, default: null })
  logo!: string | null;

  @Prop({ type: String, enum: CompanyStatus, default: CompanyStatus.Active, index: true })
  status!: CompanyStatus;

  /**
   * Marks the default company for single-tenant mode.
   * Schema supports multiple companies later; only one may be primary.
   */
  @Prop({ type: Boolean, default: false })
  isPrimary!: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.plugin(baseSchemaPlugin);
CompanySchema.plugin(softDeletePlugin);

CompanySchema.index(
  { isPrimary: 1 },
  {
    name: 'primary_company_unique',
    unique: true,
    partialFilterExpression: { isPrimary: true, isDeleted: false },
  },
);

CompanySchema.index({ legalName: 1 });
CompanySchema.index({ status: 1, isDeleted: 1 });
