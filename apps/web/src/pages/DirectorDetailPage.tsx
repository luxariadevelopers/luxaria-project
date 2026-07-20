import { useMemo, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
} from '@/components/entity-detail';
import { useNotify } from '@/components/NotificationProvider';
import { DirectorDocumentPanel } from '@/directors/DirectorDocumentPanel';
import { DirectorForm } from '@/directors/DirectorForm';
import { directorStatusLabel } from '@/directors/directorStatus';
import { resolveDirectorCapabilities } from '@/directors/roleAccess';
import { ShareholdingCard } from '@/directors/ShareholdingCard';
import {
  useActiveShareholding,
  useDirectorDetail,
  useDirectorDocuments,
  useUpdateDirector,
  useUploadDirectorDocument,
} from '@/directors/useDirectors';
import type { DirectorFormValues } from '@/directors/validation';

/**
 * Director detail (Micro Phase 031).
 * APIs: `GET/PATCH /directors/:id`, documents, `GET /company-shareholding`.
 */
export function DirectorDetailPage() {
  const { directorId } = useParams<{ directorId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveDirectorCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useDirectorDetail(directorId, canView);
  const docsQuery = useDirectorDocuments(
    directorId,
    canView && tab === 'documents',
  );
  const shareholdingQuery = useActiveShareholding(
    detailQuery.data?.companyId,
    canView && caps.canViewShareholding,
  );
  const update = useUpdateDirector(directorId ?? '');
  const upload = useUploadDirectorDocument(directorId ?? '');

  const director = detailQuery.data;

  const summaryFields = useMemo(() => {
    if (!director) return [];
    const holding = shareholdingQuery.data?.holdings.find(
      (h) => h.directorId === director.id,
    );
    return [
      { id: 'din', label: 'DIN', value: director.din ?? '—' },
      { id: 'pan', label: 'PAN', value: director.pan ?? '—' },
      { id: 'email', label: 'Email', value: director.email ?? '—' },
      {
        id: 'share',
        label: 'Shareholding',
        value: holding ? `${holding.percentage}%` : '—',
      },
    ];
  }, [director, shareholdingQuery.data]);

  const handleSave = async (values: DirectorFormValues) => {
    if (!caps.canUpdate || !directorId) return;
    try {
      await update.mutateAsync({
        fullName: values.fullName,
        din: values.din ?? null,
        pan: values.pan ?? null,
        email: values.email ?? null,
        phone: values.phone ?? null,
        address: values.address ?? null,
        appointmentDate: values.appointmentDate ?? null,
        status: values.status,
      });
      success('Director updated');
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <EntityDetailLayout
      canView={canView}
      projectReady
      loading={detailQuery.isLoading}
      error={detailQuery.error}
      onRetry={() => void detailQuery.refetch()}
      notFound={!detailQuery.isLoading && !detailQuery.error && !director}
      permissionTitle="Director unavailable"
      permissionMessage="You need the director.view permission to open this director."
      notFoundTitle="Director not found"
      notFoundDescription="This director may have been removed or the id is invalid."
      header={
        director ? (
          <DetailHeader
            title={director.fullName}
            code={director.directorCode}
            subtitle={director.email ?? undefined}
            backTo="/capital/directors"
            backLabel="Directors"
            meta={
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={directorStatusLabel(director.status)}
                  color={
                    director.status === 'active' ? 'success' : 'default'
                  }
                />
                {director.isPlaceholder ? (
                  <Chip size="small" label="Seed placeholder" variant="outlined" />
                ) : null}
              </Stack>
            }
          />
        ) : undefined
      }
      summary={
        director ? <SummaryCards fields={summaryFields} /> : undefined
      }
      tabs={
        director ? (
          <EntityDetailTabs
            hasPermission={hasPermission}
            value={tab}
            onChange={setTab}
            tabs={[
              {
                id: 'overview',
                label: 'Overview',
                content: (
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      {caps.canUpdate
                        ? 'Edit master fields. DIN/PAN formatting is validated when set.'
                        : 'Read-only — director.update is required to edit.'}
                    </Typography>
                    <DirectorForm
                      key={director.id + (director.updatedAt ?? '')}
                      initial={director}
                      readOnly={!caps.canUpdate}
                      submitting={update.isPending}
                      submitLabel="Save changes"
                      onSubmit={handleSave}
                    />
                  </Stack>
                ),
              },
              {
                id: 'documents',
                label: 'Documents',
                content: (
                  <DirectorDocumentPanel
                    documents={docsQuery.data ?? []}
                    loading={docsQuery.isLoading || docsQuery.isFetching}
                    error={docsQuery.error}
                    onRetry={() => void docsQuery.refetch()}
                    canView={caps.canView}
                    canUpload={caps.canUploadDocument}
                    uploading={upload.isPending}
                    onUpload={async (file, category) => {
                      try {
                        await upload.mutateAsync({ file, category });
                        success('Document uploaded');
                      } catch (err) {
                        notifyError(getErrorMessage(err));
                      }
                    }}
                  />
                ),
              },
              {
                id: 'shareholding',
                label: 'Shareholding',
                permission: 'shareholding.view',
                content: (
                  <ShareholdingCard
                    summary={shareholdingQuery.data}
                    loading={
                      shareholdingQuery.isLoading ||
                      shareholdingQuery.isFetching
                    }
                    error={shareholdingQuery.error}
                    onRetry={() => void shareholdingQuery.refetch()}
                    canView={caps.canViewShareholding}
                    focusDirectorId={director.id}
                  />
                ),
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
