import {
  filterSelectableProjects,
  isProjectInAccessScope,
  resolveProjectSelection,
  shouldPreserveQueryOnProjectSwitch,
} from './selection';
import { ProjectStatus } from './status';
import type { ProjectAccessScope, ProjectOption } from './types';

const projects: ProjectOption[] = [
  {
    id: 'p1',
    projectCode: 'LX-01',
    projectName: 'Alpha',
    status: ProjectStatus.Construction,
  },
  {
    id: 'p2',
    projectCode: 'LX-02',
    projectName: 'Beta',
    status: ProjectStatus.Closed,
  },
  {
    id: 'p3',
    projectCode: 'LX-03',
    projectName: 'Gamma',
    status: ProjectStatus.Planning,
  },
];

describe('project selection helpers', () => {
  it('allows any id when globalAccess is true', () => {
    const access: ProjectAccessScope = { globalAccess: true, projectIds: [] };
    expect(isProjectInAccessScope('anything', access)).toBe(true);
  });

  it('restricts to assigned projectIds when not global', () => {
    const access: ProjectAccessScope = {
      globalAccess: false,
      projectIds: ['p1', 'p3'],
    };
    expect(isProjectInAccessScope('p1', access)).toBe(true);
    expect(isProjectInAccessScope('p2', access)).toBe(false);
  });

  it('filters out Closed/Cancelled from selectable list', () => {
    const access: ProjectAccessScope = {
      globalAccess: true,
      projectIds: [],
    };
    const selectable = filterSelectableProjects(projects, access);
    expect(selectable.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('clears stale persisted id not in project list', () => {
    const result = resolveProjectSelection({
      persistedId: 'gone',
      access: { globalAccess: false, projectIds: ['gone'] },
      projects: [projects[0]!],
      projectsReady: true,
      accessReady: true,
    });
    expect(result.shouldClearPersisted).toBe(true);
    expect(result.issue).toBe('stale');
    expect(result.activeProjectId).toBeNull();
  });

  it('clears unassigned persisted id', () => {
    const result = resolveProjectSelection({
      persistedId: 'p1',
      access: { globalAccess: false, projectIds: ['p3'] },
      projects,
      projectsReady: true,
      accessReady: true,
    });
    expect(result.shouldClearPersisted).toBe(true);
    expect(result.issue).toBe('unassigned');
  });

  it('clears Closed project selection', () => {
    const result = resolveProjectSelection({
      persistedId: 'p2',
      access: { globalAccess: true, projectIds: [] },
      projects,
      projectsReady: true,
      accessReady: true,
    });
    expect(result.shouldClearPersisted).toBe(true);
    expect(result.issue).toBe('invalid_status');
  });

  it('keeps a valid construction project', () => {
    const result = resolveProjectSelection({
      persistedId: 'p1',
      access: { globalAccess: false, projectIds: ['p1'] },
      projects,
      projectsReady: true,
      accessReady: true,
    });
    expect(result.activeProjectId).toBe('p1');
    expect(result.activeProject?.projectCode).toBe('LX-01');
    expect(result.shouldClearPersisted).toBe(false);
    expect(result.issue).toBeNull();
  });

  it('detects no project access', () => {
    const result = resolveProjectSelection({
      persistedId: 'p1',
      access: { globalAccess: false, projectIds: [] },
      projects: [],
      projectsReady: true,
      accessReady: true,
    });
    expect(result.hasNoProjectAccess).toBe(true);
    expect(result.shouldClearPersisted).toBe(true);
  });

  it('keeps access-valid id when project list is unavailable', () => {
    const result = resolveProjectSelection({
      persistedId: 'p1',
      access: { globalAccess: false, projectIds: ['p1'] },
      projects: [],
      projectsReady: true,
      accessReady: true,
      projectListAvailable: false,
    });
    expect(result.activeProjectId).toBe('p1');
    expect(result.shouldClearPersisted).toBe(false);
  });

  it('preserves auth and project meta query keys on switch', () => {
    expect(shouldPreserveQueryOnProjectSwitch(['auth', 'me'])).toBe(true);
    expect(shouldPreserveQueryOnProjectSwitch(['project-access', 'me'])).toBe(
      true,
    );
    expect(
      shouldPreserveQueryOnProjectSwitch(['projects', 'selector']),
    ).toBe(true);
    expect(
      shouldPreserveQueryOnProjectSwitch(['daily-progress-reports', 'p1']),
    ).toBe(false);
  });
});
