/**
 * Generic option row for selects / filters shared by web and mobile forms.
 */
export type SelectOption<TValue extends string | number = string | number> = {
  label: string;
  value: TValue;
  disabled?: boolean;
};
