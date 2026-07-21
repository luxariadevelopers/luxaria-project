import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ProjectFinancialConfigEmbed {
  @Prop({ type: [String], default: [] })
  costCentreCodes!: string[];

  @Prop({ type: String, trim: true, default: null })
  profitCentreCode!: string | null;

  @Prop({ type: Number, default: null, min: 0 })
  defaultGstPercent!: number | null;

  @Prop({ type: String, trim: true, default: null })
  defaultCurrency!: string | null;

  @Prop({ type: String, trim: true, default: null })
  taxNotes!: string | null;

  @Prop({ type: [String], default: [] })
  budgetCategories!: string[];
}

export const ProjectFinancialConfigEmbedSchema = SchemaFactory.createForClass(
  ProjectFinancialConfigEmbed,
);

export function defaultProjectFinancialConfig(): ProjectFinancialConfigEmbed {
  return {
    costCentreCodes: [],
    profitCentreCode: null,
    defaultGstPercent: null,
    defaultCurrency: null,
    taxNotes: null,
    budgetCategories: [],
  };
}
