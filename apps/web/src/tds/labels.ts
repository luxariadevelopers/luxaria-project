import {
  TdsDeductionStatus,
  TdsFormType,
  TdsReturnStatus,
  type TdsDeductionStatus as DedStatus,
  type TdsFormType as FormType,
  type TdsQuarter as Quarter,
  type TdsReturnStatus as RetStatus,
} from './types';

export function tdsDeductionStatusLabel(status: DedStatus): string {
  switch (status) {
    case TdsDeductionStatus.Withheld:
      return 'Withheld';
    case TdsDeductionStatus.Deposited:
      return 'Deposited';
    case TdsDeductionStatus.Certified:
      return 'Certified';
    case TdsDeductionStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function tdsFormTypeLabel(form: FormType): string {
  switch (form) {
    case TdsFormType.Form26q:
      return 'Form 26Q';
    case TdsFormType.Form24q:
      return 'Form 24Q';
    case TdsFormType.Form27q:
      return 'Form 27Q';
    default:
      return form;
  }
}

export function tdsQuarterLabel(quarter: Quarter): string {
  return quarter.toUpperCase();
}

export function tdsReturnStatusLabel(status: RetStatus): string {
  switch (status) {
    case TdsReturnStatus.Draft:
      return 'Draft';
    case TdsReturnStatus.Computed:
      return 'Computed';
    case TdsReturnStatus.Filed:
      return 'Filed';
    case TdsReturnStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}
