import { describe, expect, it } from 'vitest';
import {
  COMPANY_STATUTORY_DOCUMENT_TYPES,
  type CompanyStatutoryDocumentType,
} from './companyStatutoryDocuments';

describe('COMPANY_STATUTORY_DOCUMENT_TYPES', () => {
  it('covers PAN, MOA, AOA, COI, and GST for Nest documentType slugs', () => {
    const types = COMPANY_STATUTORY_DOCUMENT_TYPES.map((row) => row.type);
    expect(types).toEqual(['pan', 'moa', 'aoa', 'coi', 'gst']);
    const asTyped: CompanyStatutoryDocumentType[] = [
      'pan',
      'moa',
      'aoa',
      'coi',
      'gst',
    ];
    expect(types).toEqual(asTyped);
  });
});
