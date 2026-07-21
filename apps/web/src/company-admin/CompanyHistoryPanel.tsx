import { useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { EmptyState, RetryPanel } from '@/components/errors';
import { formatDate, formatInr } from '@/format';
import { ADDRESS_TYPE_LABELS, CAPITAL_TYPE_LABELS } from './constants';
import { formatCompanyAddress } from './formatters';
import { useCompanyAddressHistory, useCompanyCapitalHistory } from './hooks';
import {
  CompanyAddressType,
  CompanyCapitalType,
  type PublicAddressHistory,
  type PublicCapitalHistory,
} from './types';

type HistoryTab = 'addresses' | 'capital';

type Props = {
  companyId: string;
};

function LoadingHistory() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

function AddressMobileCard({ row }: { row: PublicAddressHistory }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">{ADDRESS_TYPE_LABELS[row.addressType]}</Typography>
          {row.effectiveTo === null ? <Chip size="small" color="success" label="Current" /> : null}
        </Stack>
        <Typography variant="body2">{formatCompanyAddress(row.address)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDate(row.effectiveFrom)} —{' '}
          {row.effectiveTo ? formatDate(row.effectiveTo) : 'Present'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {row.changeReason || 'No change reason recorded'}
        </Typography>
      </Stack>
    </Paper>
  );
}

function CapitalMobileCard({ row }: { row: PublicCapitalHistory }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={0.75}>
        <Typography variant="subtitle2">{CAPITAL_TYPE_LABELS[row.capitalType]}</Typography>
        <Typography variant="body2">
          {formatInr(row.previousAmount)} → {formatInr(row.newAmount)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Effective {formatDate(row.effectiveFrom)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {row.changeReason || 'No change reason recorded'}
          {row.reference ? ` · ${row.reference}` : ''}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function CompanyHistoryPanel({ companyId }: Props) {
  const [tab, setTab] = useState<HistoryTab>('addresses');
  const [addressPage, setAddressPage] = useState(1);
  const [capitalPage, setCapitalPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [addressType, setAddressType] = useState<CompanyAddressType | ''>('');
  const [capitalType, setCapitalType] = useState<CompanyCapitalType | ''>('');

  const addressQuery = useCompanyAddressHistory(
    companyId,
    {
      page: addressPage,
      limit: pageSize,
      addressType: addressType || undefined,
    },
    tab === 'addresses',
  );
  const capitalQuery = useCompanyCapitalHistory(
    companyId,
    {
      page: capitalPage,
      limit: pageSize,
      capitalType: capitalType || undefined,
    },
    tab === 'capital',
  );

  const changePageSize = (next: number) => {
    setPageSize(next);
    setAddressPage(1);
    setCapitalPage(1);
  };

  return (
    <Paper variant="outlined">
      <Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 2 }}>
        <Typography variant="h6">Company history</Typography>
        <Typography variant="body2" color="text.secondary">
          Address periods and append-only capital changes recorded by the company API.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_event, value: HistoryTab) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ px: { xs: 0.5, sm: 1 } }}
      >
        <Tab value="addresses" label="Address history" />
        <Tab value="capital" label="Capital history" />
      </Tabs>

      <Box sx={{ p: { xs: 1.5, sm: 2 }, pt: 1.5 }}>
        {tab === 'addresses' ? (
          <Stack spacing={1.5}>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 240 } }}>
              <InputLabel id="address-history-type-label">Address type</InputLabel>
              <Select
                labelId="address-history-type-label"
                label="Address type"
                value={addressType}
                onChange={(event) => {
                  setAddressType(event.target.value as CompanyAddressType | '');
                  setAddressPage(1);
                }}
              >
                <MenuItem value="">All address types</MenuItem>
                {Object.values(CompanyAddressType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {ADDRESS_TYPE_LABELS[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {addressQuery.isLoading ? (
              <LoadingHistory />
            ) : addressQuery.error ? (
              <RetryPanel
                error={addressQuery.error}
                onRetry={() => void addressQuery.refetch()}
                forceRetry
              />
            ) : (addressQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                title="No address history"
                description="Address changes will appear here after a profile update changes an address."
              />
            ) : (
              <>
                <Stack spacing={1} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                  {addressQuery.data?.items.map((row) => (
                    <AddressMobileCard key={row.id} row={row} />
                  ))}
                </Stack>
                <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Table size="small" aria-label="Address history">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>Effective from</TableCell>
                        <TableCell>Effective to</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {addressQuery.data?.items.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{ADDRESS_TYPE_LABELS[row.addressType]}</TableCell>
                          <TableCell sx={{ minWidth: 280 }}>
                            {formatCompanyAddress(row.address)}
                          </TableCell>
                          <TableCell>{formatDate(row.effectiveFrom)}</TableCell>
                          <TableCell>
                            {row.effectiveTo ? formatDate(row.effectiveTo) : 'Present'}
                          </TableCell>
                          <TableCell>{row.changeReason || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={addressQuery.data?.meta.total ?? 0}
                  page={Math.max(0, addressPage - 1)}
                  rowsPerPage={pageSize}
                  rowsPerPageOptions={[10, 20, 50]}
                  onPageChange={(_event, page) => setAddressPage(page + 1)}
                  onRowsPerPageChange={(event) => changePageSize(Number(event.target.value))}
                />
              </>
            )}
          </Stack>
        ) : null}

        {tab === 'capital' ? (
          <Stack spacing={1.5}>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 260 } }}>
              <InputLabel id="capital-history-type-label">Capital type</InputLabel>
              <Select
                labelId="capital-history-type-label"
                label="Capital type"
                value={capitalType}
                onChange={(event) => {
                  setCapitalType(event.target.value as CompanyCapitalType | '');
                  setCapitalPage(1);
                }}
              >
                <MenuItem value="">All capital types</MenuItem>
                {Object.values(CompanyCapitalType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {CAPITAL_TYPE_LABELS[type]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {capitalQuery.isLoading ? (
              <LoadingHistory />
            ) : capitalQuery.error ? (
              <RetryPanel
                error={capitalQuery.error}
                onRetry={() => void capitalQuery.refetch()}
                forceRetry
              />
            ) : (capitalQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                title="No capital history"
                description="Confirmed capital updates are append-only and will appear here."
              />
            ) : (
              <>
                <Stack spacing={1} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                  {capitalQuery.data?.items.map((row) => (
                    <CapitalMobileCard key={row.id} row={row} />
                  ))}
                </Stack>
                <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Table size="small" aria-label="Capital history">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Previous</TableCell>
                        <TableCell align="right">New</TableCell>
                        <TableCell>Effective from</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Reference</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {capitalQuery.data?.items.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{CAPITAL_TYPE_LABELS[row.capitalType]}</TableCell>
                          <TableCell align="right">{formatInr(row.previousAmount)}</TableCell>
                          <TableCell align="right">{formatInr(row.newAmount)}</TableCell>
                          <TableCell>{formatDate(row.effectiveFrom)}</TableCell>
                          <TableCell>{row.changeReason || '—'}</TableCell>
                          <TableCell>{row.reference || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={capitalQuery.data?.meta.total ?? 0}
                  page={Math.max(0, capitalPage - 1)}
                  rowsPerPage={pageSize}
                  rowsPerPageOptions={[10, 20, 50]}
                  onPageChange={(_event, page) => setCapitalPage(page + 1)}
                  onRowsPerPageChange={(event) => changePageSize(Number(event.target.value))}
                />
              </>
            )}
          </Stack>
        ) : null}
      </Box>
    </Paper>
  );
}
