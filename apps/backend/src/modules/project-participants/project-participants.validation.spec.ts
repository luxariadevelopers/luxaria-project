import { BadRequestException } from '@nestjs/common';
import {
  assertActiveProfitShareTotals100,
  assertInterestRateForInstrument,
  buildParticipantKey,
} from './project-participants.validation';
import {
  InstrumentType,
  ParticipantType,
} from './schemas/project-participant.schema';

describe('project-participants.validation', () => {
  it('requires active profit shares to total 100%', () => {
    expect(() => assertActiveProfitShareTotals100([25, 25, 25, 25])).not.toThrow();
    expect(() => assertActiveProfitShareTotals100([40, 40])).toThrow(
      BadRequestException,
    );
    expect(() => assertActiveProfitShareTotals100([])).toThrow(BadRequestException);
  });

  it('requires interestRate for loan instruments', () => {
    expect(() =>
      assertInterestRateForInstrument(InstrumentType.DirectorLoan, 12),
    ).not.toThrow();
    expect(() =>
      assertInterestRateForInstrument(InstrumentType.DirectorLoan, null),
    ).toThrow(BadRequestException);
    expect(() =>
      assertInterestRateForInstrument(InstrumentType.EquityContribution, null),
    ).not.toThrow();
  });

  it('builds stable participant keys', () => {
    expect(
      buildParticipantKey(ParticipantType.Director, 'abc'),
    ).toBe('director:abc');
  });
});
