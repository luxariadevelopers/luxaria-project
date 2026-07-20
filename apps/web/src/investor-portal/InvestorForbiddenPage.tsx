import { Link as RouterLink } from 'react-router-dom';
import { Button, Paper, Stack } from '@mui/material';
import { InvestorForbiddenState } from './components/InvestorStatePanel';
import { investorLoginPath } from './session';

export function InvestorForbiddenPage() {
  return (
    <Stack spacing={2} data-testid="investor-forbidden-page">
      <InvestorForbiddenState />
      <Button
        component={RouterLink}
        to={investorLoginPath()}
        variant="outlined"
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to investor sign in
      </Button>
    </Stack>
  );
}

export function InvestorPortalForbiddenStandalone() {
  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 560, mx: 'auto', mt: 8 }}>
      <InvestorForbiddenPage />
    </Paper>
  );
}
