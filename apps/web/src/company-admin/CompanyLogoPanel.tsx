import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Button, Paper, Stack, Typography } from '@mui/material';
import { getErrorMessage, toAppError } from '@/api/errors';
import { FieldErrorSummary } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { COMPANY_LOGO_ACCEPT, COMPANY_LOGO_MAX_BYTES } from './constants';
import { resolveCompanyLogoUrl } from './formatters';
import { useUploadCompanyLogo } from './hooks';
import type { PublicCompany } from './types';
import { validateCompanyLogo } from './validation';

type Props = {
  company: PublicCompany;
  canUploadLogo: boolean;
};

export function CompanyLogoPanel({ company, canUploadLogo }: Props) {
  const notify = useNotify();
  const mutation = useUploadCompanyLogo(company.id);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<unknown>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const appError = useMemo(
    () => (serverError ? toAppError(serverError, 'Unable to upload company logo') : null),
    [serverError],
  );
  const currentLogo = resolveCompanyLogoUrl(company.logo);

  const upload = async () => {
    if (!file || !canUploadLogo) return;
    const validationError = validateCompanyLogo(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError(null);
    setServerError(undefined);
    try {
      await mutation.mutateAsync(file);
      setFile(null);
      notify.success('Company logo uploaded');
    } catch (error) {
      setServerError(error);
      notify.error(getErrorMessage(error, 'Company logo could not be uploaded'));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} data-testid="company-logo-panel">
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Company logo</Typography>
          <Typography variant="body2" color="text.secondary">
            PNG, JPG, JPEG, WebP, or GIF. Maximum {COMPANY_LOGO_MAX_BYTES / (1024 * 1024)} MB.
          </Typography>
        </Stack>

        {!canUploadLogo ? (
          <Alert severity="info">You need company.upload_logo to replace the company logo.</Alert>
        ) : null}

        {localError ? <Alert severity="error">{localError}</Alert> : null}
        {appError ? (
          <Alert severity="error">
            {appError.message}
            <FieldErrorSummary error={appError} />
          </Alert>
        ) : null}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Avatar
            src={previewUrl ?? currentLogo ?? undefined}
            alt={`${company.tradeName} logo preview`}
            variant="rounded"
            sx={{ width: 112, height: 112, fontSize: 32 }}
          >
            {company.tradeName.slice(0, 2).toUpperCase()}
          </Avatar>
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Button
              component="label"
              variant="outlined"
              disabled={!canUploadLogo || mutation.isPending}
            >
              Choose logo
              <input
                hidden
                type="file"
                aria-label="Company logo file"
                accept={COMPANY_LOGO_ACCEPT}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  setServerError(undefined);
                  if (!next) {
                    setFile(null);
                    setLocalError(null);
                    return;
                  }
                  const error = validateCompanyLogo(next);
                  setLocalError(error);
                  setFile(error ? null : next);
                  event.target.value = '';
                }}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {file
                ? `${file.name} · ${Math.ceil(file.size / 1024)} KB`
                : company.logo
                  ? 'Current logo on file'
                  : 'No logo on file'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                type="button"
                variant="contained"
                disabled={!canUploadLogo || !file || Boolean(localError) || mutation.isPending}
                onClick={() => void upload()}
              >
                {mutation.isPending ? 'Uploading…' : 'Upload logo'}
              </Button>
              {file ? (
                <Button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setFile(null);
                    setLocalError(null);
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
