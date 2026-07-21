import {
  Box,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import type { PublicRole } from '@/rbac-admin/types';
import { RoleStatus } from '@/rbac-admin/types';
import type { PublicUser } from '@/user-admin/types';
import type { PublicApprovalStep } from './types';

type Props = {
  step: PublicApprovalStep;
  index: number;
  roles: readonly PublicRole[];
  users: readonly PublicUser[];
  canPickRoles: boolean;
  canPickUsers: boolean;
  fieldErrors: Record<string, string>;
  onChange: (next: PublicApprovalStep) => void;
  onRemove: () => void;
  disableRemove: boolean;
};

export function WorkflowStepEditor({
  step,
  index,
  roles,
  users,
  canPickRoles,
  canPickUsers,
  fieldErrors,
  onChange,
  onRemove,
  disableRemove,
}: Props) {
  const prefix = `steps.${index}`;
  const activeRoles = roles.filter((role) => role.status === RoleStatus.Active);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle1">Step {step.stepNumber}</Typography>
          <IconButton
            aria-label={`Remove step ${step.stepNumber}`}
            size="small"
            disabled={disableRemove}
            onClick={onRemove}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>

        {canPickRoles ? (
          <FormControl
            size="small"
            fullWidth
            error={Boolean(fieldErrors[`${prefix}.assignees`] || fieldErrors[`${prefix}.roleIds`])}
          >
            <InputLabel id={`${prefix}-roles-label`}>Approver roles</InputLabel>
            <Select
              labelId={`${prefix}-roles-label`}
              label="Approver roles"
              multiple
              value={step.roleIds}
              onChange={(event) => {
                const value = event.target.value;
                onChange({
                  ...step,
                  roleIds:
                    typeof value === 'string' ? value.split(',') : value,
                });
              }}
              renderValue={(selected) =>
                selected
                  .map(
                    (id) =>
                      activeRoles.find((role) => role.id === id)?.name ?? id,
                  )
                  .join(', ')
              }
            >
              {activeRoles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name} ({role.code})
                </MenuItem>
              ))}
            </Select>
            {(fieldErrors[`${prefix}.assignees`] ||
              fieldErrors[`${prefix}.roleIds`]) && (
              <FormHelperText>
                {fieldErrors[`${prefix}.assignees`] ??
                  fieldErrors[`${prefix}.roleIds`]}
              </FormHelperText>
            )}
          </FormControl>
        ) : (
          <TextField
            size="small"
            label="Approver role ids"
            helperText={
              fieldErrors[`${prefix}.assignees`] ??
              fieldErrors[`${prefix}.roleIds`] ??
              'Comma-separated role ids (role.view required for picker)'
            }
            error={Boolean(
              fieldErrors[`${prefix}.assignees`] ||
                fieldErrors[`${prefix}.roleIds`],
            )}
            value={step.roleIds.join(', ')}
            onChange={(event) =>
              onChange({
                ...step,
                roleIds: event.target.value
                  .split(',')
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
            fullWidth
          />
        )}

        {canPickUsers ? (
          <FormControl
            size="small"
            fullWidth
            error={Boolean(fieldErrors[`${prefix}.specificUserIds`])}
          >
            <InputLabel id={`${prefix}-users-label`}>
              Specific approvers (optional)
            </InputLabel>
            <Select
              labelId={`${prefix}-users-label`}
              label="Specific approvers (optional)"
              multiple
              value={step.specificUserIds}
              onChange={(event) => {
                const value = event.target.value;
                onChange({
                  ...step,
                  specificUserIds:
                    typeof value === 'string' ? value.split(',') : value,
                });
              }}
              renderValue={(selected) =>
                selected
                  .map(
                    (id) =>
                      users.find((user) => user.id === id)?.fullName ?? id,
                  )
                  .join(', ')
              }
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName} ({user.userCode})
                </MenuItem>
              ))}
            </Select>
            {fieldErrors[`${prefix}.specificUserIds`] ? (
              <FormHelperText>
                {fieldErrors[`${prefix}.specificUserIds`]}
              </FormHelperText>
            ) : null}
          </FormControl>
        ) : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="Minimum amount"
            type="number"
            value={step.minimumAmount}
            error={Boolean(fieldErrors[`${prefix}.minimumAmount`])}
            helperText={fieldErrors[`${prefix}.minimumAmount`]}
            onChange={(event) =>
              onChange({
                ...step,
                minimumAmount: Number(event.target.value),
              })
            }
            fullWidth
          />
          <TextField
            size="small"
            label="Maximum amount"
            type="number"
            placeholder="No upper bound"
            value={step.maximumAmount ?? ''}
            error={Boolean(fieldErrors[`${prefix}.maximumAmount`])}
            helperText={
              fieldErrors[`${prefix}.maximumAmount`] ??
              'Leave blank for no upper bound'
            }
            onChange={(event) =>
              onChange({
                ...step,
                maximumAmount:
                  event.target.value === ''
                    ? null
                    : Number(event.target.value),
              })
            }
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="Escalation hours"
            type="number"
            placeholder="Optional"
            value={step.escalationHours ?? ''}
            error={Boolean(fieldErrors[`${prefix}.escalationHours`])}
            helperText={
              fieldErrors[`${prefix}.escalationHours`] ??
              'Escalate overdue step after this many hours'
            }
            onChange={(event) =>
              onChange({
                ...step,
                escalationHours:
                  event.target.value === ''
                    ? null
                    : Number(event.target.value),
              })
            }
            fullWidth
          />
          {canPickRoles ? (
            <FormControl size="small" fullWidth>
              <InputLabel id={`${prefix}-fallback-label`}>
                Fallback role
              </InputLabel>
              <Select
                labelId={`${prefix}-fallback-label`}
                label="Fallback role"
                value={step.fallbackRole ?? ''}
                onChange={(event) =>
                  onChange({
                    ...step,
                    fallbackRole: event.target.value
                      ? String(event.target.value)
                      : null,
                  })
                }
              >
                <MenuItem value="">None</MenuItem>
                {activeRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              size="small"
              label="Fallback role id"
              value={step.fallbackRole ?? ''}
              error={Boolean(fieldErrors[`${prefix}.fallbackRole`])}
              helperText={fieldErrors[`${prefix}.fallbackRole`]}
              onChange={(event) =>
                onChange({
                  ...step,
                  fallbackRole: event.target.value.trim()
                    ? event.target.value.trim()
                    : null,
                })
              }
              fullWidth
            />
          )}
        </Stack>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={step.requiresAll}
                onChange={(event) =>
                  onChange({ ...step, requiresAll: event.target.checked })
                }
              />
            }
            label="Requires all assignees to approve"
          />
        </Box>
      </Stack>
    </Paper>
  );
}
