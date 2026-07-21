import type { ReactNode } from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

type LinkItem = {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export function SettingsQuickLinks() {
  const { access, hasPermission } = useAuth();

  const links: LinkItem[] = [];

  if (!access || hasPermission('notification.view')) {
    links.push({
      to: '/notifications',
      title: 'Notification centre',
      description: 'View inbox, unread counts, and mark items read',
      icon: <NotificationsNoneOutlinedIcon fontSize="small" />,
    });
  }

  if (!access || hasPermission('company.view')) {
    links.push({
      to: '/administration/company/settings',
      title: 'Company settings',
      description: 'Company profile, branding, and tenant configuration',
      icon: <SettingsOutlinedIcon fontSize="small" />,
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" component="h2">
          Related settings
        </Typography>
        <List disablePadding>
          {links.map((link) => (
            <ListItemButton
              key={link.to}
              component={RouterLink}
              to={link.to}
              sx={{
                px: 0,
                py: 1.25,
                borderTop: '1px solid',
                borderColor: 'divider',
                '&:first-of-type': { borderTop: 0 },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{link.icon}</ListItemIcon>
              <ListItemText
                primary={link.title}
                secondary={link.description}
                slotProps={{ primary: { sx: { fontWeight: 600 } } }}
              />
              <ChevronRightIcon color="action" fontSize="small" />
            </ListItemButton>
          ))}
        </List>
      </Stack>
    </Paper>
  );
}
