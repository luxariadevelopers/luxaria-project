import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  fixedAssetCategoryLabel,
  fixedAssetStatusLabel,
} from './labels';
import {
  FixedAssetCategory,
  FixedAssetStatus,
  type FixedAssetCategory as Category,
  type FixedAssetStatus as Status,
} from './types';

export type FixedAssetFilterState = {
  status: Status | '';
  category: Category | '';
};

type Props = {
  value: FixedAssetFilterState;
  onChange: (next: FixedAssetFilterState) => void;
};

export function FixedAssetFilters({ value, onChange }: Props) {
  const patch = (partial: Partial<FixedAssetFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="fa-category">Category</InputLabel>
        <Select
          labelId="fa-category"
          label="Category"
          value={value.category}
          onChange={(e) => patch({ category: e.target.value as Category | '' })}
        >
          <MenuItem value="">
            <em>All categories</em>
          </MenuItem>
          {Object.values(FixedAssetCategory).map((c) => (
            <MenuItem key={c} value={c}>
              {fixedAssetCategoryLabel(c)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="fa-status">Status</InputLabel>
        <Select
          labelId="fa-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as Status | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(FixedAssetStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {fixedAssetStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
