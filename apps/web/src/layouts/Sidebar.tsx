import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '@/auth/AuthContext';
import { getVisibleNavPillars } from '@/navigation/filterNav';
import type {
  NavGroupConfig,
  NavItemConfig,
  NavPillarConfig,
} from '@/navigation/routeRegistry';
import { navIcon, pillarIcon } from './navIcons';
import {
  shellStorage,
  type FrequentRouteEntry,
} from './shellStorage';

export const DRAWER_WIDTH = 280;
export const DRAWER_WIDTH_COLLAPSED = 76;

const ROW_MIN_DESKTOP = 40;
const ROW_MIN_MOBILE = 44;
/** Skip section accordions; show static labels only when a group is large. */
const SECTION_LABEL_MIN_ITEMS = 8;

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function itemMatchesPath(item: NavItemConfig, pathname: string): boolean {
  if (item.end) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function pillarContainsPath(pillar: NavPillarConfig, pathname: string): boolean {
  return pillar.items.some((item) => itemMatchesPath(item, pathname));
}

function groupContainsPath(group: NavGroupConfig, pathname: string): boolean {
  return group.items.some((item) => itemMatchesPath(item, pathname));
}

function filterItems(
  items: readonly NavItemConfig[],
  query: string,
): NavItemConfig[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((item) => item.label.toLowerCase().includes(q));
}

function NavItemLink({
  item,
  collapsed,
  onClose,
  nested,
  mobile,
  onNavigate,
}: {
  item: NavItemConfig;
  collapsed: boolean;
  onClose: () => void;
  nested?: boolean;
  mobile?: boolean;
  onNavigate?: (item: NavItemConfig) => void;
}) {
  const minH = mobile ? ROW_MIN_MOBILE : ROW_MIN_DESKTOP;
  const button = (
    <ListItemButton
      component={NavLink}
      to={item.to}
      end={item.end}
      onClick={(event) => {
        (event.currentTarget as HTMLElement).blur();
        onNavigate?.(item);
        onClose();
      }}
      sx={{
        borderRadius: 1.5,
        mb: 0.15,
        justifyContent: collapsed ? 'center' : 'flex-start',
        px: collapsed ? 1 : nested ? 1.25 : 1.5,
        py: 0.5,
        ml: collapsed ? 0 : nested ? 1 : 0.25,
        minHeight: minH,
        '&.active': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiListItemIcon-root': { color: 'inherit' },
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 0 : 36,
          color: 'inherit',
          justifyContent: 'center',
        }}
      >
        {navIcon(item.icon)}
      </ListItemIcon>
      {!collapsed ? (
        <ListItemText
          primary={item.label}
          slotProps={{
            primary: { sx: { fontSize: 13.5, lineHeight: 1.3 } },
          }}
        />
      ) : null}
    </ListItemButton>
  );

  return collapsed ? (
    <Tooltip title={item.label} placement="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

function FlatGroupItems({
  group,
  onClose,
  mobile,
  onNavigate,
  searchQuery,
}: {
  group: NavGroupConfig;
  onClose: () => void;
  mobile?: boolean;
  onNavigate?: (item: NavItemConfig) => void;
  searchQuery: string;
}) {
  const showSectionLabels =
    !searchQuery.trim() &&
    group.sections.length > 1 &&
    group.items.length >= SECTION_LABEL_MIN_ITEMS;

  if (!showSectionLabels) {
    return (
      <>
        {filterItems(group.items, searchQuery).map((item) => (
          <NavItemLink
            key={item.id}
            item={item}
            collapsed={false}
            onClose={onClose}
            nested
            mobile={mobile}
            onNavigate={onNavigate}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {group.sections.map((section) => {
        const items = filterItems(section.items, searchQuery);
        if (items.length === 0) return null;
        return (
          <Box key={section.id} sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 2,
                pt: 0.75,
                pb: 0.25,
                fontWeight: 700,
                color: 'text.secondary',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                fontSize: 10.5,
              }}
            >
              {section.label}
            </Typography>
            {items.map((item) => (
              <NavItemLink
                key={item.id}
                item={item}
                collapsed={false}
                onClose={onClose}
                nested
                mobile={mobile}
                onNavigate={onNavigate}
              />
            ))}
          </Box>
        );
      })}
    </>
  );
}

function PillarBody({
  pillar,
  openModules,
  activeGroupId,
  onToggleModule,
  onClose,
  mobile,
  onNavigate,
  searchQuery,
}: {
  pillar: NavPillarConfig;
  openModules: Record<string, boolean>;
  activeGroupId: string | undefined;
  onToggleModule: (groupId: string) => void;
  onClose: () => void;
  mobile?: boolean;
  onNavigate?: (item: NavItemConfig) => void;
  searchQuery: string;
}) {
  const multiModule = pillar.groups.length > 1;
  const searching = Boolean(searchQuery.trim());

  if (searching) {
    return (
      <>
        {filterItems(pillar.items, searchQuery).map((item) => (
          <NavItemLink
            key={item.id}
            item={item}
            collapsed={false}
            onClose={onClose}
            nested
            mobile={mobile}
            onNavigate={onNavigate}
          />
        ))}
      </>
    );
  }

  if (!multiModule) {
    const group = pillar.groups[0];
    if (!group) return null;
    return (
      <FlatGroupItems
        group={group}
        onClose={onClose}
        mobile={mobile}
        onNavigate={onNavigate}
        searchQuery={searchQuery}
      />
    );
  }

  return (
    <>
      {pillar.groups.map((group) => {
        const isModuleOpen =
          Boolean(openModules[group.id]) || activeGroupId === group.id;
        return (
          <Box key={group.id} sx={{ mb: 0.25 }}>
            <ListItemButton
              onClick={() => onToggleModule(group.id)}
              sx={{
                borderRadius: 1.25,
                px: 1.5,
                py: 0.5,
                ml: 0.25,
                minHeight: mobile ? ROW_MIN_MOBILE : ROW_MIN_DESKTOP,
              }}
            >
              <ListItemText
                primary={group.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'text.secondary',
                    },
                  },
                }}
              />
              {isModuleOpen ? (
                <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              )}
            </ListItemButton>
            <Collapse in={isModuleOpen} timeout="auto" unmountOnExit>
              <FlatGroupItems
                group={group}
                onClose={onClose}
                mobile={mobile}
                onNavigate={onNavigate}
                searchQuery={searchQuery}
              />
            </Collapse>
          </Box>
        );
      })}
    </>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const { access } = useAuth();
  const { pathname } = useLocation();

  const accessLoaded = Boolean(access);
  const bypassPermissions = Boolean(access?.bypassPermissions);
  const permissions = access?.permissions ?? [];

  const pillars = useMemo(
    () =>
      getVisibleNavPillars({
        accessLoaded,
        bypassPermissions,
        permissions,
      }),
    [accessLoaded, bypassPermissions, permissions],
  );

  const activePillarId = useMemo(
    () => pillars.find((pillar) => pillarContainsPath(pillar, pathname))?.id,
    [pillars, pathname],
  );

  const activeGroupId = useMemo(() => {
    const pillar = pillars.find((p) => p.id === activePillarId);
    return pillar?.groups.find((g) => groupContainsPath(g, pathname))?.id;
  }, [pillars, activePillarId, pathname]);

  const [openPillarId, setOpenPillarId] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [mobilePillarId, setMobilePillarId] = useState<string | null>(null);
  const [frequent, setFrequent] = useState<FrequentRouteEntry[]>(() =>
    shellStorage.getFrequentRoutes(),
  );
  const [flyout, setFlyout] = useState<{
    pillarId: string;
    anchor: HTMLElement;
  } | null>(null);

  useEffect(() => {
    if (activePillarId) setOpenPillarId(activePillarId);
  }, [activePillarId]);

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenModules((prev) =>
      prev[activeGroupId] ? prev : { ...prev, [activeGroupId]: true },
    );
  }, [activeGroupId]);

  useEffect(() => {
    if (!mobileOpen) {
      setMobilePillarId(null);
      setSearchQuery('');
    }
  }, [mobileOpen]);

  useEffect(() => {
    const match = pillars
      .flatMap((p) => p.items)
      .find((item) => itemMatchesPath(item, pathname));
    if (!match) return;
    shellStorage.recordFrequentRoute({
      to: match.to,
      label: match.label,
      icon: match.icon,
    });
    const next = shellStorage.getFrequentRoutes();
    setFrequent((prev) => {
      if (
        prev.length === next.length &&
        prev.every((row, i) => row.to === next[i]?.to)
      ) {
        return prev;
      }
      return next;
    });
  }, [pathname, pillars]);

  const togglePillar = (pillarId: string) => {
    setOpenPillarId((prev) => (prev === pillarId ? null : pillarId));
  };

  const toggleModule = (groupId: string) => {
    setOpenModules((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const onNavigate = (item: NavItemConfig) => {
    shellStorage.recordFrequentRoute({
      to: item.to,
      label: item.label,
      icon: item.icon,
    });
    setFrequent(shellStorage.getFrequentRoutes());
  };

  const desktopWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const brand = (forCollapsed: boolean) => (
    <Toolbar
      sx={{
        px: forCollapsed ? 1 : 2,
        gap: 1.25,
        minHeight: 64,
        justifyContent: forCollapsed ? 'center' : 'flex-start',
      }}
    >
      <Box
        component="img"
        src={forCollapsed ? '/luxaria-logo-xs.png' : '/luxaria-logo-sm.png'}
        alt="Luxaria Developers"
        sx={{
          width: forCollapsed ? 32 : 40,
          height: forCollapsed ? 32 : 40,
          objectFit: 'contain',
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
      {!forCollapsed ? (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, lineHeight: 1.2 }}
            noWrap
          >
            Luxaria
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Developers ERP
          </Typography>
        </Box>
      ) : null}
    </Toolbar>
  );

  const searchField = (
    <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Search menu…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            'aria-label': 'Search navigation',
          },
        }}
      />
    </Box>
  );

  const frequentStrip = (mobile: boolean) => {
    if (searchQuery.trim() || frequent.length === 0) return null;
    return (
      <Box sx={{ px: 1.5, pb: 0.75 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
        >
          Frequent
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {frequent.map((entry) => (
            <Chip
              key={entry.to}
              component={NavLink}
              to={entry.to}
              clickable
              size="small"
              label={entry.label}
              onClick={() => onClose()}
              sx={{
                maxWidth: '100%',
                height: mobile ? 32 : 28,
                '& .MuiChip-label': { fontSize: 12 },
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  const desktopExpandedNav = (
    <List
      sx={{
        px: 1.25,
        py: 1,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {pillars.map((pillar) => {
        const filtered = filterItems(pillar.items, searchQuery);
        if (searchQuery.trim() && filtered.length === 0) return null;
        const isPillarOpen =
          Boolean(searchQuery.trim()) || openPillarId === pillar.id;

        return (
          <Box key={pillar.id} sx={{ mb: 0.35 }}>
            <ListItemButton
              onClick={() => {
                if (searchQuery.trim()) return;
                togglePillar(pillar.id);
              }}
              selected={activePillarId === pillar.id && !isPillarOpen}
              sx={{
                borderRadius: 1.5,
                px: 1.25,
                py: 0.75,
                mb: 0.15,
                minHeight: ROW_MIN_DESKTOP,
                '&.Mui-selected': { bgcolor: 'action.selected' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                {pillarIcon(pillar.id)}
              </ListItemIcon>
              <ListItemText
                primary={pillar.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 13.5,
                      fontWeight: 600,
                      lineHeight: 1.25,
                    },
                  },
                }}
              />
              {!searchQuery.trim() ? (
                isPillarOpen ? (
                  <ExpandLessIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                ) : (
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                )
              ) : null}
            </ListItemButton>
            <Collapse in={isPillarOpen} timeout="auto" unmountOnExit>
              <PillarBody
                pillar={pillar}
                openModules={openModules}
                activeGroupId={activeGroupId}
                onToggleModule={toggleModule}
                onClose={onClose}
                onNavigate={onNavigate}
                searchQuery={searchQuery}
              />
            </Collapse>
          </Box>
        );
      })}
    </List>
  );

  const desktopCollapsedNav = (
    <List
      sx={{
        px: 0.75,
        py: 1,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {pillars.map((pillar) => {
        const selected = activePillarId === pillar.id;
        return (
          <Tooltip key={pillar.id} title={pillar.label} placement="right">
            <ListItemButton
              selected={selected}
              aria-label={pillar.label}
              onClick={(e) =>
                setFlyout({ pillarId: pillar.id, anchor: e.currentTarget })
              }
              sx={{
                borderRadius: 1.5,
                justifyContent: 'center',
                px: 1,
                py: 0.75,
                mb: 0.35,
                minHeight: ROW_MIN_DESKTOP,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                },
              }}
            >
              <ListItemIcon
                sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}
              >
                {pillarIcon(pillar.id)}
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        );
      })}
      <Menu
        open={Boolean(flyout)}
        anchorEl={flyout?.anchor ?? null}
        onClose={() => setFlyout(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              ml: 0.5,
              minWidth: 220,
              maxHeight: '70vh',
              overflowY: 'auto',
            },
          },
        }}
      >
        {flyout
          ? pillars
              .find((p) => p.id === flyout.pillarId)
              ?.items.map((item) => (
                <MenuItem
                  key={item.id}
                  component={NavLink}
                  to={item.to}
                  selected={itemMatchesPath(item, pathname)}
                  onClick={() => {
                    onNavigate(item);
                    setFlyout(null);
                    onClose();
                  }}
                  sx={{ minHeight: ROW_MIN_DESKTOP, gap: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {navIcon(item.icon)}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </MenuItem>
              ))
          : null}
      </Menu>
    </List>
  );

  const mobileNav = () => {
    const searching = Boolean(searchQuery.trim());

    if (searching) {
      const hits = pillars.flatMap((p) => filterItems(p.items, searchQuery));
      return (
        <List sx={{ px: 1.25, py: 1, flex: 1, overflowY: 'auto' }}>
          {hits.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 1.5, py: 2 }}
            >
              No matching pages
            </Typography>
          ) : (
            hits.map((item) => (
              <NavItemLink
                key={item.id}
                item={item}
                collapsed={false}
                onClose={onClose}
                mobile
                onNavigate={onNavigate}
              />
            ))
          )}
        </List>
      );
    }

    if (mobilePillarId) {
      const pillar = pillars.find((p) => p.id === mobilePillarId);
      if (!pillar) return null;
      return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ListItemButton
            onClick={() => setMobilePillarId(null)}
            sx={{
              mx: 1.25,
              mt: 1,
              borderRadius: 1.5,
              minHeight: ROW_MIN_MOBILE,
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ArrowBackIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={pillar.label}
              secondary="Back to categories"
              slotProps={{
                primary: { sx: { fontWeight: 700, fontSize: 14 } },
                secondary: { sx: { fontSize: 12 } },
              }}
            />
          </ListItemButton>
          <List sx={{ px: 1.25, py: 1, flex: 1, overflowY: 'auto' }}>
            <PillarBody
              pillar={pillar}
              openModules={openModules}
              activeGroupId={activeGroupId}
              onToggleModule={toggleModule}
              onClose={onClose}
              mobile
              onNavigate={onNavigate}
              searchQuery=""
            />
          </List>
        </Box>
      );
    }

    return (
      <List sx={{ px: 1.25, py: 1, flex: 1, overflowY: 'auto' }}>
        {pillars.map((pillar) => (
          <ListItemButton
            key={pillar.id}
            onClick={() => setMobilePillarId(pillar.id)}
            selected={activePillarId === pillar.id}
            sx={{
              borderRadius: 1.5,
              px: 1.5,
              py: 1,
              mb: 0.35,
              minHeight: ROW_MIN_MOBILE,
              '&.Mui-selected': { bgcolor: 'action.selected' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              {pillarIcon(pillar.id)}
            </ListItemIcon>
            <ListItemText
              primary={pillar.label}
              secondary={`${pillar.items.length} pages`}
              slotProps={{
                primary: { sx: { fontWeight: 600, fontSize: 14.5 } },
                secondary: { sx: { fontSize: 12 } },
              }}
            />
            <ChevronRightIcon sx={{ color: 'text.secondary' }} />
          </ListItemButton>
        ))}
      </List>
    );
  };

  const collapseControl = (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        justifyContent: collapsed ? 'center' : 'flex-end',
        px: 1,
        py: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'}>
        <IconButton
          size="small"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );

  const mobileContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {brand(false)}
      <Divider />
      {searchField}
      {!mobilePillarId ? frequentStrip(true) : null}
      {mobileNav()}
    </Box>
  );

  const desktopContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {brand(collapsed)}
      <Divider />
      {!collapsed ? (
        <>
          {searchField}
          {frequentStrip(false)}
          {desktopExpandedNav}
        </>
      ) : (
        desktopCollapsedNav
      )}
      {collapseControl}
    </Box>
  );

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        width: { md: desktopWidth },
        flexShrink: { md: 0 },
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true, disableRestoreFocus: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {mobileContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: desktopWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        {desktopContent}
      </Drawer>
    </Box>
  );
}
