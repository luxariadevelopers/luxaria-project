import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { fetchInvestorPortalMe } from '../api';

const NAV = [{ label: 'Dashboard', to: '/investor/dashboard', end: true }];

export function InvestorLayout() {
  const { logout } = useAuth();

  const meQuery = useQuery({
    queryKey: ['investor-portal', 'me'],
    queryFn: async () => {
      const res = await fetchInvestorPortalMe();
      return res.data ?? null;
    },
    staleTime: 60_000,
  });

  const profile = meQuery.data;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: 'Fraunces, serif', fontWeight: 700, flexGrow: 1 }}
          >
            Luxaria Investor Portal
          </Typography>
          {profile ? (
            <Chip
              size="small"
              label={`${profile.investorCode} · ${profile.legalName}`}
              variant="outlined"
            />
          ) : null}
          <Button
            color="inherit"
            startIcon={<LogoutOutlinedIcon />}
            onClick={() => logout()}
          >
            Sign out
          </Button>
        </Toolbar>
        <Divider />
        <Container maxWidth="xl">
          <Stack direction="row" spacing={1} sx={{ py: 1 }}>
            {NAV.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.end}
                startIcon={<DashboardOutlinedIcon />}
                sx={{
                  borderRadius: 2,
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Container>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
