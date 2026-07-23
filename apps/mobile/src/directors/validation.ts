import { DirectorStatus, type CreateDirectorInput } from './types';

export const DIN_REGEX = /^[0-9]{8}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type DirectorFormValues = {
  fullName: string;
  userId: string;
  din: string;
  pan: string;
  email: string;
  phone: string;
  address: string;
  appointmentDate: string;
  status: DirectorStatus;
};

export function emptyDirectorFormValues(): DirectorFormValues {
  return {
    fullName: '',
    userId: '',
    din: '',
    pan: '',
    email: '',
    phone: '',
    address: '',
    appointmentDate: '',
    status: DirectorStatus.Active,
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function validateDirectorForm(
  values: DirectorFormValues,
): string | null {
  if (!values.fullName.trim()) return 'Full name is required';
  if (!values.userId.trim()) return 'Linked user is required';
  const din = values.din.trim();
  if (din && !DIN_REGEX.test(din)) return 'DIN must be an 8-digit number';
  const pan = values.pan.trim().toUpperCase();
  if (pan && !PAN_REGEX.test(pan)) {
    return 'PAN must be a valid PAN (e.g. ABCDE1234F)';
  }
  const email = values.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email';
  }
  if (
    values.status !== DirectorStatus.Active &&
    values.status !== DirectorStatus.Inactive &&
    values.status !== DirectorStatus.Resigned
  ) {
    return 'Invalid status';
  }
  return null;
}

export function toCreateDirectorInput(
  values: DirectorFormValues,
): CreateDirectorInput {
  return {
    fullName: values.fullName.trim(),
    userId: values.userId.trim(),
    din: blankToNull(values.din),
    pan: blankToNull(values.pan.toUpperCase()),
    email: blankToNull(values.email.toLowerCase()),
    phone: blankToNull(values.phone),
    address: blankToNull(values.address),
    appointmentDate: blankToNull(values.appointmentDate),
    status: values.status,
  };
}
