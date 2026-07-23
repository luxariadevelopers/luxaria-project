/** Nest `documentType` values for company statutory files (S3 documents module). */
export const COMPANY_STATUTORY_DOCUMENT_TYPES = [
  { type: 'pan', label: 'PAN' },
  { type: 'moa', label: 'MOA' },
  { type: 'aoa', label: 'AOA' },
  { type: 'coi', label: 'COI' },
  { type: 'gst', label: 'GST certificate' },
] as const;

export type CompanyStatutoryDocumentType =
  (typeof COMPANY_STATUTORY_DOCUMENT_TYPES)[number]['type'];
