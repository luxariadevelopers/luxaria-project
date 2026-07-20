import { z } from 'zod';
import { InstrumentType, ParticipantType } from './types';

const MONGO_ID = /^[a-f\d]{24}$/i;

const percentField = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Must be between 0 and 100')
  .max(100, 'Must be between 0 and 100');

const amountField = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Must be ≥ 0');

const optionalInterestRate = z.preprocess((value) => {
  if (value === '' || value === undefined) return null;
  return value;
}, z.number().min(0).nullable());

const loanInstruments = new Set<string>([
  InstrumentType.DirectorLoan,
  InstrumentType.UnsecuredLoan,
]);

export const participantCreateSchema = z
  .object({
    participantType: z.enum([
      ParticipantType.Director,
      ParticipantType.OutsideInvestor,
      ParticipantType.Company,
      ParticipantType.JointVentureParty,
    ]),
    participantId: z
      .string()
      .trim()
      .regex(MONGO_ID, 'Participant id must be a valid Mongo id'),
    commitmentAmount: amountField,
    expectedContributionDate: z.string(),
    actualContributionAmount: z.coerce.number().min(0),
    approvedProfitSharePercentage: percentField,
    lossSharePercentage: percentField,
    interestRate: optionalInterestRate,
    instrumentType: z.enum([
      InstrumentType.DirectorLoan,
      InstrumentType.UnsecuredLoan,
      InstrumentType.ProjectInvestment,
      InstrumentType.EquityContribution,
      InstrumentType.JointVentureContribution,
      InstrumentType.Other,
    ]),
    effectiveFrom: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (
      loanInstruments.has(values.instrumentType) &&
      values.interestRate === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['interestRate'],
        message: 'Interest rate is required for loan instruments',
      });
    }
  });

export type ParticipantCreateFormValues = {
  participantType: ParticipantType;
  participantId: string;
  commitmentAmount: number;
  expectedContributionDate: string;
  actualContributionAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate: number | null;
  instrumentType: InstrumentType;
  effectiveFrom: string;
  notes: string;
};

export const participantVersionSchema = z
  .object({
    commitmentAmount: amountField,
    expectedContributionDate: z.string(),
    actualContributionAmount: z.coerce.number().min(0),
    approvedProfitSharePercentage: percentField,
    lossSharePercentage: percentField,
    interestRate: optionalInterestRate,
    instrumentType: z.enum([
      InstrumentType.DirectorLoan,
      InstrumentType.UnsecuredLoan,
      InstrumentType.ProjectInvestment,
      InstrumentType.EquityContribution,
      InstrumentType.JointVentureContribution,
      InstrumentType.Other,
    ]),
    effectiveFrom: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (
      loanInstruments.has(values.instrumentType) &&
      values.interestRate === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['interestRate'],
        message: 'Interest rate is required for loan instruments',
      });
    }
  });

export type ParticipantVersionFormValues = {
  commitmentAmount: number;
  expectedContributionDate: string;
  actualContributionAmount: number;
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
  interestRate: number | null;
  instrumentType: InstrumentType;
  effectiveFrom: string;
  notes: string;
};

export const participantUpdateSchema = participantVersionSchema;

export type ParticipantUpdateFormValues = ParticipantVersionFormValues;

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
