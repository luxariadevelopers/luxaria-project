import { Chip, Tooltip } from '@mui/material';
import {
  duplicateBillWarningText,
  hasDuplicateBillWarning,
} from './warnings';

type Props = {
  warnings: readonly string[];
};

/** Soft Nest warning when same project + bill number + amount already exists. */
export function DuplicateWarningBadge({ warnings }: Props) {
  if (!hasDuplicateBillWarning(warnings)) return null;
  const title =
    duplicateBillWarningText(warnings) ?? 'Possible duplicate bill';

  return (
    <Tooltip title={title}>
      <Chip
        size="small"
        color="error"
        variant="filled"
        label="Duplicate"
        data-testid="expense-duplicate-warning"
      />
    </Tooltip>
  );
}
