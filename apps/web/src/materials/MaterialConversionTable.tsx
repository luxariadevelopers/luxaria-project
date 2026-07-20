import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import { conversionRuleLabel, materialUnitLabel } from './labels';
import type { PublicMaterial } from './types';

type Props = {
  material: PublicMaterial;
};

/**
 * Unit conversions from material master (`conversionFactors`).
 * Rule: 1 × alternate = factorToBase × baseUnit.
 */
export function MaterialConversionTable({ material }: Props) {
  const rows = material.conversionFactors ?? [];

  if (rows.length === 0) {
    return (
      <div data-testid="material-conversion-empty">
        <EmptyState
          title="No alternate units"
          description={`This material uses ${materialUnitLabel(material.baseUnit)} as the only unit (implicit factor 1).`}
        />
      </div>
    );
  }

  return (
    <Paper variant="outlined" data-testid="material-conversion-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Alternate unit</TableCell>
            <TableCell>Factor to base</TableCell>
            <TableCell>Rule</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.unit}>
              <TableCell>{materialUnitLabel(row.unit)}</TableCell>
              <TableCell>{row.factorToBase}</TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {conversionRuleLabel(row, material.baseUnit)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
