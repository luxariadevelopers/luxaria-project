import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  assertRecipientSignaturePresent,
  assertReturnWithinIssued,
  assertWorkLocation,
  roundQty,
} from './material-issues.validation';

describe('material-issues.validation', () => {
  it('rounds quantities to micro precision', () => {
    expect(roundQty(1.23456789)).toBe(1.234568);
  });

  it('requires workLocation', () => {
    expect(() => assertWorkLocation('  ')).toThrow(BadRequestException);
    expect(assertWorkLocation(' Block A ')).toBe('Block A');
  });

  it('requires recipient signature document + checksum', () => {
    expect(() =>
      assertRecipientSignaturePresent({
        recipientSignatureDocumentId: null,
        recipientSignatureChecksum: null,
        issuerSignatureDocumentId: null,
        issuerSignatureChecksum: null,
        recipientSignedAt: null,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertRecipientSignaturePresent({
        recipientSignatureDocumentId: new Types.ObjectId(),
        recipientSignatureChecksum: 'a'.repeat(64),
        issuerSignatureDocumentId: null,
        issuerSignatureChecksum: null,
        recipientSignedAt: new Date(),
      }),
    ).not.toThrow();
  });

  it('blocks returns beyond remaining issued qty', () => {
    expect(() =>
      assertReturnWithinIssued({
        materialCode: 'MAT-1',
        issuedBase: 10,
        alreadyReturnedBase: 8,
        returnBase: 3,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertReturnWithinIssued({
        materialCode: 'MAT-1',
        issuedBase: 10,
        alreadyReturnedBase: 8,
        returnBase: 2,
      }),
    ).not.toThrow();
  });
});
