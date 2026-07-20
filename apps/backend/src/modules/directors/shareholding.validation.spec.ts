import { BadRequestException } from '@nestjs/common';
import { assertShareholdingTotals100, assertValidDin } from './shareholding.validation';

describe('shareholding.validation', () => {
  it('requires percentages to total 100%', () => {
    expect(() =>
      assertShareholdingTotals100([
        {
          directorId: 'a',
          numberOfShares: 250000,
          faceValue: 10,
          percentage: 25,
        },
        {
          directorId: 'b',
          numberOfShares: 250000,
          faceValue: 10,
          percentage: 25,
        },
        {
          directorId: 'c',
          numberOfShares: 250000,
          faceValue: 10,
          percentage: 25,
        },
        {
          directorId: 'd',
          numberOfShares: 250000,
          faceValue: 10,
          percentage: 25,
        },
      ]),
    ).not.toThrow();

    expect(() =>
      assertShareholdingTotals100([
        {
          directorId: 'a',
          numberOfShares: 500000,
          faceValue: 10,
          percentage: 50,
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicate directors in a proposal', () => {
    expect(() =>
      assertShareholdingTotals100([
        {
          directorId: 'a',
          numberOfShares: 500000,
          faceValue: 10,
          percentage: 50,
        },
        {
          directorId: 'a',
          numberOfShares: 500000,
          faceValue: 10,
          percentage: 50,
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('validates DIN format', () => {
    expect(() => assertValidDin('12345678')).not.toThrow();
    expect(() => assertValidDin('BAD')).toThrow(BadRequestException);
  });
});
