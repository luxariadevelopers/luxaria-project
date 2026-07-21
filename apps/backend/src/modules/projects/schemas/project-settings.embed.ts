import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ProjectSettingsEmbed {
  @Prop({ type: Boolean, default: true })
  dprEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  labourEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  inventoryEnabled!: boolean;

  @Prop({ type: Boolean, default: false })
  equipmentEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  procurementEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  pettyCashEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  boqEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  billingEnabled!: boolean;

  @Prop({ type: Boolean, default: true })
  customerBookingEnabled!: boolean;
}

export const ProjectSettingsEmbedSchema =
  SchemaFactory.createForClass(ProjectSettingsEmbed);

export function defaultProjectSettings(): ProjectSettingsEmbed {
  return {
    dprEnabled: true,
    labourEnabled: true,
    inventoryEnabled: true,
    equipmentEnabled: false,
    procurementEnabled: true,
    pettyCashEnabled: true,
    boqEnabled: true,
    billingEnabled: true,
    customerBookingEnabled: true,
  };
}
