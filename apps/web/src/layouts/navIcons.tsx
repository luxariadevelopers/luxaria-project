import type { ReactElement } from 'react';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import type { NavIconId } from '@/navigation/routeRegistry';

const ICONS: Record<NavIconId, ReactElement> = {
  dashboard: <DashboardOutlinedIcon fontSize="small" />,
  projects: <FolderOutlinedIcon fontSize="small" />,
  dpr: <AssignmentOutlinedIcon fontSize="small" />,
  users: <GroupOutlinedIcon fontSize="small" />,
  settings: <SettingsOutlinedIcon fontSize="small" />,
  notifications: <NotificationsNoneOutlinedIcon fontSize="small" />,
  approvals: <FactCheckOutlinedIcon fontSize="small" />,
  documents: <DescriptionOutlinedIcon fontSize="small" />,
  audit: <HistoryOutlinedIcon fontSize="small" />,
  finance: <AccountBalanceOutlinedIcon fontSize="small" />,
  purchase: <ShoppingCartOutlinedIcon fontSize="small" />,
  stock: <Inventory2OutlinedIcon fontSize="small" />,
  sales: <StorefrontOutlinedIcon fontSize="small" />,
  reports: <AssessmentOutlinedIcon fontSize="small" />,
  company: <BusinessOutlinedIcon fontSize="small" />,
};

export function navIcon(id: NavIconId): ReactElement {
  return ICONS[id];
}
