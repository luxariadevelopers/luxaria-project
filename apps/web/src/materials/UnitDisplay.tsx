import { Stack, Typography } from '@mui/material';
import { materialUnitLabel } from './labels';
import type { MaterialUnit, UnitConversionFactor } from './types';

type Props = {
  baseUnit: MaterialUnit;
  alternateUnits?: readonly MaterialUnit[];
  conversionFactors?: readonly UnitConversionFactor[];
  /** Compact single-line for tables. */
  compact?: boolean;
};

/**
 * Human-readable base unit + alternate conversion summary.
 * Rule: 1 × alternate = factorToBase × base.
 */
export function UnitDisplay({
  baseUnit,
  alternateUnits = [],
  conversionFactors = [],
  compact = false,
}: Props) {
  const baseLabel = materialUnitLabel(baseUnit);
  const factorByUnit = new Map(
    conversionFactors.map((f) => [f.unit, f.factorToBase] as const),
  );

  if (compact) {
    const alt =
      alternateUnits.length === 0
        ? null
        : alternateUnits
            .map((unit) => {
              const factor = factorByUnit.get(unit);
              return factor != null
                ? `${materialUnitLabel(unit)}×${factor}`
                : materialUnitLabel(unit);
            })
            .join(', ');
    return (
      <Typography variant="body2" component="span">
        {baseLabel}
        {alt ? (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ ml: 0.75 }}
          >
            (+ {alt})
          </Typography>
        ) : null}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5} data-testid="material-unit-display">
      <Typography variant="body2">
        Base: <strong>{baseLabel}</strong>
      </Typography>
      {alternateUnits.length > 0 ? (
        <Stack spacing={0.25}>
          {alternateUnits.map((unit) => {
            const factor = factorByUnit.get(unit);
            return (
              <Typography key={unit} variant="caption" color="text.secondary">
                1 {materialUnitLabel(unit)} = {factor ?? '—'} {baseLabel}
              </Typography>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">
          No alternate units
        </Typography>
      )}
    </Stack>
  );
}
