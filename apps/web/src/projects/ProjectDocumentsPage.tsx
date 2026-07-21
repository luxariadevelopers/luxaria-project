import { useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PublishInvestorReportPanel } from '@/investor-portal/manage/PublishInvestorReportPanel';
import { canManageInvestorPortal } from '@/investor-portal/permissions';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { ProjectDocumentsPanel } from './ProjectDocumentsPanel';
import {
  useProjectDetail,
  useProjectDocuments,
  useUploadProjectDocument,
} from './useProjects';

type Props = {
  projectId?: string;
};

export function ProjectDocumentsPage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && hasPermission('project.view');
  const detailQuery = useProjectDetail(projectId, canView);
  const documentsQuery = useProjectDocuments(
    projectId,
    page,
    pageSize,
    undefined,
    canView,
  );
  const uploadMutation = useUploadProjectDocument(projectId ?? '');

  if (!access || (canView && detailQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (detailQuery.error && isForbiddenError(detailQuery.error)) ||
    (documentsQuery.error && isForbiddenError(documentsQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error ?? documentsQuery.error}
        title="Project documents unavailable"
        message="You need project.view and explicit access to this project."
      />
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <RetryPanel
        error={detailQuery.error ?? new Error('Project not found')}
        onRetry={() => void detailQuery.refetch()}
        forceRetry
      />
    );
  }

  const project = detailQuery.data;
  return (
    <Stack spacing={2.5} data-testid="project-documents-page">
      <DetailHeader
        title={`${project.projectName} documents`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />
      <PublishInvestorReportPanel
        projectId={project.id}
        canManage={canManageInvestorPortal(hasPermission)}
      />
      <ProjectDocumentsPanel
        documents={documentsQuery.data?.items ?? []}
        loading={documentsQuery.isLoading || documentsQuery.isFetching}
        error={documentsQuery.error}
        onRetry={() => void documentsQuery.refetch()}
        canView={canView}
        canUpload={hasPermission('project.upload_document')}
        uploading={uploadMutation.isPending}
        page={page}
        pageSize={pageSize}
        rowCount={documentsQuery.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
        onUpload={async (input) => {
          try {
            await uploadMutation.mutateAsync(input);
            notify.success('Project document uploaded');
          } catch (error) {
            notify.error(getErrorMessage(error));
          }
        }}
      />
    </Stack>
  );
}
