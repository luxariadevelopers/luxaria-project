import { apiGet, isForbiddenError } from '@/api/client';
import {
  aggregateInvestorDocuments,
  aggregateInvestorStatements,
} from './aggregateDocuments';
import type {
  AggregatedInvestorDocument,
  AggregatedInvestorStatement,
  InvestorPortalProjectDetail,
  InvestorPortalProjectSummary,
} from './types';

export class InvestorPortalAccessError extends Error {
  readonly status = 403;

  constructor(message = 'Investor portal access denied') {
    super(message);
    this.name = 'InvestorPortalAccessError';
  }
}

/** `GET /investor-portal/projects` — `investor_portal.view` */
export async function fetchInvestorProjects() {
  return apiGet<InvestorPortalProjectSummary[]>('/investor-portal/projects');
}

/** `GET /investor-portal/projects/:projectId` — `investor_portal.view` */
export async function fetchInvestorProjectDetail(projectId: string) {
  return apiGet<InvestorPortalProjectDetail>(
    `/investor-portal/projects/${projectId}`,
  );
}

async function loadAuthorisedProjectDetails(
  summaries: InvestorPortalProjectSummary[],
) {
  const settled = await Promise.allSettled(
    summaries.map((project) => fetchInvestorProjectDetail(project.projectId)),
  );

  const details: (InvestorPortalProjectDetail | null)[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      details.push(result.value.data ?? null);
      continue;
    }
    if (isForbiddenError(result.reason)) {
      throw new InvestorPortalAccessError(
        'One or more projects are not authorised for this investor',
      );
    }
    throw result.reason;
  }

  return details;
}

export async function fetchInvestorDocuments(): Promise<
  AggregatedInvestorDocument[]
> {
  const projectsRes = await fetchInvestorProjects();
  const summaries = projectsRes.data ?? [];
  if (summaries.length === 0) {
    return [];
  }
  const details = await loadAuthorisedProjectDetails(summaries);
  return aggregateInvestorDocuments(summaries, details);
}

export async function fetchInvestorStatements(): Promise<
  AggregatedInvestorStatement[]
> {
  const projectsRes = await fetchInvestorProjects();
  const summaries = projectsRes.data ?? [];
  if (summaries.length === 0) {
    return [];
  }
  const details = await loadAuthorisedProjectDetails(summaries);
  return aggregateInvestorStatements(summaries, details);
}

export async function fetchInvestorPortalBundle() {
  const projectsRes = await fetchInvestorProjects();
  const summaries = projectsRes.data ?? [];
  if (summaries.length === 0) {
    return {
      projects: summaries,
      documents: [] as AggregatedInvestorDocument[],
      statements: [] as AggregatedInvestorStatement[],
    };
  }
  const details = await loadAuthorisedProjectDetails(summaries);
  return {
    projects: summaries,
    documents: aggregateInvestorDocuments(summaries, details),
    statements: aggregateInvestorStatements(summaries, details),
  };
}

export function isInvestorPortalAccessError(
  error: unknown,
): error is InvestorPortalAccessError {
  return error instanceof InvestorPortalAccessError;
}
