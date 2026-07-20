import {
  Box,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { formatMoney, formatQty } from './labels';
import type { MaterialConsumptionLine } from './types';

type ConsumptionWaterfallProps = {
  line: MaterialConsumptionLine | null;
};

type Step = {
  label: string;
  value: number;
  tone?: 'neutral' | 'expected' | 'actual' | 'variance';
};

function barWidth(value: number, max: number): string {
  if (max <= 0) return '0%';
  return `${Math.min(100, Math.round((Math.abs(value) / max) * 100))}%`;
}

const TONE_COLORS: Record<NonNullable<Step['tone']>, string> = {
  neutral: 'grey.400',
  expected: 'info.main',
  actual: 'secondary.main',
  variance: 'error.main',
};

/**
 * Expected vs actual consumption waterfall for a selected line.
 * Shows requirement → wastage → expected → issued/returned → net actual → variance.
 */
export function ConsumptionWaterfall({ line }: ConsumptionWaterfallProps) {
  if (!line) {
    return (
      <Box
        sx={{
          p: 3,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          Select a variance line to view the expected vs actual waterfall.
        </Typography>
      </Box>
    );
  }

  const steps: Step[] = [
    {
      label: 'Standard requirement',
      value: line.standardMaterialRequirement,
      tone: 'neutral',
    },
    {
      label: `Allowed wastage (${line.wastagePercentage}%)`,
      value: line.allowedWastage,
      tone: 'neutral',
    },
    {
      label: 'Expected consumption',
      value: line.expectedConsumption,
      tone: 'expected',
    },
    {
      label: 'Material issued',
      value: line.actualMaterialIssued,
      tone: 'actual',
    },
    {
      label: 'Material returned',
      value: -line.materialReturned,
      tone: 'actual',
    },
    {
      label: 'Net actual consumption',
      value: line.netActualConsumption,
      tone: 'actual',
    },
    {
      label: 'Variance quantity',
      value: line.varianceQuantity,
      tone: 'variance',
    },
  ];

  const max = Math.max(
    line.expectedConsumption,
    line.netActualConsumption,
    line.actualMaterialIssued,
    Math.abs(line.varianceQuantity),
    1,
  );

  return (
    <Stack spacing={2} data-testid="consumption-waterfall">
      <Stack spacing={0.5}>
        <Typography variant="subtitle1">Expected vs actual</Typography>
        <Typography variant="body2" color="text.secondary">
          Work qty {formatQty(line.workQuantityCompleted)} {line.baseUnit} ·
          coefficient {formatQty(line.coefficient, 4)} · variance value{' '}
          {formatMoney(line.varianceValue)}
        </Typography>
      </Stack>
      <Stack spacing={1.5}>
        {steps.map((step) => (
          <Box key={step.label}>
            <Stack
              direction="row"
              sx={{ mb: 0.5, justifyContent: 'space-between' }}
            >
              <Typography variant="body2">{step.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatQty(step.value)} {line.baseUnit}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Number.parseFloat(barWidth(step.value, max))}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: TONE_COLORS[step.tone ?? 'neutral'],
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
