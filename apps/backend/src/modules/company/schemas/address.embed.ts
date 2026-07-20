import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class AddressEmbed {
  @Prop({ required: true, trim: true })
  line1!: string;

  @Prop({ type: String, trim: true, default: null })
  line2!: string | null;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true })
  pincode!: string;

  @Prop({ required: true, trim: true, default: 'India' })
  country!: string;
}

export const AddressEmbedSchema = SchemaFactory.createForClass(AddressEmbed);

export type AddressInput = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
};

export function toAddressEmbed(input: AddressInput): AddressEmbed {
  return {
    line1: input.line1.trim(),
    line2: input.line2?.trim() ?? null,
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    country: (input.country ?? 'India').trim(),
  };
}

export function addressesEqual(a: AddressEmbed, b: AddressEmbed): boolean {
  return (
    a.line1 === b.line1 &&
    (a.line2 ?? null) === (b.line2 ?? null) &&
    a.city === b.city &&
    a.state === b.state &&
    a.pincode === b.pincode &&
    a.country === b.country
  );
}
