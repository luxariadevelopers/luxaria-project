import { useQuery, useQueryClient } from '@tanstack/react-query';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { PublicDocument } from '@luxaria/shared-types';
import { listEntityDocuments } from '@/api/documents';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { DocumentUploadPanel, usePresignedDownload } from '@/documents';
import { COMPANY_STATUTORY_DOCUMENT_TYPES } from './companyStatutoryDocuments';
import type { PublicCompany } from './types';

type Props = {
  company: PublicCompany;
};

function StatutoryDownloadButton({ document }: { document: PublicDocument }) {
  const { hasPermission } = useAuth();
  const canDownload = hasPermission('document.download');
  const { loading, error, denied, ensureUrl } = usePresignedDownload({
    documentId: document.id,
    status: String(document.status),
    canDownload,
  });

  if (!canDownload || denied) {
    return (
      <Typography variant="caption" color="warning.main">
        {error ?? 'Missing permission document.download'}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Button
        size="small"
        variant="contained"
        startIcon={
          loading ? <CircularProgress size={14} /> : <DownloadOutlinedIcon />
        }
        disabled={loading}
        onClick={() => {
          void (async () => {
            const url = await ensureUrl();
            if (url) {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          })();
        }}
      >
        Download
      </Button>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}

function StatutoryDocumentSlot({
  companyId,
  documentType,
  label,
  documents,
  onUploaded,
}: {
  companyId: string;
  documentType: string;
  label: string;
  documents: readonly PublicDocument[];
  onUploaded: () => void;
}) {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('document.upload');
  const active = documents.filter(
    (doc) =>
      doc.documentType === documentType &&
      (doc.status === 'active' || doc.status === 'replaced'),
  );

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid={`company-statutory-doc-${documentType}`}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          Stored privately in S3. Use Download any time for urgent access.
        </Typography>

        {active.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No file uploaded yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {active.map((doc) => (
              <Stack
                key={doc.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="body2">{doc.originalFileName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.mimeType} · v{doc.version} · {doc.status}
                  </Typography>
                </Stack>
                <StatutoryDownloadButton document={doc} />
              </Stack>
            ))}
          </Stack>
        )}

        {canUpload ? (
          <DocumentUploadPanel
            title={`Upload ${label}`}
            multiple={false}
            allowCustomType={false}
            documentTypeOptions={[documentType]}
            context={{
              companyId,
              module: 'company',
              entityType: 'company',
              entityId: companyId,
              documentType,
            }}
            onConfirmedChange={(docs) => {
              if (docs.length > 0) {
                onUploaded();
              }
            }}
          />
        ) : null}
      </Stack>
    </Paper>
  );
}

/**
 * Company statutory files (PAN / MOA / AOA / COI / GST) via Nest documents S3 API.
 * Codes stay on `CompanyStatutoryForm`; this panel is files only.
 */
export function CompanyStatutoryDocumentsPanel({ company }: Props) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canView = hasPermission('document.view');
  const queryKey = ['documents', 'company', company.id, 'company'] as const;

  const query = useQuery({
    queryKey,
    enabled: canView && Boolean(company.id),
    queryFn: async () => {
      const res = await listEntityDocuments({
        entityType: 'company',
        entityId: company.id,
        module: 'company',
        limit: 100,
      });
      return res.items;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  if (!canView) {
    return (
      <PermissionDenied
        title="Statutory documents unavailable"
        message="You need document.view to open company statutory files."
        showHomeLink={false}
      />
    );
  }

  if (query.error) {
    if (isForbiddenError(query.error)) {
      return <PermissionDenied error={query.error} showHomeLink={false} />;
    }
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
        forceRetry
      />
    );
  }

  const items = query.data ?? [];

  return (
    <Stack spacing={2} data-testid="company-statutory-documents-panel">
      <Stack spacing={0.5}>
        <Typography variant="h6">Statutory documents</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload PAN, MOA, AOA, COI, and GST certificate files to the private S3
          bucket. Download anytime with a short-lived secure link.
        </Typography>
      </Stack>

      {query.isLoading ? (
        <Typography color="text.secondary">Loading documents…</Typography>
      ) : null}

      {!query.isLoading && items.length === 0 ? (
        <EmptyState
          title="No statutory documents yet"
          description="Upload each document type below. Files appear here after confirm."
        />
      ) : null}

      {COMPANY_STATUTORY_DOCUMENT_TYPES.map((slot) => (
        <StatutoryDocumentSlot
          key={slot.type}
          companyId={company.id}
          documentType={slot.type}
          label={slot.label}
          documents={items}
          onUploaded={refresh}
        />
      ))}

      {query.error ? (
        <Typography color="error">{getErrorMessage(query.error)}</Typography>
      ) : null}
    </Stack>
  );
}
