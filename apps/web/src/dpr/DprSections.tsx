import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatQuantity } from '@/format';
import { dprIssueSeverityLabel } from './labels';
import type { PublicDailyProgressReport } from './types';

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

export function DprLabourSection({
  dpr,
}: {
  dpr: Pick<
    PublicDailyProgressReport,
    'staffPresent' | 'labourCount' | 'skilledLabourCount' | 'unskilledLabourCount'
  >;
}) {
  return (
    <Stack spacing={2} data-testid="dpr-labour-section">
      <Typography variant="subtitle2">Labour summary</Typography>
      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="body2">Total: {dpr.labourCount}</Typography>
        <Typography variant="body2">Skilled: {dpr.skilledLabourCount}</Typography>
        <Typography variant="body2">
          Unskilled: {dpr.unskilledLabourCount}
        </Typography>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Present</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dpr.staffPresent.length === 0 ? (
              <EmptyRow colSpan={3} message="No staff attendance recorded." />
            ) : (
              dpr.staffPresent.map((row) => (
                <TableRow key={row.id || row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role ?? '—'}</TableCell>
                  <TableCell>{row.present ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

export function DprWorkSection({
  dpr,
}: {
  dpr: Pick<PublicDailyProgressReport, 'workPerformed' | 'boqQuantities' | 'equipmentUsed' | 'delays'>;
}) {
  return (
    <Stack spacing={3} data-testid="dpr-work-section">
      <Stack spacing={1}>
        <Typography variant="subtitle2">Work performed</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {dpr.workPerformed?.trim() || 'No work description recorded.'}
        </Typography>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">BOQ quantities completed</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dpr.boqQuantities.length === 0 ? (
                <EmptyRow colSpan={4} message="No BOQ progress logged." />
              ) : (
                dpr.boqQuantities.map((row) => (
                  <TableRow key={row.id || row.boqItemId}>
                    <TableCell>{row.boqCode ?? '—'}</TableCell>
                    <TableCell>{row.description ?? '—'}</TableCell>
                    <TableCell align="right">
                      {formatQuantity(row.quantityCompleted, row.unit)}
                    </TableCell>
                    <TableCell>{row.notes ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">Equipment used</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Equipment</TableCell>
                <TableCell align="right">Hours</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dpr.equipmentUsed.length === 0 ? (
                <EmptyRow colSpan={3} message="No equipment usage logged." />
              ) : (
                dpr.equipmentUsed.map((row) => (
                  <TableRow key={row.id || row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.hours}</TableCell>
                    <TableCell>{row.notes ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">Delays</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Hours lost</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dpr.delays.length === 0 ? (
                <EmptyRow colSpan={3} message="No delays reported." />
              ) : (
                dpr.delays.map((row) => (
                  <TableRow key={row.id || row.reason}>
                    <TableCell>{row.reason}</TableCell>
                    <TableCell align="right">{row.hoursLost}</TableCell>
                    <TableCell>{row.notes ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Stack>
  );
}

export function DprMaterialsSection({
  dpr,
}: {
  dpr: Pick<PublicDailyProgressReport, 'materialsReceived' | 'materialsIssued'>;
}) {
  return (
    <Stack spacing={3} data-testid="dpr-materials-section">
      {(['Received', 'Issued'] as const).map((kind) => {
        const rows =
          kind === 'Received' ? dpr.materialsReceived : dpr.materialsIssued;
        return (
          <Stack spacing={1} key={kind}>
            <Typography variant="subtitle2">Materials {kind.toLowerCase()}</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <EmptyRow
                      colSpan={3}
                      message={`No materials ${kind.toLowerCase()}.`}
                    />
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id || `${row.materialName}-${kind}`}>
                        <TableCell>{row.materialName}</TableCell>
                        <TableCell align="right">
                          {formatQuantity(row.quantity, row.unit)}
                        </TableCell>
                        <TableCell>{row.reference ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        );
      })}
    </Stack>
  );
}

export function DprIssuesSection({
  dpr,
}: {
  dpr: Pick<
    PublicDailyProgressReport,
    'safetyIssues' | 'qualityIssues' | 'decisionsRequired'
  >;
}) {
  return (
    <Stack spacing={3} data-testid="dpr-issues-section">
      {(
        [
          ['Safety issues', dpr.safetyIssues],
          ['Quality issues', dpr.qualityIssues],
        ] as const
      ).map(([title, rows]) => (
        <Stack spacing={1} key={title}>
          <Typography variant="subtitle2">{title}</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Action taken</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={3} message={`No ${title.toLowerCase()}.`} />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id || row.description}>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>
                        {dprIssueSeverityLabel(row.severity)}
                      </TableCell>
                      <TableCell>{row.actionTaken ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      ))}

      <Stack spacing={1}>
        <Typography variant="subtitle2">Decisions required</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Due</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dpr.decisionsRequired.length === 0 ? (
                <EmptyRow colSpan={3} message="No decisions flagged." />
              ) : (
                dpr.decisionsRequired.map((row) => (
                  <TableRow key={row.id || row.description}>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.owner ?? '—'}</TableCell>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Stack>
  );
}

export function DprPlanSection({
  dpr,
}: {
  dpr: Pick<PublicDailyProgressReport, 'tomorrowPlan'>;
}) {
  return (
    <Stack spacing={1} data-testid="dpr-plan-section">
      <Typography variant="subtitle2">Tomorrow&apos;s plan</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {dpr.tomorrowPlan?.trim() || 'No plan recorded for the next day.'}
      </Typography>
    </Stack>
  );
}
