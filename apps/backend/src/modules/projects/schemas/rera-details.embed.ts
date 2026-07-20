import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ReraDetailsEmbed {
  @Prop({ type: String, trim: true, uppercase: true, default: null })
  reraNumber!: string | null;

  @Prop({ type: Date, default: null })
  registrationDate!: Date | null;

  @Prop({ type: Date, default: null })
  validUntil!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  authority!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const ReraDetailsEmbedSchema = SchemaFactory.createForClass(ReraDetailsEmbed);
