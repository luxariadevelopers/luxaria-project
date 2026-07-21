import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignProjectDirectors,
  assignProjectManager,
  createProject,
  createProjectAssignment,
  updateProjectStatus,
  uploadProjectDocument,
} from './api';
import {
  ProjectStage,
  ProjectStatus,
  ProjectType,
  type PublicProject,
} from './types';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const clientPost = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
  apiClient: {
    post: (...args: unknown[]) => clientPost(...args),
  },
}));

const project: PublicProject = {
  id: '507f1f77bcf86cd799439011',
  projectCode: 'PRJ-0001',
  projectName: 'Heights',
  description: null,
  projectType: ProjectType.Residential,
  address: {
    line1: 'Main Road',
    line2: null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    country: 'India',
  },
  latitude: null,
  longitude: null,
  siteRadiusMeters: null,
  landArea: null,
  builtUpArea: null,
  numberOfBlocks: null,
  numberOfUnits: null,
  startDate: null,
  expectedCompletionDate: null,
  actualCompletionDate: null,
  status: ProjectStatus.Planning,
  projectManager: null,
  assignedDirectors: [],
  defaultBankAccount: null,
  approvedBudget: null,
  projectStage: ProjectStage.Concept,
  reraDetails: {
    reraNumber: null,
    registrationDate: null,
    validUntil: null,
    authority: null,
    notes: null,
  },
  companyId: '507f1f77bcf86cd799439012',
};

describe('project API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    clientPost.mockReset();
  });

  it('creates through POST /projects without an editable projectCode', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'created',
      data: project,
    });
    const input = {
      projectName: 'Heights',
      projectType: ProjectType.Residential,
      address: project.address,
      companyId: project.companyId,
    };

    const created = await createProject(input);

    expect(apiPost).toHaveBeenCalledWith('/projects', input);
    expect(apiPost.mock.calls[0]?.[1]).not.toHaveProperty('projectCode');
    expect(created.projectCode).toBe('PRJ-0001');
  });

  it('uses the supported status, manager, and director action endpoints', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: project,
    });

    await updateProjectStatus(project.id, {
      status: ProjectStatus.Approval,
      note: 'Approved',
    });
    await assignProjectManager(project.id, '507f1f77bcf86cd799439013');
    await assignProjectDirectors(project.id, [
      '507f1f77bcf86cd799439014',
    ]);

    expect(apiPost).toHaveBeenNthCalledWith(
      1,
      `/projects/${project.id}/status`,
      { status: ProjectStatus.Approval, note: 'Approved' },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/projects/${project.id}/project-manager`,
      { projectManagerId: '507f1f77bcf86cd799439013' },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      3,
      `/projects/${project.id}/directors`,
      { directorIds: ['507f1f77bcf86cd799439014'] },
    );
  });

  it('creates an explicit project-access assignment', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'assigned',
      data: {
        id: '507f1f77bcf86cd799439020',
        userId: '507f1f77bcf86cd799439013',
        projectId: project.id,
        globalAccess: false,
        accessStartDate: '2026-07-21T00:00:00.000Z',
        accessEndDate: null,
        status: 'active',
        notes: null,
      },
    });

    await createProjectAssignment({
      userId: '507f1f77bcf86cd799439013',
      projectId: project.id,
      globalAccess: false,
      accessStartDate: '2026-07-21',
    });

    expect(apiPost).toHaveBeenCalledWith('/project-access/assignments', {
      userId: '507f1f77bcf86cd799439013',
      projectId: project.id,
      globalAccess: false,
      accessStartDate: '2026-07-21',
    });
  });

  it('uploads a project document as multipart form data', async () => {
    clientPost.mockResolvedValue({
      data: {
        success: true,
        message: 'uploaded',
        data: {
          id: 'doc-1',
          projectId: project.id,
          fileName: 'approval.pdf',
          filePath: 'uploads/projects/approval.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 4,
          category: 'approval',
          description: 'Planning approval',
          uploadedBy: null,
        },
      },
    });
    const file = new File(['test'], 'approval.pdf', {
      type: 'application/pdf',
    });

    await uploadProjectDocument(project.id, {
      file,
      category: 'approval',
      description: 'Planning approval',
    });

    const [url, body] = clientPost.mock.calls[0] as [string, FormData];
    expect(url).toBe(`/projects/${project.id}/documents`);
    expect(body.get('file')).toBe(file);
    expect(body.get('category')).toBe('approval');
    expect(body.get('description')).toBe('Planning approval');
  });
});
