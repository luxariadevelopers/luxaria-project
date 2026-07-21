import { z } from 'zod';
import {
  isoDateOnlySchema,
  moneyNonNegativeSchema,
  roundMoney,
} from '@/validation';
import { BookingFundingType, type CreateBookingInput } from './types';

const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

const FUNDING_VALUES = Object.values(BookingFundingType) as [
  string,
  ...string[],
];

const emptyToNull = z.union([z.string(), z.null()]).transform((v) => {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
});

export const bookingFormSchema = z
  .object({
    customerId: mongoIdSchema,
    jointApplicantId: z
      .union([mongoIdSchema, z.literal('')])
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    projectId: mongoIdSchema,
    unitId: mongoIdSchema,
    bookingDate: isoDateOnlySchema.optional(),
    bookingAmount: moneyNonNegativeSchema,
    agreedPrice: moneyNonNegativeSchema.refine((v) => v > 0, {
      message: 'Agreed price must be greater than zero',
    }),
    discount: moneyNonNegativeSchema,
    fundingType: z.enum(FUNDING_VALUES, {
      required_error: 'Funding type is required',
    }),
    remarks: emptyToNull.optional(),
    holdHours: z.coerce
      .number()
      .int()
      .min(1, 'Hold must be at least 1 hour')
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.discount > values.agreedPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discount cannot exceed agreed price',
        path: ['discount'],
      });
    }
  });

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function defaultBookingFormValues(input: {
  projectId: string;
  unitId?: string;
  customerId?: string;
}): BookingFormValues {
  return {
    customerId: input.customerId ?? '',
    jointApplicantId: null,
    projectId: input.projectId,
    unitId: input.unitId ?? '',
    bookingDate: new Date().toISOString().slice(0, 10),
    bookingAmount: 0,
    agreedPrice: 0,
    discount: 0,
    fundingType: BookingFundingType.OwnFunds,
    remarks: null,
    holdHours: undefined,
  };
}

export function shapeCreatePayload(
  values: BookingFormValues,
): CreateBookingInput {
  const discount = values.discount ?? 0;
  const approvedPrice = roundMoney(values.agreedPrice - discount);
  return {
    customerId: values.customerId,
    jointApplicantId: values.jointApplicantId ?? null,
    projectId: values.projectId,
    unitId: values.unitId,
    bookingDate: values.bookingDate,
    bookingAmount: values.bookingAmount,
    agreedPrice: values.agreedPrice,
    discount,
    approvedPrice,
    fundingType: values.fundingType,
    remarks: values.remarks ?? null,
    holdHours: values.holdHours,
  };
}
