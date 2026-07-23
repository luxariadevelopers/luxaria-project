import { useMemo, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import type { PermissionCode } from '@/navigation/permissionCatalog';
import type { EntityDetailTab } from './types';

type Props = {
  tabs: readonly EntityDetailTab[];
  hasPermission: (code: PermissionCode) => boolean;
  /** Controlled tab id; defaults to first visible tab. */
  value?: string;
  onChange?: (tabId: string) => void;
};

/**
 * Detail body tabs. Tabs with a `permission` are omitted when unauthorised.
 * Always scrollable on narrow viewports with comfortable tap targets.
 */
export function EntityDetailTabs({
  tabs,
  hasPermission,
  value,
  onChange,
}: Props) {
  const visible = useMemo(
    () =>
      tabs.filter(
        (tab) => !tab.permission || hasPermission(tab.permission),
      ),
    [tabs, hasPermission],
  );

  const [internal, setInternal] = useState(visible[0]?.id ?? '');
  const activeId =
    value ??
    (visible.some((t) => t.id === internal) ? internal : (visible[0]?.id ?? ''));
  const active = visible.find((t) => t.id === activeId) ?? visible[0];

  if (visible.length === 0) {
    return null;
  }

  return (
    <Box data-testid="entity-detail-tabs" sx={{ minWidth: 0 }}>
      <Tabs
        value={active?.id ?? false}
        onChange={(_e, next: string) => {
          setInternal(next);
          onChange?.(next);
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 48,
          '& .MuiTab-root': {
            minHeight: 48,
            minWidth: 'auto',
            px: { xs: 1.5, sm: 2 },
            textTransform: 'none',
            fontWeight: 600,
          },
        }}
      >
        {visible.map((tab) => (
          <Tab key={tab.id} value={tab.id} label={tab.label} />
        ))}
      </Tabs>
      <Box sx={{ pt: 2, minWidth: 0 }}>{active?.content}</Box>
    </Box>
  );
}
