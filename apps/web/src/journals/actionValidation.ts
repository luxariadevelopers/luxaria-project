import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Client rules for reverse dialog.
 * Nest `ReverseJournalDto` treats both fields optional; UI requires date + reason
 * (mapped to `narration`) before calling the API.
 */
export const reverseJournalSchema = z.object({
  journalDate: z
    .string()
    .trim()
    .regex(DATE_RE, 'Reversal date must be YYYY-MM-DD'),
  narration: z
    .string()
    .trim()
    .min(1, 'Reversal reason is required')
    .max(500),
});

export type ReverseJournalFormValues = z.infer<typeof reverseJournalSchema>;

export const cancelJournalSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal('')),
});

export type CancelJournalFormValues = z.infer<typeof cancelJournalSchema>;
