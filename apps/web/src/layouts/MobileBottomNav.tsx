import { NavLink, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { useAuth } from '@/auth/AuthContext';

type Props = {
  onMore: () => void;
};

/**
 * Lightweight phone chrome: Home / Approvals / More.
 * Full module tree stays in the drawer (More).
 */
export function MobileBottomNav({ onMore }: Props) {
  const { pathname } = useLocation();
  const { access, hasPermission } = useAuth();
  const canApprovals = !access || hasPermission('approval.view');

  const value =
    pathname === '/'
      ? 'home'
      : pathname.startsWith('/approvals')
        ? 'approvals'
        : 'more';

  return (
    <Paper
      elevation={8}
      square
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <BottomNavigation
        showLabels
        value={value}
        sx={{
          height: 56,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            py: 0.75,
            minHeight: 44,
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          value="home"
          icon={<HomeOutlinedIcon />}
          component={NavLink}
          to="/"
          end
        />
        {canApprovals ? (
          <BottomNavigationAction
            label="Approvals"
            value="approvals"
            icon={<FactCheckOutlinedIcon />}
            component={NavLink}
            to="/approvals"
          />
        ) : null}
        <BottomNavigationAction
          label="More"
          value="more"
          icon={<MenuOutlinedIcon />}
          onClick={(event) => {
            event.preventDefault();
            onMore();
          }}
        />
      </BottomNavigation>
    </Paper>
  );
}
