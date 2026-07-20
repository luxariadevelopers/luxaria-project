import { Outlet } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        background:
          'radial-gradient(circle at 20% 20%, rgba(196,163,90,0.28), transparent 40%), radial-gradient(circle at 80% 0%, rgba(27,58,75,0.18), transparent 35%), linear-gradient(160deg, #F7F4EF 0%, #E8E2D6 100%)',
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1.5 }}
        >
          Luxaria Developers
        </Typography>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Luxaria ERP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to the construction operations portal.
        </Typography>
        <Outlet />
      </Paper>
    </Box>
  );
}
