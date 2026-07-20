import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Controller,
  useWatch,
  type Control,
  type FieldArrayWithId,
  type UseFieldArrayAppend,
  type UseFieldArrayRemove,
  type UseFormSetValue,
} from 'react-hook-form';
import { formatInr } from '@/format';
import type { PublicAccount } from '@/chart-of-accounts/types';
import type { ProjectOption } from '@luxaria/shared-types';
import { JournalPartyType } from './types';
import {
  emptyJournalLine,
  type JournalCreateFormValues,
} from './validation';

const PARTY_OPTIONS = Object.values(JournalPartyType).map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

type Props = {
  control: Control<JournalCreateFormValues>;
  fields: FieldArrayWithId<JournalCreateFormValues, 'lines', 'id'>[];
  append: UseFieldArrayAppend<JournalCreateFormValues, 'lines'>;
  remove: UseFieldArrayRemove;
  setValue: UseFormSetValue<JournalCreateFormValues>;
  accounts: readonly PublicAccount[];
  projects: readonly ProjectOption[];
  headerProjectId: string | null;
  disabled?: boolean;
};

/**
 * Dynamic debit/credit lines with account selector and dimension fields.
 * Dimensions surface when the selected account requires project/party.
 */
export function JournalLinesGrid({
  control,
  fields,
  append,
  remove,
  setValue,
  accounts,
  projects,
  headerProjectId,
  disabled = false,
}: Props) {
  const lines = useWatch({ control, name: 'lines' }) ?? [];

  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const postingAccounts = accounts.filter(
    (a) => a.status === 'active' && a.allowManualPosting,
  );

  return (
    <Box data-testid="journal-lines-grid">
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="subtitle1">Lines</Typography>
        <Button
          size="small"
          disabled={disabled}
          onClick={() => append(emptyJournalLine())}
        >
          Add line
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={56}>#</TableCell>
            <TableCell>Account</TableCell>
            <TableCell align="right" width={120}>
              Debit
            </TableCell>
            <TableCell align="right" width={120}>
              Credit
            </TableCell>
            <TableCell>Dimensions</TableCell>
            <TableCell width={80} />
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((field, index) => {
            const accountId = lines[index]?.accountId ?? '';
            const account = accountById.get(accountId);
            const needsProject =
              Boolean(account?.requiresProject) && !headerProjectId;
            const needsParty = Boolean(account?.requiresParty);

            return (
              <TableRow key={field.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Controller
                    name={`lines.${index}.accountId`}
                    control={control}
                    render={({ field: f, fieldState }) => (
                      <FormControl
                        size="small"
                        fullWidth
                        error={Boolean(fieldState.error)}
                        disabled={disabled}
                      >
                        <InputLabel id={`jl-acct-${index}`}>Account</InputLabel>
                        <Select
                          {...f}
                          labelId={`jl-acct-${index}`}
                          label="Account"
                          value={f.value ?? ''}
                        >
                          <MenuItem value="">
                            <em>Select account</em>
                          </MenuItem>
                          {postingAccounts.map((a) => (
                            <MenuItem key={a.id} value={a.id}>
                              {a.accountCode} — {a.accountName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Controller
                    name={`lines.${index}.description`}
                    control={control}
                    render={({ field: f }) => (
                      <TextField
                        {...f}
                        value={f.value ?? ''}
                        size="small"
                        fullWidth
                        margin="dense"
                        label="Line description"
                        disabled={disabled}
                      />
                    )}
                  />
                </TableCell>
                <TableCell align="right">
                  <Controller
                    name={`lines.${index}.debit`}
                    control={control}
                    render={({ field: f, fieldState }) => (
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        value={f.value === 0 ? '' : f.value}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          f.onChange(Number.isNaN(n) ? 0 : n);
                          if (Number(e.target.value) > 0) {
                            setValue(`lines.${index}.credit`, 0, {
                              shouldDirty: true,
                            });
                          }
                        }}
                        error={Boolean(fieldState.error)}
                        disabled={disabled}
                        sx={{ width: 110 }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell align="right">
                  <Controller
                    name={`lines.${index}.credit`}
                    control={control}
                    render={({ field: f, fieldState }) => (
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        value={f.value === 0 ? '' : f.value}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          f.onChange(Number.isNaN(n) ? 0 : n);
                          if (Number(e.target.value) > 0) {
                            setValue(`lines.${index}.debit`, 0, {
                              shouldDirty: true,
                            });
                          }
                        }}
                        error={Boolean(fieldState.error)}
                        disabled={disabled}
                        sx={{ width: 110 }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Stack spacing={1} sx={{ minWidth: 180 }}>
                    {(needsProject || account?.requiresProject) && (
                      <Controller
                        name={`lines.${index}.projectId`}
                        control={control}
                        render={({ field: f }) => (
                          <FormControl
                            size="small"
                            fullWidth
                            disabled={disabled || Boolean(headerProjectId)}
                          >
                            <InputLabel id={`jl-proj-${index}`}>
                              Project
                            </InputLabel>
                            <Select
                              {...f}
                              labelId={`jl-proj-${index}`}
                              label="Project"
                              value={f.value ?? headerProjectId ?? ''}
                            >
                              <MenuItem value="">
                                <em>
                                  {headerProjectId
                                    ? 'Using header project'
                                    : 'Select project'}
                                </em>
                              </MenuItem>
                              {projects.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                  {p.projectCode} — {p.projectName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    )}
                    {needsParty ? (
                      <>
                        <Controller
                          name={`lines.${index}.partyType`}
                          control={control}
                          render={({ field: f }) => (
                            <FormControl size="small" fullWidth disabled={disabled}>
                              <InputLabel id={`jl-ptype-${index}`}>
                                Party type
                              </InputLabel>
                              <Select
                                {...f}
                                labelId={`jl-ptype-${index}`}
                                label="Party type"
                                value={f.value ?? ''}
                              >
                                <MenuItem value="">
                                  <em>Select type</em>
                                </MenuItem>
                                {PARTY_OPTIONS.map((opt) => (
                                  <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                        <Controller
                          name={`lines.${index}.partyId`}
                          control={control}
                          render={({ field: f }) => (
                            <TextField
                              {...f}
                              value={f.value ?? ''}
                              size="small"
                              fullWidth
                              label="Party id"
                              helperText="Mongo id of vendor/contractor/etc."
                              disabled={disabled}
                            />
                          )}
                        />
                      </>
                    ) : null}
                    {!account ? (
                      <Typography variant="caption" color="text.secondary">
                        Select an account to see dimension rules
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={disabled || fields.length <= 2}
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Only active accounts with allowManualPosting are listed. Debit{' '}
        {formatInr(0)} / credit are exclusive per line.
      </Typography>
    </Box>
  );
}
