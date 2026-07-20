import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { formatInr } from '@/format';
import type { PublicQuotationComparison } from './types';
import {
  assertRecommendationReason,
  findLowestLandedCostVendor,
  isLowestLandedCostSelection,
  MIN_RECOMMENDATION_REASON_LENGTH,
  recommendFormSchema,
  type RecommendFormValues,
} from './validation';

type Props = {
  comparison: PublicQuotationComparison;
  selectedQuotationId: string | null;
  onSelectQuotation: (quotationId: string) => void;
  onRecommend: (input: {
    quotationId: string;
    reason?: string | null;
  }) => Promise<void>;
  onSubmitApproval: () => Promise<void>;
  canRecommend: boolean;
  canSubmitApproval: boolean;
  recommendPending?: boolean;
  submitPending?: boolean;
  editable: boolean;
};

/**
 * Vendor recommendation + lowest-cost reason gate + submit for approval.
 */
export function RecommendationPanel({
  comparison,
  selectedQuotationId,
  onSelectQuotation,
  onRecommend,
  onSubmitApproval,
  canRecommend,
  canSubmitApproval,
  recommendPending = false,
  submitPending = false,
  editable,
}: Props) {
  const lowest = useMemo(
    () => findLowestLandedCostVendor(comparison.vendors),
    [comparison.vendors],
  );

  const selected = useMemo(
    () =>
      comparison.vendors.find((v) => v.quotationId === selectedQuotationId) ??
      null,
    [comparison.vendors, selectedQuotationId],
  );

  const needsReason =
    selected != null &&
    lowest != null &&
    !isLowestLandedCostSelection(selected, lowest);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RecommendFormValues>({
    resolver: zodResolver(recommendFormSchema),
    defaultValues: {
      quotationId: selectedQuotationId ?? '',
      reason: comparison.recommendationReason ?? '',
      recommendedLandedCost: selected?.netLandedCost ?? 0,
      lowestLandedCost: lowest?.netLandedCost ?? 0,
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    reset({
      quotationId: selectedQuotationId ?? '',
      reason: comparison.recommendationReason ?? '',
      recommendedLandedCost: selected?.netLandedCost ?? 0,
      lowestLandedCost: lowest?.netLandedCost ?? 0,
    });
  }, [
    comparison.recommendationReason,
    lowest?.netLandedCost,
    reset,
    selected?.netLandedCost,
    selectedQuotationId,
  ]);

  useEffect(() => {
    setValue('quotationId', selectedQuotationId ?? '');
    setValue('recommendedLandedCost', selected?.netLandedCost ?? 0);
    setValue('lowestLandedCost', lowest?.netLandedCost ?? 0);
  }, [
    lowest?.netLandedCost,
    selected?.netLandedCost,
    selectedQuotationId,
    setValue,
  ]);

  const preview =
    selected && lowest
      ? assertRecommendationReason({
          recommendedLandedCost: selected.netLandedCost,
          lowestLandedCost: lowest.netLandedCost,
          reason: comparison.recommendationReason,
        })
      : null;

  return (
    <Stack
      spacing={2}
      component="section"
      data-testid="recommendation-panel"
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" component="h2">
        Recommendation
      </Typography>

      {lowest ? (
        <Typography variant="body2" color="text.secondary">
          Lowest net landed cost:{' '}
          <strong>
            {lowest.vendorName ?? lowest.vendorCode ?? lowest.vendorId}
          </strong>{' '}
          ({formatInr(lowest.netLandedCost)})
        </Typography>
      ) : null}

      {comparison.recommendedQuotationId ? (
        <Alert
          severity={comparison.isLowestVendorSelected ? 'success' : 'warning'}
          variant="outlined"
        >
          {comparison.isLowestVendorSelected
            ? 'Lowest-cost vendor is recommended.'
            : `Non-lowest vendor recommended — reason on file: ${
                comparison.recommendationReason ?? '—'
              }`}
        </Alert>
      ) : null}

      {editable && canRecommend ? (
        <Stack
          component="form"
          spacing={2}
          onSubmit={handleSubmit(async (values) => {
            await onRecommend({
              quotationId: values.quotationId,
              reason: values.reason?.trim() || null,
            });
          })}
        >
          <Controller
            name="quotationId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Recommended quotation"
                size="small"
                fullWidth
                error={Boolean(errors.quotationId)}
                helperText={errors.quotationId?.message}
                onChange={(e) => {
                  field.onChange(e);
                  onSelectQuotation(e.target.value);
                }}
                data-testid="recommend-quotation-select"
              >
                {comparison.vendors.map((v) => (
                  <MenuItem key={v.quotationId} value={v.quotationId}>
                    {v.vendorName ?? v.vendorCode ?? v.vendorId} ·{' '}
                    {v.quotationNumber} · {formatInr(v.netLandedCost)}
                    {v.isLowestLandedCost ? ' (lowest)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {needsReason ? (
            <Alert severity="warning" variant="outlined">
              Selected vendor is not the lowest landed cost. Provide a reason
              (min {MIN_RECOMMENDATION_REASON_LENGTH} characters).
            </Alert>
          ) : null}

          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                label={
                  needsReason
                    ? 'Reason for not selecting lowest cost'
                    : 'Reason (optional)'
                }
                size="small"
                fullWidth
                multiline
                minRows={2}
                required={needsReason}
                error={Boolean(errors.reason)}
                helperText={
                  errors.reason?.message ??
                  (needsReason
                    ? `Required · min ${MIN_RECOMMENDATION_REASON_LENGTH} characters`
                    : undefined)
                }
                data-testid="recommend-reason-field"
              />
            )}
          />

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            <Button
              type="submit"
              variant="contained"
              disabled={recommendPending || !selectedQuotationId}
              data-testid="save-recommendation-btn"
            >
              {recommendPending ? 'Saving…' : 'Save recommendation'}
            </Button>
            {canSubmitApproval ? (
              <Button
                type="button"
                variant="outlined"
                disabled={
                  submitPending ||
                  comparison.status !== 'recommended' ||
                  !comparison.recommendedQuotationId ||
                  (preview != null && !preview.ok)
                }
                onClick={() => {
                  void onSubmitApproval();
                }}
                data-testid="submit-approval-btn"
              >
                {submitPending ? 'Submitting…' : 'Submit for approval'}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={1}>
          {!canRecommend ? (
            <Typography variant="body2" color="text.secondary">
              You need <code>quotation.recommend</code> to set a recommendation.
            </Typography>
          ) : null}
          {canSubmitApproval && comparison.status === 'recommended' ? (
            <Button
              variant="contained"
              disabled={submitPending || !comparison.recommendedQuotationId}
              onClick={() => {
                void onSubmitApproval();
              }}
              data-testid="submit-approval-btn"
            >
              {submitPending ? 'Submitting…' : 'Submit for approval'}
            </Button>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
