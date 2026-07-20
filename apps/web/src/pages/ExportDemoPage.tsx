import { useMemo, useState } from 'react';
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  ExportDialog,
  accountingReportExportDescriptor,
  boqProjectExportDescriptor,
  constructionReportExportDescriptor,
  financeDashboardExportDescriptor,
  tableCsvExportDescriptor,
} from '@/export';

type DemoKind =
  | 'accounting'
  | 'construction'
  | 'finance'
  | 'boq'
  | 'table';

/**
 * Dev-only Excel/CSV export framework demo (Micro Phase 020). Not in the sidebar.
 */
export function ExportDemoPage() {
  const { hasPermission } = useAuth();
  const [kind, setKind] = useState<DemoKind>('accounting');
  const [reportType, setReportType] = useState('trial-balance');
  const [projectId, setProjectId] = useState('');
  const [open, setOpen] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const descriptor = useMemo(() => {
    switch (kind) {
      case 'accounting':
        return accountingReportExportDescriptor({ reportType });
      case 'construction':
        return constructionReportExportDescriptor({
          reportType,
          requireProjectId: true,
        });
      case 'finance':
        return financeDashboardExportDescriptor();
      case 'boq':
        return boqProjectExportDescriptor(
          projectId || '507f1f77bcf86cd799439011',
        );
      case 'table':
        return tableCsvExportDescriptor({
          title: 'Export demo table CSV',
          fileName: 'demo-rows',
          rows: [
            { id: '1', code: 'PO-1', status: 'issued', amount: 1000 },
            { id: '2', code: 'PO-2', status: 'draft', amount: 250 },
          ],
          columns: [
            { field: 'code', headerName: 'Number' },
            { field: 'status', headerName: 'Status' },
            { field: 'amount', headerName: 'Amount' },
          ],
        });
      default: {
        const _exhaustive: never = kind;
        return _exhaustive;
      }
    }
  }, [kind, reportType, projectId]);

  const canOpen =
    !descriptor.permission || hasPermission(descriptor.permission);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Excel / CSV export demo</Typography>
      <Typography color="text.secondary">
        Reusable <code>ExportDialog</code> for Nest binary exports and table CSV.
        Open <code>/dev/export</code> (no menu item).
      </Typography>

      <Alert severity="info" variant="outlined">
        Permissions: <code>report.export</code> (reports / finance dashboard) or{' '}
        <code>boq.view</code> (BOQ Excel). Date range must satisfy{' '}
        <code>from ≤ to</code>; finance <code>horizonDays</code> max 180.
      </Alert>

      <FormControl sx={{ maxWidth: 360 }}>
        <InputLabel id="export-kind-label">Export source</InputLabel>
        <Select
          labelId="export-kind-label"
          label="Export source"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as DemoKind);
            if (e.target.value === 'accounting') {
              setReportType('trial-balance');
            } else if (e.target.value === 'construction') {
              setReportType('stock-balance');
            }
          }}
        >
          <MenuItem value="accounting">Accounting report</MenuItem>
          <MenuItem value="construction">Construction report</MenuItem>
          <MenuItem value="finance">Finance dashboard</MenuItem>
          <MenuItem value="boq">BOQ project Excel</MenuItem>
          <MenuItem value="table">Client table CSV</MenuItem>
        </Select>
      </FormControl>

      {kind === 'accounting' || kind === 'construction' ? (
        <TextField
          label="Report type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value.trim())}
          helperText="Exact Nest reportType path segment"
          sx={{ maxWidth: 420 }}
        />
      ) : null}

      {kind === 'boq' ||
      kind === 'accounting' ||
      kind === 'construction' ? (
        <TextField
          label="Project id (when required)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value.trim())}
          sx={{ maxWidth: 420 }}
        />
      ) : null}

      <Button
        variant="contained"
        disabled={!canOpen}
        onClick={() => {
          setOpen(true);
        }}
      >
        Open export dialog
      </Button>

      {!canOpen ? (
        <Typography color="warning.main">
          Missing permission {descriptor.permission}
        </Typography>
      ) : null}

      {lastExport ? (
        <Alert severity="success" variant="outlined">
          Last export: {lastExport}
        </Alert>
      ) : null}

      <ExportDialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        descriptor={descriptor}
        initialValues={{
          projectId:
            projectId ||
            (kind === 'boq' ? '507f1f77bcf86cd799439011' : ''),
        }}
        onSuccess={({ filename }) => {
          setLastExport(filename);
        }}
      />
    </Stack>
  );
}
