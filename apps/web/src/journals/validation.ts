import { z } from 'zod';
import { JournalPartyType, type CreateJournalInput } from './types';

/** Keep input/output as `string | null` so RHF + zodResolver types align. */
const emptyToNull = z.union([z.string(), z.null()]).transform((v) => {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
});

export const journalLineFormSchema = z.object({
  accountId: z.string().trim().min(1, 'Account is required'),
  debit: z.coerce.number().min(0, 'Debit cannot be negative'),
  credit: z.coerce.number().min(0, 'Credit cannot be negative'),
  projectId: emptyToNull,
  partyType: emptyToNull,
  partyId: emptyToNull,
  description: emptyToNull,
});

export const journalCreateSchema = z.object({
  journalDate: z
    .string()
    .trim()
    .min(1, 'Journal date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  narration: z.string().trim().min(1, 'Narration is required'),
  projectId: emptyToNull,
  lines: z.array(journalLineFormSchema).min(2, 'At least two lines required'),
});

export type JournalCreateFormValues = z.infer<typeof journalCreateSchema>;
export type JournalLineFormValues = z.infer<typeof journalLineFormSchema>;

export function emptyJournalLine(): JournalLineFormValues {
  return {
    accountId: '',
    debit: 0,
    credit: 0,
    projectId: null,
    partyType: null,
    partyId: null,
    description: null,
  };
}

export function defaultJournalCreateValues(
  partial?: Partial<JournalCreateFormValues>,
): JournalCreateFormValues {
  return {
    journalDate: new Date().toISOString().slice(0, 10),
    narration: '',
    projectId: null,
    lines: [emptyJournalLine(), emptyJournalLine()],
    ...partial,
  };
}

const PARTY_VALUES = new Set<string>(Object.values(JournalPartyType));

/** Map form → Nest `CreateJournalDto`. */
export function shapeJournalCreatePayload(
  values: JournalCreateFormValues,
): CreateJournalInput {
  return {
    journalDate: values.journalDate,
    narration: values.narration.trim(),
    projectId: values.projectId ?? null,
    sourceModule: 'manual',
    sourceEntityType: 'manual_journal',
    lines: values.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      projectId: line.projectId ?? null,
      partyType:
        line.partyType && PARTY_VALUES.has(line.partyType)
          ? (line.partyType as JournalPartyType)
          : null,
      partyId: line.partyId ?? null,
      description: line.description ?? null,
    })),
  };
}
