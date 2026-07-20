import { UserStatus } from '../../users/schemas/user.schema';

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_ADDRESS_REGEX.test(trimmed);
}

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function isDeliverableUserStatus(status: UserStatus): boolean {
  return status === UserStatus.Active;
}

export function hasRenderableContent(subject: string, body: string): boolean {
  return subject.trim().length > 0 && body.trim().length > 0;
}
