import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { NumberEntityType } from '../numbering.constants';

export type CounterDocument = HydratedDocument<Counter>;

@Schema({
  collection: 'counters',
  timestamps: true,
})
export class Counter {
  /**
   * Unique atomic scope, e.g. PROJECT:2026:GLOBAL or PO:2026:<projectId>
   * Numbers are never derived from document counts.
   */
  @Prop({ required: true, unique: true, trim: true })
  scopeKey!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(NumberEntityType),
    index: true,
  })
  entityType!: NumberEntityType;

  @Prop({ required: true, trim: true })
  prefix!: string;

  /** Calendar/financial year segment, or null when not used (e.g. VEN). */
  @Prop({ type: String, default: null, index: true })
  financialYear!: string | null;

  /** Set when project-scoped numbering is enabled for the entity. */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  projectId!: Types.ObjectId | null;

  /** Last issued sequence for this scope (incremented atomically). */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  seq!: number;

  @Prop({ type: Number, required: true, min: 1 })
  padLength!: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);

CounterSchema.index({ entityType: 1, financialYear: 1, projectId: 1 });
