import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
  Alert,
  Button,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/auth/AuthContext';
import { resolvePortalDocumentDownload } from './documentDownload';
import { resolveInvestorPortalCapabilities } from './roleAccess';
import type { AggregatedInvestorDocument } from './types';
import { usePortalDocumentDownload } from './usePortalDocumentDownload';

type Props = {
  rows: AggregatedInvestorDocument[];
};

function kindLabel(kind: AggregatedInvestorDocument['kind']): string {
  return kind === 'agreement' ? 'Agreement' : 'Report attachment';
}

export function InvestorDocumentList({ rows }: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveInvestorPortalCapabilities(hasPermission);
  const { download, downloadingId, error, clearError } =
    usePortalDocumentDownload();

  const columns: GridColDef<AggregatedInvestorDocument>[] = [
    {
      field: 'projectCode',
      headerName: 'Project',
      width: 120,
    },
    {
      field: 'title',
      headerName: 'Document',
      flex: 1,
      minWidth: 220,
    },
    {
      field: 'kind',
      headerName: 'Type',
      width: 150,
      renderCell: ({ row }) => (
        <Chip size="small" label={kindLabel(row.kind)} variant="outlined" />
      ),
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 140,
      valueGetter: (_v, row) => row.category ?? '—',
    },
    {
      field: 'uploadedAt',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) =>
        row.uploadedAt ? row.uploadedAt.slice(0, 10) : '—',
    },
    {
      field: 'download',
      headerName: 'Download',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        const resolution = resolvePortalDocumentDownload(
          row.documentPath,
          caps.canDownloadS3Documents,
        );
        if (!resolution.canDownload || !row.documentPath) {
          return (
            <Tooltip title={resolution.reason ?? 'Not downloadable'}>
              <span>
                <Button size="small" disabled startIcon={<DownloadOutlinedIcon />}>
                  Download
                </Button>
              </span>
            </Tooltip>
          );
        }
        return (
          <Button
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            loading={downloadingId === row.id}
            onClick={() => download(row.documentPath!, row.id)}
          >
            Download
          </Button>
        );
      },
    },
  ];

  return (
    <Stack spacing={2} data-testid="investor-document-list">
      <Typography variant="body2" color="text.secondary">
        Agreements and report attachments from authorised projects only. Data is
        aggregated from <code>GET /investor-portal/projects</code> and per-project
        detail — never from staff <code>/investors/:id/documents</code>.
      </Typography>
      {error ? (
        <Alert severity="warning" onClose={clearError}>
          {error}
        </Alert>
      ) : null}
      <DataTable
        title="Documents"
        rows={rows}
        columns={columns}
        height={480}
        getRowId={(row) => row.id}
      />
    </Stack>
  );
}
