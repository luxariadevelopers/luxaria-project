import { describe, expect, it } from 'vitest';
import {
  isJournalEditable,
  isJournalImmutable,
  resolveJournalDetailActions,
} from './immutableState';
import { JournalStatus } from './types';

describe('journal immutable state', () => {
  it('marks posted / reversed / cancelled as immutable', () => {
    expect(isJournalImmutable(JournalStatus.Posted)).toBe(true);
    expect(isJournalImmutable(JournalStatus.Reversed)).toBe(true);
    expect(isJournalImmutable(JournalStatus.Cancelled)).toBe(true);
    expect(isJournalImmutable(JournalStatus.Draft)).toBe(false);
    expect(isJournalEditable(JournalStatus.Draft)).toBe(true);
    expect(isJournalEditable(JournalStatus.Posted)).toBe(false);
  });

  it('allows post and cancel on draft when permitted', () => {
    const actions = resolveJournalDetailActions(
      { status: JournalStatus.Draft, reversedBy: null },
      {
        canCreate: true,
        canPost: true,
        canReverse: true,
        canCancel: true,
      },
    );
    expect(actions).toEqual(['submit', 'post', 'cancel']);
  });

  it('allows reverse only on posted journals without reversedBy', () => {
    expect(
      resolveJournalDetailActions(
        { status: JournalStatus.Posted, reversedBy: null },
        {
          canCreate: true,
          canPost: true,
          canReverse: true,
          canCancel: true,
        },
      ),
    ).toEqual(['reverse']);

    expect(
      resolveJournalDetailActions(
        {
          status: JournalStatus.Posted,
          reversedBy: '507f1f77bcf86cd799439099',
        },
        {
          canCreate: true,
          canPost: true,
          canReverse: true,
          canCancel: true,
        },
      ),
    ).toEqual([]);
  });

  it('hides reverse without journal.reverse', () => {
    expect(
      resolveJournalDetailActions(
        { status: JournalStatus.Posted, reversedBy: null },
        {
          canCreate: true,
          canPost: true,
          canReverse: false,
          canCancel: true,
        },
      ),
    ).toEqual([]);
  });

  it('never offers edit actions on reversed journals', () => {
    expect(
      resolveJournalDetailActions(
        { status: JournalStatus.Reversed, reversedBy: null },
        {
          canCreate: true,
          canPost: true,
          canReverse: true,
          canCancel: true,
        },
      ),
    ).toEqual([]);
  });
});
