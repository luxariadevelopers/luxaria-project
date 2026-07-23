import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/auth/AuthContext';
import { getVisibleNavPillars } from '@/navigation/filterNav';
import type {
  NavGroupConfig,
  NavItemConfig,
  NavPillarConfig,
  NavSectionConfig,
} from '@/navigation/routeRegistry';
import { navIcon } from './navIcons';

export const DRAWER_WIDTH = 272;
export const DRAWER_WIDTH_COLLAPSED = 76;

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

function sectionContainsPath(
  section: NavSectionConfig,
  pathname: string,
): boolean {
  return section.items.some((item) => itemMatchesPath(item, pathname));
}

function NavItemLink({
  item,
  collapsed,
  onClose,
  nested,
}: {
  item: NavItemConfig;
  collapsed: boolean;
  onClose: () => void;
  nested?: boolean;
}) {
  const button = (
    <ListItemButton
      component={NavLink}
      to={item.to}
      end={item.end}
      onClick={(event) => {
        // Avoid aria-hidden warning: drawer closes while this link still has focus.
        (event.currentTarget as HTMLElement).blur();
        onClose();
      }}
      sx={{
        borderRadius: 1.5,
        mb: 0.15,
        justifyContent: collapsed ? 'center' : 'flex-start',
        px: collapsed ? 1 : nested ? 1.25 : 1.5,
        py: 0.5,
        ml: collapsed ? 0 : nested ? 1 : 0.25,
        '&.active': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiListItemIcon-root': { color: 'inherit' },
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 0 : 32,
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

function SectionBlock({
  section,
  sectionKey,
  isOpen,
  onToggle,
  onClose,
}: {
  section: NavSectionConfig;
  sectionKey: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
  // Single-item sections (e.g. Approvals) — skip the extra accordion row.
  if (section.items.length === 1) {
    return (
      <NavItemLink
        item={section.items[0]!}
        collapsed={false}
        onClose={onClose}
        nested
      />
    );
  }

  return (
    <Box sx={{ mb: 0.2 }}>
      <ListItemButton
        onClick={() => onToggle(sectionKey)}
        sx={{ borderRadius: 1.25, px: 1.5, py: 0.4, ml: 0.5 }}
      >
        <ListItemText
          primary={section.label}
          slotProps={{
            primary: {
              sx: {
                fontSize: 11.5,
                fontWeight: 600,
                color: 'text.secondary',
                lineHeight: 1.2,
              },
            },
          }}
        />
        {isOpen ? (
          <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        )}
      </ListItemButton>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        {section.items.map((item) => (
          <NavItemLink
            key={item.id}
            item={item}
            collapsed={false}
            onClose={onClose}
            nested
          />
        ))}
      </Collapse>
    </Box>
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

  const pillars = getVisibleNavPillars({
    accessLoaded: Boolean(access),
    bypassPermissions: Boolean(access?.bypassPermissions),
    permissions: access?.permissions ?? [],
  });

  const activePillarId = useMemo(
    () => pillars.find((pillar) => pillarContainsPath(pillar, pathname))?.id,
    [pillars, pathname],
  );

  const activeGroupId = useMemo(() => {
    const pillar = pillars.find((p) => p.id === activePillarId);
    return pillar?.groups.find((g) => groupContainsPath(g, pathname))?.id;
  }, [pillars, activePillarId, pathname]);

  const activeSectionKey = useMemo(() => {
    const pillar = pillars.find((p) => p.id === activePillarId);
    const group = pillar?.groups.find((g) => g.id === activeGroupId);
    const section = group?.sections.find((s) =>
      sectionContainsPath(s, pathname),
    );
    return group && section ? `${group.id}:${section.id}` : null;
  }, [pillars, activePillarId, activeGroupId, pathname]);

  const [openPillarId, setOpenPillarId] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

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
    if (!activeSectionKey) return;
    setOpenSections((prev) =>
      prev[activeSectionKey] ? prev : { ...prev, [activeSectionKey]: true },
    );
  }, [activeSectionKey]);

  const togglePillar = (pillarId: string) => {
    setOpenPillarId((prev) => (prev === pillarId ? null : pillarId));
  };

  const toggleModule = (groupId: string) => {
    setOpenModules((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const desktopWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const brand = (
    <Toolbar
      sx={{
        px: collapsed ? 1 : 2,
        gap: 1.25,
        minHeight: 64,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <Box
        component="img"
        src={collapsed ? '/luxaria-logo-xs.png' : '/luxaria-logo-sm.png'}
        alt="Luxaria Developers"
        sx={{
          width: collapsed ? 32 : 40,
          height: collapsed ? 32 : 40,
          objectFit: 'contain',
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
      {!collapsed ? (
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

  const renderGroupContent = (group: NavGroupConfig) => {
    const useSections =
      group.sections.length > 1 ||
      (group.sections.length === 1 && group.sections[0]!.items.length > 1);

    if (!useSections) {
      return group.items.map((item) => (
        <NavItemLink
          key={item.id}
          item={item}
          collapsed={false}
          onClose={onClose}
          nested
        />
      ));
    }

    return group.sections.map((section) => {
      const sectionKey = `${group.id}:${section.id}`;
      const isSectionOpen =
        Boolean(openSections[sectionKey]) || activeSectionKey === sectionKey;
      return (
        <SectionBlock
          key={section.id}
          section={section}
          sectionKey={sectionKey}
          isOpen={isSectionOpen}
          onToggle={toggleSection}
          onClose={onClose}
        />
      );
    });
  };

  const navList = (
    <List
      sx={{
        px: collapsed ? 0.75 : 1.25,
        py: 1,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      dense
    >
      {pillars.map((pillar) => {
        const isPillarOpen = openPillarId === pillar.id;
        const multiModule = pillar.groups.length > 1;

        return (
          <Box key={pillar.id} sx={{ mb: 0.35 }}>
            {collapsed ? (
              <Divider sx={{ my: 1, mx: 1 }} />
            ) : (
              <ListItemButton
                onClick={() => togglePillar(pillar.id)}
                selected={activePillarId === pillar.id && !isPillarOpen}
                sx={{
                  borderRadius: 1.5,
                  px: 1.25,
                  py: 0.75,
                  mb: 0.15,
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                }}
              >
                <ListItemText
                  primary={pillar.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: 13.5,
                        fontWeight: 600,
                        lineHeight: 1.25,
                        color: 'text.primary',
                      },
                    },
                  }}
                />
                {isPillarOpen ? (
                  <ExpandLessIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                ) : (
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary' }}
                  />
                )}
              </ListItemButton>
            )}

            <Collapse in={collapsed || isPillarOpen} timeout="auto" unmountOnExit>
              {collapsed
                ? pillar.items.map((item) => (
                    <NavItemLink
                      key={item.id}
                      item={item}
                      collapsed
                      onClose={onClose}
                    />
                  ))
                : multiModule
                  ? pillar.groups.map((group) => {
                      const isModuleOpen =
                        Boolean(openModules[group.id]) ||
                        activeGroupId === group.id;
                      return (
                        <Box key={group.id} sx={{ mb: 0.25 }}>
                          <ListItemButton
                            onClick={() => toggleModule(group.id)}
                            sx={{
                              borderRadius: 1.25,
                              px: 1.5,
                              py: 0.45,
                              ml: 0.25,
                            }}
                          >
                            <ListItemText
                              primary={group.label}
                              slotProps={{
                                primary: {
                                  sx: {
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                  },
                                },
                              }}
                            />
                            {isModuleOpen ? (
                              <ExpandLessIcon
                                sx={{ fontSize: 16, color: 'text.secondary' }}
                              />
                            ) : (
                              <ExpandMoreIcon
                                sx={{ fontSize: 16, color: 'text.secondary' }}
                              />
                            )}
                          </ListItemButton>
                          <Collapse
                            in={isModuleOpen}
                            timeout="auto"
                            unmountOnExit
                          >
                            {/* Under multi-module pillars, list pages flat */}
                            {group.items.map((item) => (
                              <NavItemLink
                                key={item.id}
                                item={item}
                                collapsed={false}
                                onClose={onClose}
                                nested
                              />
                            ))}
                          </Collapse>
                        </Box>
                      );
                    })
                  : pillar.groups[0]
                    ? renderGroupContent(pillar.groups[0])
                    : null}
            </Collapse>
          </Box>
        );
      })}
    </List>
  );

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

  const content = (forMobile: boolean) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {brand}
      <Divider />
      {navList}
      {!forMobile ? collapseControl : null}
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
        {content(true)}
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
        {content(false)}
      </Drawer>
    </Box>
  );
}
