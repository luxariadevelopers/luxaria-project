import { useState } from 'react';
import {
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import {
  labourCategoryStatusLabel,
  labourSkillLevelLabel,
} from './labels';
import { RateFormDrawer } from './RateFormDrawer';
import { RateOverridePanel } from './RateOverridePanel';
import type { LabourCategoryCapabilities } from './roleAccess';
import {
  LabourCategoryStatus,
  type PublicLabourCategory,
  type PublicLabourCategoryRate,
} from './types';
import {
  useActivateLabourCategory,
  useDeactivateLabourCategory,
} from './useLabourCategories';
import { CategoryFormDrawer } from './CategoryFormDrawer';

type Props = {
  open: boolean;
  onClose: () => void;
  category: PublicLabourCategory | null;
  caps: LabourCategoryCapabilities;
};

export function CategoryDetailDrawer({
  open,
  onClose,
  category,
  caps,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const activate = useActivateLabourCategory();
  const deactivate = useDeactivateLabourCategory();
  const [editOpen, setEditOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [editingRate, setEditingRate] =
    useState<PublicLabourCategoryRate | null>(null);

  if (!category) return null;

  const toggleStatus = () => {
    void (async () => {
      try {
        if (category.status === LabourCategoryStatus.Active) {
          await deactivate.mutateAsync(category.id);
          success('Labour category deactivated');
        } else {
          await activate.mutateAsync(category.id);
          success('Labour category activated');
        }
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Stack
          spacing={2}
          sx={{ width: { xs: '100vw', sm: 520 }, p: 2.5, maxWidth: '100%' }}
          data-testid="labour-category-detail-drawer"
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: 'center' }}
          >
            <Typography variant="h6" sx={{ flex: 1 }}>
              {category.name}
            </Typography>
            <Chip
              size="small"
              label={labourCategoryStatusLabel(category.status)}
              color={
                category.status === LabourCategoryStatus.Active
                  ? 'success'
                  : 'default'
              }
              variant="outlined"
            />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {category.categoryCode} · {labourSkillLevelLabel(category.skillLevel)}
            {category.isSystem ? ' · system' : null}
          </Typography>

          <Typography variant="body2">
            Company daily {formatInr(category.defaultDailyRate)} · OT{' '}
            {formatInr(category.overtimeRate)}
          </Typography>
          {category.notes ? (
            <Typography variant="body2" color="text.secondary">
              {category.notes}
            </Typography>
          ) : null}

          {caps.canManage ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button size="small" variant="outlined" onClick={toggleStatus}>
                {category.status === LabourCategoryStatus.Active
                  ? 'Deactivate'
                  : 'Activate'}
              </Button>
            </Stack>
          ) : null}

          <Divider />

          <RateOverridePanel
            category={category}
            caps={caps}
            onAddRate={() => {
              setEditingRate(null);
              setRateOpen(true);
            }}
            onEditRate={(rate) => {
              setEditingRate(rate);
              setRateOpen(true);
            }}
          />
        </Stack>
      </Drawer>

      <CategoryFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        category={category}
      />
      <RateFormDrawer
        open={rateOpen}
        onClose={() => {
          setRateOpen(false);
          setEditingRate(null);
        }}
        category={category}
        rate={editingRate}
      />
    </>
  );
}
