import {
  hasRenderableContent,
  isDeliverableUserStatus,
  isValidEmailAddress,
  normalizeEmailAddress,
} from './email-recipient.util';
import { UserStatus } from '../../users/schemas/user.schema';

describe('email recipient utils', () => {
  it('validates email addresses', () => {
    expect(isValidEmailAddress('user@example.com')).toBe(true);
    expect(isValidEmailAddress('bad')).toBe(false);
    expect(isValidEmailAddress(null)).toBe(false);
  });

  it('normalizes email addresses', () => {
    expect(normalizeEmailAddress(' User@Example.COM ')).toBe('user@example.com');
  });

  it('allows only active users for delivery', () => {
    expect(isDeliverableUserStatus(UserStatus.Active)).toBe(true);
    expect(isDeliverableUserStatus(UserStatus.Inactive)).toBe(false);
    expect(isDeliverableUserStatus(UserStatus.Locked)).toBe(false);
  });

  it('requires non-empty subject and body', () => {
    expect(hasRenderableContent('Subject', 'Body')).toBe(true);
    expect(hasRenderableContent(' ', 'Body')).toBe(false);
    expect(hasRenderableContent('Subject', '')).toBe(false);
  });
});
