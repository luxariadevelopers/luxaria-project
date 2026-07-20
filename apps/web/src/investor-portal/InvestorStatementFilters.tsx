import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { useAuth } from '@/auth/AuthContext';
import { resolvePortalDocumentDownload } from './documentDownload';
import { resolveInvestorPortalCapabilities } from './roleAccess';
import {
  INVESTOR_REPORT_TYPE_OPTIONS,
  type AggregatedInvestorStatement,
  type InvestorStatementFilters,
} from './types';
import { usePortalDocumentDownload } from './usePortalDocumentDownload';

type ProjectOption = {
  value: string;
  label: string;
};

type Props = {
  rows: AggregatedInvestorStatement[];
  filters: InvestorStatementFilters;
  projectOptions: ProjectOption[];
  onFiltersChange: (next: InvestorStatementFilters) => void;
};

export function InvestorStatementFilters({
  rows,
  filters,
  projectOptions,
  onFiltersChange,
}: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveInvestorPortalCapabilities(hasPermission);
  const { download, downloadingId, error, clearError } =
    usePortalDocumentDownload();

  const patch = (partial: Partial<InvestorStatementFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const columns: GridColDef<AggregatedInvestorStatement>[] = [
    {
      field: 'kind',
      headerName: 'Kind',
      width: 100,
      valueGetter: (_v, row) =>
        row.kind === 'report' ? 'Report' : 'Receipt',
    },
    {
      field: 'projectCode',
      headerName: 'Project',
      width: 120,
    },
    {
      field: 'title',
      headerName: 'Title / receipt',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'reportType',
      headerName: 'Report type',
      width: 140,
      valueGetter: (_v, row) => row.reportType ?? '—',
    },
    {
      field: 'eventDate',
      headerName: 'Date',
      width: 120,
      valueGetter: (_v, row) => {
        const iso = row.publishedAt ?? row.receivedDate;
        return iso ? iso.slice(0, 10) : '—';
      },
    },
    {
      field: 'summary',
      headerName: 'Summary',
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) => row.summary ?? '—',
    },
    {
      field: 'download',
      headerName: 'Attachment',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => {
        if (row.kind !== 'report' || !row.documentPath) {
          return '—';
        }
        const resolution = resolvePortalDocumentDownload(
          row.documentPath,
          caps.canDownloadS3Documents,
        );
        if (!resolution.canDownload) {
          return (
            <Tooltip title={resolution.reason ?? 'Not downloadable'}>
              <span>—</span>
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
    <Stack spacing={2} data-testid="investor-statement-filters">
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr)) auto auto',
          },
        }}
      >
        <FormControl fullWidth size="small">
          <InputLabel id="investor-statement-project">Project</InputLabel>
          <Select
            labelId="investor-statement-project"
            label="Project"
            value={filters.projectId}
            onChange={(event) =>
              patch({ projectId: event.target.value as string | 'all' })
            }
          >
            <MenuItem value="all">All authorised projects</MenuItem>
            {projectOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel id="investor-statement-kind">Kind</InputLabel>
          <Select
            labelId="investor-statement-kind"
            label="Kind"
            value={filters.kind}
            onChange={(event) =>
              patch({
                kind: event.target.value as InvestorStatementFilters['kind'],
              })
            }
          >
            <MenuItem value="all">Reports & receipts</MenuItem>
            <MenuItem value="report">Reports only</MenuItem>
            <MenuItem value="receipt">Receipts only</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel id="investor-statement-report-type">Report type</InputLabel>
          <Select
            labelId="investor-statement-report-type"
            label="Report type"
            value={filters.reportType}
            onChange={(event) =>
              patch({ reportType: event.target.value as string | 'all' })
            }
          >
            {INVESTOR_REPORT_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          size="small"
          label="From"
          type="date"
          value={filters.fromDate ?? ''}
          onChange={(event) => patch({ fromDate: event.target.value || null })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          fullWidth
          size="small"
          label="To"
          type="date"
          value={filters.toDate ?? ''}
          onChange={(event) => patch({ toDate: event.target.value || null })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      {error ? (
        <Alert severity="warning" onClose={clearError}>
          {error}
        </Alert>
      ) : null}

      <DataTable
        title={`Statements (${rows.length})`}
        rows={rows}
        columns={columns}
        height={480}
        getRowId={(row) => row.id}
      />
    </Stack>
  );
}
