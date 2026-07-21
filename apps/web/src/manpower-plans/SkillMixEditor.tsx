import {
  Button,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  type Control,
  Controller,
  useFieldArray,
  type UseFormRegister,
} from 'react-hook-form';
import type { PublicLabourCategory } from '@/labour-categories/types';
import type { ManpowerPlanFormValues } from './validation';

type Props = {
  control: Control<ManpowerPlanFormValues>;
  register: UseFormRegister<ManpowerPlanFormValues>;
  useAgreementDefaults: boolean;
  categories: readonly PublicLabourCategory[];
  disabled?: boolean;
};

export function SkillMixEditor({
  control,
  register,
  useAgreementDefaults,
  categories,
  disabled = false,
}: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'skillMix',
  });

  if (useAgreementDefaults) {
    return (
      <Typography variant="body2" color="text.secondary">
        Skill mix and headcount will be copied from the active contractor
        agreement when the plan is saved.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="manpower-plan-skill-mix">
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle2">Skill mix</Typography>
        <Button
          size="small"
          disabled={disabled}
          onClick={() =>
            append({
              labourCategoryId: null,
              skill: '',
              plannedHeadcount: 0,
              isCritical: false,
            })
          }
        >
          Add skill
        </Button>
      </Stack>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Add skill lines or enable agreement defaults.
        </Typography>
      ) : null}

      {fields.map((field, index) => (
        <Stack
          key={field.id}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'flex-start' } }}
        >
          <TextField
            select
            size="small"
            label="Category"
            sx={{ minWidth: 160 }}
            disabled={disabled}
            defaultValue={field.labourCategoryId ?? ''}
            {...register(`skillMix.${index}.labourCategoryId`)}
            slotProps={{ select: { native: true } }}
          >
            <option value="">Custom</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Skill"
            sx={{ flex: 1, minWidth: 120 }}
            disabled={disabled}
            {...register(`skillMix.${index}.skill`)}
          />
          <TextField
            size="small"
            type="number"
            label="Headcount"
            sx={{ width: 110 }}
            disabled={disabled}
            {...register(`skillMix.${index}.plannedHeadcount`, {
              valueAsNumber: true,
            })}
          />
          <Controller
            control={control}
            name={`skillMix.${index}.isCritical`}
            render={({ field: criticalField }) => (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={Boolean(criticalField.value)}
                    onChange={criticalField.onChange}
                    disabled={disabled}
                  />
                }
                label="Critical"
              />
            )}
          />
          <IconButton
            aria-label="Remove skill line"
            disabled={disabled}
            onClick={() => remove(index)}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}
