import { useEffect, useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { useAuth } from '@/auth/AuthContext';
import { FormSection } from '@/components/forms/FormSection';
import { useDirectorsList } from '@/directors/useDirectors';
import { DirectorStatus } from '@/directors/types';
import { useInvestorsList } from '@/investors/useInvestors';
import { InvestorStatus } from '@/investors/types';
import { InstrumentType, RepaymentMode } from '@/project-participants/types';
import { equalDirectorCommitments } from './capitalPlan';
import type { ProjectFormValues } from './validation';

/**
 * Capital & profit plan — directors (profit % + expected invest) and optional investors.
 */
export function CapitalPlanFormSection() {
  const { hasPermission } = useAuth();
  const { control, setValue } = useFormContext<ProjectFormValues>();
  const directorsArray = useFieldArray({ control, name: 'capitalDirectors' });
  const investorsArray = useFieldArray({ control, name: 'capitalInvestors' });

  const approvedBudget = useWatch({ control, name: 'approvedBudget' });
  const equalDirectorInvestment = useWatch({
    control,
    name: 'equalDirectorInvestment',
  });
  const capitalDirectors = useWatch({ control, name: 'capitalDirectors' });
  const capitalInvestors = useWatch({ control, name: 'capitalInvestors' });

  const canViewDirectors = hasPermission('director.view');
  const canViewInvestors = hasPermission('investor.view');

  const directorsQuery = useDirectorsList(
    { page: 1, limit: 100, status: DirectorStatus.Active },
    canViewDirectors,
  );
  const investorsQuery = useInvestorsList(
    { page: 1, limit: 100, status: InvestorStatus.Active },
    canViewInvestors,
  );

  const directorOptions = useMemo(
    () =>
      (directorsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        label: `${row.directorCode} — ${row.fullName}`,
      })),
    [directorsQuery.data?.items],
  );

  const investorOptions = useMemo(
    () =>
      (investorsQuery.data?.items ?? []).map((row) => ({
        id: row.id,
        label: `${row.investorCode} — ${row.fullName}`,
      })),
    [investorsQuery.data?.items],
  );

  // Auto-split director commitments when equal toggle is on.
  useEffect(() => {
    if (!equalDirectorInvestment) return;
    const budget = Number(String(approvedBudget ?? '').trim());
    if (!Number.isFinite(budget) || budget <= 0) return;
    const rows = capitalDirectors ?? [];
    if (rows.length === 0) return;
    const investorTotal = (capitalInvestors ?? []).reduce((sum, row) => {
      const n = Number(row.commitmentAmount);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const amounts = equalDirectorCommitments(budget, rows.length, investorTotal);
    amounts.forEach((amount, index) => {
      const current = String(rows[index]?.commitmentAmount ?? '');
      if (current !== String(amount)) {
        setValue(`capitalDirectors.${index}.commitmentAmount`, String(amount), {
          shouldDirty: true,
        });
      }
    });
  }, [
    equalDirectorInvestment,
    approvedBudget,
    capitalDirectors?.length,
    capitalInvestors,
    setValue,
  ]);

  return (
    <FormSection
      title="Capital & profit plan"
      description="Director profit ownership and expected investment. Optional investors with budget % and loan repayment terms. Saved as project participants."
    >
      <Controller
        name="equalDirectorInvestment"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(field.value)}
                onChange={(_, checked) => field.onChange(checked)}
              />
            }
            label="Equal director investment (split remaining budget equally)"
          />
        )}
      />

      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="subtitle2">Directors</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={!canViewDirectors}
            onClick={() =>
              directorsArray.append({
                directorId: '',
                profitSharePercent: '',
                commitmentAmount: '',
              })
            }
          >
            Add director
          </Button>
        </Stack>

        {directorsArray.fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No capital directors yet. Add directors who will fund this project
            and own profit share.
          </Typography>
        ) : null}

        {directorsArray.fields.map((field, index) => (
          <Stack
            key={field.id}
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ alignItems: { md: 'flex-start' } }}
          >
            <Controller
              name={`capitalDirectors.${index}.directorId`}
              control={control}
              render={({ field: f }) => (
                <FormControl fullWidth size="small">
                  <InputLabel id={`cap-dir-${index}`}>Director</InputLabel>
                  <Select
                    {...f}
                    labelId={`cap-dir-${index}`}
                    label="Director"
                  >
                    <MenuItem value="">
                      <em>Select</em>
                    </MenuItem>
                    {directorOptions.map((opt) => (
                      <MenuItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name={`capitalDirectors.${index}.profitSharePercent`}
              control={control}
              render={({ field: f, fieldState }) => (
                <TextField
                  {...f}
                  size="small"
                  label="Profit %"
                  type="number"
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  sx={{ minWidth: 110 }}
                />
              )}
            />
            <Controller
              name={`capitalDirectors.${index}.commitmentAmount`}
              control={control}
              render={({ field: f, fieldState }) => (
                <TextField
                  {...f}
                  size="small"
                  label="Expected invest ₹"
                  type="number"
                  disabled={Boolean(equalDirectorInvestment)}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  sx={{ minWidth: 150 }}
                />
              )}
            />
            <IconButton
              aria-label="Remove director"
              onClick={() => directorsArray.remove(index)}
            >
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="subtitle2">Investors (optional)</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            disabled={!canViewInvestors}
            onClick={() =>
              investorsArray.append({
                investorId: '',
                budgetInvestmentPercentage: '',
                commitmentAmount: '',
                profitSharePercent: '0',
                instrumentType: InstrumentType.ProjectInvestment,
                repaymentMode: '',
                interestRate: '',
              })
            }
          >
            Add investor
          </Button>
        </Stack>

        {investorsArray.fields.map((field, index) => {
          const instrument = capitalInvestors?.[index]?.instrumentType;
          const repayment = capitalInvestors?.[index]?.repaymentMode;
          const isLoan = instrument === InstrumentType.UnsecuredLoan;
          return (
            <Stack key={field.id} spacing={1}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                sx={{ alignItems: { md: 'flex-start' } }}
              >
                <Controller
                  name={`capitalInvestors.${index}.investorId`}
                  control={control}
                  render={({ field: f }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel id={`cap-inv-${index}`}>Investor</InputLabel>
                      <Select
                        {...f}
                        labelId={`cap-inv-${index}`}
                        label="Investor"
                      >
                        <MenuItem value="">
                          <em>Select</em>
                        </MenuItem>
                        {investorOptions.map((opt) => (
                          <MenuItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name={`capitalInvestors.${index}.budgetInvestmentPercentage`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      size="small"
                      label="Budget %"
                      type="number"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      sx={{ minWidth: 110 }}
                      onChange={(event) => {
                        f.onChange(event);
                        const pct = Number(event.target.value);
                        const budget = Number(String(approvedBudget ?? '').trim());
                        if (
                          Number.isFinite(pct) &&
                          Number.isFinite(budget) &&
                          budget > 0
                        ) {
                          setValue(
                            `capitalInvestors.${index}.commitmentAmount`,
                            String(Math.round(((budget * pct) / 100) * 100) / 100),
                            { shouldDirty: true },
                          );
                        }
                      }}
                    />
                  )}
                />
                <Controller
                  name={`capitalInvestors.${index}.commitmentAmount`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      size="small"
                      label="Commitment ₹"
                      type="number"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      sx={{ minWidth: 140 }}
                    />
                  )}
                />
                <Controller
                  name={`capitalInvestors.${index}.profitSharePercent`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      size="small"
                      label="Profit %"
                      type="number"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      sx={{ minWidth: 100 }}
                    />
                  )}
                />
                <IconButton
                  aria-label="Remove investor"
                  onClick={() => investorsArray.remove(index)}
                >
                  <DeleteOutlineOutlinedIcon />
                </IconButton>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <Controller
                  name={`capitalInvestors.${index}.instrumentType`}
                  control={control}
                  render={({ field: f }) => (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel id={`cap-inv-inst-${index}`}>
                        Instrument
                      </InputLabel>
                      <Select
                        {...f}
                        labelId={`cap-inv-inst-${index}`}
                        label="Instrument"
                      >
                        <MenuItem value={InstrumentType.ProjectInvestment}>
                          Project investment
                        </MenuItem>
                        <MenuItem value={InstrumentType.UnsecuredLoan}>
                          Unsecured loan
                        </MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
                {isLoan ? (
                  <>
                    <Controller
                      name={`capitalInvestors.${index}.repaymentMode`}
                      control={control}
                      render={({ field: f }) => (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel id={`cap-inv-repay-${index}`}>
                            Repayment
                          </InputLabel>
                          <Select
                            {...f}
                            labelId={`cap-inv-repay-${index}`}
                            label="Repayment"
                          >
                            <MenuItem value={RepaymentMode.Lumpsum}>
                              Lump sum
                            </MenuItem>
                            <MenuItem value={RepaymentMode.WithInterest}>
                              With interest
                            </MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                    {repayment === RepaymentMode.WithInterest ? (
                      <Controller
                        name={`capitalInvestors.${index}.interestRate`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <TextField
                            {...f}
                            size="small"
                            label="Interest % p.a."
                            type="number"
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                            sx={{ minWidth: 130 }}
                          />
                        )}
                      />
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </FormSection>
  );
}
