import { Typography } from '@mui/material';

type Props = {
  generatedAt: string | null;
};

export function ReportGeneratedAt({ generatedAt }: Props) {
  if (!generatedAt) {
    return null;
  }
  const label = new Date(generatedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return (
    <Typography variant="caption" color="text.disabled" data-testid="report-generated-at">
      Calculated {label} (from API)
    </Typography>
  );
}
