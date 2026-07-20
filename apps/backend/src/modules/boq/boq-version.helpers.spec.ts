import { BadRequestException } from '@nestjs/common';
import {
  assertBoqVersionEditable,
  requiresApprovalToActivate,
} from './boq-version.helpers';
import { BoqVersionStatus, BoqVersionType } from './schemas/boq.schema';

describe('boq-version.helpers', () => {
  it('marks approved/active/pending versions immutable', () => {
    expect(() =>
      assertBoqVersionEditable({ status: BoqVersionStatus.Active }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertBoqVersionEditable({ status: BoqVersionStatus.Superseded }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertBoqVersionEditable({ status: BoqVersionStatus.PendingApproval }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertBoqVersionEditable({ status: BoqVersionStatus.Draft }),
    ).not.toThrow();
  });

  it('requires approval only for variations', () => {
    expect(requiresApprovalToActivate(BoqVersionType.Variation)).toBe(true);
    expect(requiresApprovalToActivate(BoqVersionType.Original)).toBe(false);
    expect(requiresApprovalToActivate(BoqVersionType.Revision)).toBe(false);
    expect(requiresApprovalToActivate(BoqVersionType.ChangeOrder)).toBe(false);
  });
});
