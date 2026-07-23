import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DocumentStatus, type PublicDocument } from '@luxaria/shared-types';
import { archiveDocument } from '@/api/documents';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DataTable,
  type DataTableRowAction,
} from '@/components/data-table';
import { formDrawerPaperSx } from '@/components/forms';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDateTime } from '@/format';
import { resolveDocumentEntityLink } from './documentEntityLinks';
import { DocumentPreview } from './DocumentPreview';

type Props = {
  rows: PublicDocument[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  filterSlot: ReactNode;
  onArchived: () => void;
};

function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Document library table. Columns omit `s3Key` — downloads use presigned URLs only.
 */
export function DocumentTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  filterSlot,
  onArchived,
}: Props) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const { success, error: notifyError } = useNotify();
  const canArchive = hasPermission('document.archive');
  const canDownload = hasPermission('document.download');
  const [previewDoc, setPreviewDoc] = useState<PublicDocument | null>(null);
  const [archiveDenied, setArchiveDenied] = useState<unknown>(null);

  const columns: GridColDef<PublicDocument>[] = useMemo(
    () => [
      {
        field: 'documentCode',
        headerName: 'Code',
        width: 140,
      },
      {
        field: 'originalFileName',
        headerName: 'File',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'documentType',
        headerName: 'Type',
        width: 120,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => (
          <Chip size="small" variant="outlined" label={String(params.value)} />
        ),
      },
      {
        field: 'mimeType',
        headerName: 'MIME',
        width: 140,
      },
      {
        field: 'size',
        headerName: 'Size',
        width: 90,
        valueFormatter: (value: number) => formatBytes(value),
      },
      {
        field: 'version',
        headerName: 'Ver',
        width: 70,
        type: 'number',
      },
      {
        field: 'entity',
        headerName: 'Entity',
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: (params) => {
          const doc = params.row;
          const link = resolveDocumentEntityLink(doc, { hasAnyPermission });
          return (
            <Stack spacing={0.25} sx={{ py: 0.5, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {doc.entityType}
              </Typography>
              {link ? (
                <Link
                  component={RouterLink}
                  to={link.to}
                  variant="caption"
                  underline="hover"
                >
                  {link.label}
                </Link>
              ) : (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {doc.entityId}
                </Typography>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'uploadedAt',
        headerName: 'Uploaded',
        width: 150,
        valueFormatter: (value: string | Date | null) =>
          value ? formatDateTime(value) : '—',
      },
    ],
    [hasAnyPermission],
  );

  const rowActions: DataTableRowAction<PublicDocument>[] = [
    {
      id: 'preview',
      label: canDownload ? 'Preview / download' : 'Preview (no download)',
      permission: 'document.view',
      onClick: (row) => setPreviewDoc(row),
    },
    {
      id: 'archive',
      label: 'Archive',
      permission: 'document.archive',
      danger: true,
      disabled: (row) =>
        !canArchive || row.status !== DocumentStatus.Active,
      onClick: (row) => {
        void (async () => {
          try {
            setArchiveDenied(null);
            await archiveDocument(row.id);
            success('Document archived');
            onArchived();
          } catch (err) {
            if (isForbiddenError(err)) {
              setArchiveDenied(err);
            }
            notifyError(getErrorMessage(err, 'Archive failed'));
          }
        })();
      },
    },
  ];

  if (archiveDenied) {
    return (
      <PermissionDenied
        error={archiveDenied}
        title="Archive denied"
        message="You need document.archive (and project access) to archive."
      />
    );
  }

  return (
    <>
      <DataTable<PublicDocument>
        title="Document library"
        rows={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle="No documents"
        emptyDescription="Adjust entity filters or upload documents for this entity."
        paginationMode="server"
        sortingMode="client"
        page={page}
        pageSize={pageSize}
        rowCount={rowCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        filterSlot={filterSlot}
        rowActions={rowActions}
        getRowId={(row) => row.id}
        height={520}
        showColumnVisibility
        preferencesKey="document-library"
        mobileCard={{
          primaryField: 'originalFileName',
          metaFields: ['documentCode', 'documentType'],
          statusField: 'status',
        }}
      />

      <Drawer
        anchor="right"
        open={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        slotProps={{ paper: { sx: formDrawerPaperSx({ sm: 480, md: 640 }) } }}
      >
        <Box
          sx={{
            p: 3,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ minWidth: 0, wordBreak: 'break-word' }}>
              {previewDoc?.originalFileName ?? 'Document'}
            </Typography>
            {canArchive && previewDoc?.status === DocumentStatus.Active ? (
              <Button
                size="small"
                color="error"
                startIcon={<ArchiveOutlinedIcon />}
                onClick={() => {
                  if (!previewDoc) return;
                  void (async () => {
                    try {
                      await archiveDocument(previewDoc.id);
                      success('Document archived');
                      setPreviewDoc(null);
                      onArchived();
                    } catch (err) {
                      if (isForbiddenError(err)) {
                        setArchiveDenied(err);
                      }
                      notifyError(getErrorMessage(err, 'Archive failed'));
                    }
                  })();
                }}
              >
                Archive
              </Button>
            ) : null}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {previewDoc ? <DocumentPreview document={previewDoc} /> : null}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
