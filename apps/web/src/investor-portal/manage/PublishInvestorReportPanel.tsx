import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { InvestorVisibleReportType } from './types';
import { usePublishInvestorReport } from './hooks';
import {
  publishInvestorReportSchema,
  type PublishInvestorReportFormValues,
} from './validation';

type Props = {
  projectId: string;
  canManage: boolean;
};

const REPORT_TYPE_OPTIONS = [
  { value: InvestorVisibleReportType.Progress, label: 'Progress' },
  {
    value: InvestorVisibleReportType.FinancialSummary,
    label: 'Financial summary',
  },
  { value: InvestorVisibleReportType.BoardUpdate, label: 'Board update' },
  { value: InvestorVisibleReportType.Other, label: 'Other' },
];

export function PublishInvestorReportPanel({ projectId, canManage }: Props) {
  const publish = usePublishInvestorReport(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<PublishInvestorReportFormValues>({
    resolver: zodResolver(
      publishInvestorReportSchema,
    ) as Resolver<PublishInvestorReportFormValues>,
    defaultValues: {
      title: '',
      reportType: InvestorVisibleReportType.Progress,
      summary: '',
      documentPath: '',
    },
  });

  const reportTypeOptions = REPORT_TYPE_OPTIONS;

  if (!canManage) {
    return null;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await publish.mutateAsync({
        title: values.title.trim(),
        reportType: values.reportType,
        summary: values.summary.trim() || undefined,
        documentPath: values.documentPath.trim() || undefined,
      });
      success(
        response.message ?? `Report "${response.data?.title ?? values.title}" published`,
      );
      reset({
        title: '',
        reportType: values.reportType,
        summary: '',
        documentPath: '',
      });
    } catch (error) {
      if (isForbiddenError(error)) {
        notifyError('You do not have permission to publish investor reports.');
        return;
      }
      notifyError(getErrorMessage(error));
    }
  });

  return (
    <Card variant="outlined" data-testid="publish-investor-report-panel">
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1">Investor portal report</Typography>
            <Typography variant="body2" color="text.secondary">
              Publish a project report visible to authorised outside investors
              in the investor portal.               Requires{' '}
              <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                investor_portal.manage
              </Box>
              .
            </Typography>
          </Box>

          {publish.isError && isForbiddenError(publish.error) ? (
            <PermissionDenied
              error={publish.error}
              title="Publish denied"
              message="You need investor_portal.manage and project access to publish investor reports."
            />
          ) : (
            <Stack
              component="form"
              spacing={2}
              onSubmit={(event) => void onSubmit(event)}
            >
              <FormTextField
                control={control}
                name="title"
                label="Title"
                required
                disabled={publish.isPending}
              />
              <FormSelect
                control={control}
                name="reportType"
                label="Report type"
                options={reportTypeOptions}
                disabled={publish.isPending}
              />
              <FormTextField
                control={control}
                name="summary"
                label="Summary"
                multiline
                minRows={3}
                disabled={publish.isPending}
                helperText="Optional — avoid vendor or customer personal data."
              />
              <FormTextField
                control={control}
                name="documentPath"
                label="Document path or id"
                disabled={publish.isPending}
                helperText="Optional — uploads path or Mongo document id for download."
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="outlined"
                  disabled={publish.isPending}
                  onClick={() =>
                    reset({
                      title: '',
                      reportType: InvestorVisibleReportType.Progress,
                      summary: '',
                      documentPath: '',
                    })
                  }
                >
                  Clear
                </Button>
                <Button type="submit" variant="contained" disabled={publish.isPending}>
                  {publish.isPending ? 'Publishing…' : 'Publish report'}
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
