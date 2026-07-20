import { useMemo, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import { EditMaterialDrawer } from '@/materials/EditMaterialDrawer';
import { MaterialConversionTable } from '@/materials/MaterialConversionTable';
import { MaterialSpecSummary } from '@/materials/MaterialSpecSummary';
import { MaterialStatusChip } from '@/materials/MaterialStatusChip';
import { MaterialStockCards } from '@/materials/MaterialStockCards';
import { MaterialUsageTable } from '@/materials/MaterialUsageTable';
import { materialSubtitle, materialUnitLabel } from '@/materials/labels';
import { MATERIALS_LIST_PATH } from '@/materials/paths';
import { resolveMaterialCapabilities } from '@/materials/roleAccess';
import {
  useMaterialDetail,
  useMaterialProjectStock,
  useMaterialUsageLedger,
} from '@/materials/useMaterials';

/**
 * Material detail — `/inventory/materials/:materialId` (Micro Phase 059).
 *
 * Nest: GET /materials/:id, PATCH /materials/:id,
 * GET /stock-ledger/balance, GET /stock-ledger (usage references).
 */
export function MaterialDetailPage() {
  const { materialId = '' } = useParams<{ materialId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialCapabilities(hasPermission);
  const { selectedProjectId, projects } = useProject();
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId ?? null;

  const detailQuery = useMaterialDetail(materialId || null, canView);
  const material = detailQuery.data;

  const stockQuery = useMaterialProjectStock(
    { materialId: materialId || null, projectId },
    canView && caps.canViewStock && Boolean(material) && Boolean(projectId),
  );

  const usageQuery = useMaterialUsageLedger(
    materialId || null,
    { projectId: projectId ?? undefined, page: 1, limit: 25 },
    canView &&
      caps.canViewStock &&
      Boolean(material) &&
      Boolean(projectId) &&
      (tab === 'usage' || tab === 'stock'),
  );

  const projectLabel = useMemo(() => {
    if (!projectId) return 'No project selected';
    const p = projects.find((x) => x.id === projectId);
    if (!p) return projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [projectId, projects]);

  const summaryFields = useMemo(() => {
    if (!material) return [];
    return [
      {
        id: 'unit',
        label: 'Base unit',
        value: materialUnitLabel(material.baseUnit),
      },
      {
        id: 'rate',
        label: 'Standard rate',
        value: formatInr(material.standardRate),
      },
      {
        id: 'category',
        label: 'Category',
        value: material.category,
      },
      {
        id: 'locked',
        label: 'Base unit lock',
        value: material.baseUnitLocked ? 'Locked' : 'Editable',
      },
    ];
  }, [material]);

  const actions: EntityDetailAction[] = material
    ? [
        {
          id: 'edit',
          label: 'Edit',
          permission: 'material.manage',
          allowedStatuses: ['active', 'inactive'],
          onClick: () => setEditOpen(true),
          disabled: !caps.canManage,
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Material unavailable"
        message="You need the material.view permission to open material detail."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Material denied"
        message="The server denied access to this material (403)."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={Boolean(projectId)}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !material
        }
        permissionTitle="Material unavailable"
        permissionMessage="You need the material.view permission to open material detail."
        notFoundTitle="Material not found"
        notFoundDescription="This material id is invalid or the record was removed."
        header={
          material ? (
            <DetailHeader
              title={material.name}
              code={material.materialCode}
              subtitle={materialSubtitle(material)}
              backTo={MATERIALS_LIST_PATH}
              backLabel="Materials"
              meta={<MaterialStatusChip status={material.status} />}
            />
          ) : undefined
        }
        summary={
          material ? <SummaryCards fields={summaryFields} /> : undefined
        }
        actionBar={
          material ? (
            <EntityActionBar
              actions={actions}
              status={material.status}
              hasPermission={hasPermission}
              emptyHint="Edit requires material.manage."
            />
          ) : undefined
        }
        tabs={
          material ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: (
                    <div data-testid="material-detail-page">
                      <MaterialSpecSummary material={material} />
                    </div>
                  ),
                },
                {
                  id: 'conversions',
                  label: 'Conversions',
                  content: (
                    <Stack spacing={1}>
                      <Typography variant="h6">Unit conversions</Typography>
                      <Typography variant="body2" color="text.secondary">
                        1 × alternate unit = factor ×{' '}
                        {materialUnitLabel(material.baseUnit)}.
                      </Typography>
                      <MaterialConversionTable material={material} />
                    </Stack>
                  ),
                },
                {
                  id: 'stock',
                  label: 'Stock',
                  content: (
                    <Stack spacing={2}>
                      {!caps.canViewStock ? (
                        <PermissionDenied
                          title="Stock unavailable"
                          message="You need the stock.view permission to inspect project stock."
                          showHomeLink={false}
                        />
                      ) : null}
                      {caps.canViewStock &&
                      stockQuery.error &&
                      isForbiddenError(stockQuery.error) ? (
                        <PermissionDenied
                          error={stockQuery.error}
                          title="Stock denied"
                          message="The server denied access to project stock (403)."
                          showHomeLink={false}
                        />
                      ) : null}
                      {caps.canViewStock &&
                      stockQuery.error &&
                      !isForbiddenError(stockQuery.error) ? (
                        <Alert
                          severity="warning"
                          action={
                            <Button
                              color="inherit"
                              size="small"
                              onClick={() => void stockQuery.refetch()}
                            >
                              Retry
                            </Button>
                          }
                        >
                          {getErrorMessage(stockQuery.error)}
                        </Alert>
                      ) : null}
                      {caps.canViewStock && !stockQuery.error ? (
                        <MaterialStockCards
                          material={material}
                          balance={stockQuery.data}
                          loading={stockQuery.isLoading}
                          projectLabel={projectLabel}
                        />
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  id: 'usage',
                  label: 'Usage',
                  content: (
                    <Stack spacing={1}>
                      <Typography variant="h6">Usage references</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stock ledger movements for this material in{' '}
                        {projectLabel}.
                      </Typography>
                      {!caps.canViewStock ? (
                        <PermissionDenied
                          title="Usage unavailable"
                          message="You need the stock.view permission to inspect usage references."
                          showHomeLink={false}
                        />
                      ) : (
                        <MaterialUsageTable
                          rows={usageQuery.data?.items ?? []}
                          loading={
                            usageQuery.isLoading || usageQuery.isFetching
                          }
                          error={usageQuery.error}
                          onRetry={() => void usageQuery.refetch()}
                        />
                      )}
                    </Stack>
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      {material && caps.canManage ? (
        <EditMaterialDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          material={material}
        />
      ) : null}
    </>
  );
}
