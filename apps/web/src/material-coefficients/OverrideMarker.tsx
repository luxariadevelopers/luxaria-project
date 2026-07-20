import { Chip, Tooltip } from '@mui/material';
import type { PublicMaterialCoefficient } from './types';

type Props = {
  row: PublicMaterialCoefficient;
};

/** Marks project-specific rows that override a company-wide standard. */
export function OverrideMarker({ row }: Props) {
  if (!row.isProjectOverride) {
    return (
      <Chip size="small" label="Company" variant="outlined" color="default" />
    );
  }

  const title = row.overridesStandardId
    ? `Overrides company standard ${row.overridesStandardId}`
    : 'Project-specific consumption norm';

  return (
    <Tooltip title={title}>
      <Chip size="small" label="Project override" color="secondary" variant="outlined" />
    </Tooltip>
  );
}
