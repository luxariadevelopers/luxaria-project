import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { InvestorPortalProjectSummary } from '../types';
import { formatInr, formatPercent } from '../format';

type ProjectSummaryCardProps = {
  project: InvestorPortalProjectSummary;
};

export function ProjectSummaryCard({ project }: ProjectSummaryCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="h6">
              {project.projectCode} — {project.projectName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {project.projectStage} · {project.status}
            </Typography>
          </Box>
          <Chip size="small" label={formatPercent(project.physicalProgressPercent)} />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ flexWrap: 'wrap' }}
        >
          <Typography variant="body2">
            Commitment: <strong>{formatInr(project.commitmentAmount)}</strong>
          </Typography>
          <Typography variant="body2">
            Contributed: <strong>{formatInr(project.amountContributed)}</strong>
          </Typography>
          <Typography variant="body2">
            Profit share:{' '}
            <strong>{formatPercent(project.approvedProfitSharePercentage)}</strong>
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          to={`/investor/projects/${project.projectId}`}
          variant="outlined"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
        >
          View project summary
        </Button>
      </Stack>
    </Paper>
  );
}