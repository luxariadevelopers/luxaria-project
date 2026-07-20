import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ActiveParticipantsPayload,
  CreateParticipantInput,
  CreateParticipantVersionInput,
  ParticipantApprovalStatus,
  ParticipantConfiguration,
  PublicProjectParticipant,
  UpdateParticipantInput,
} from './types';

function base(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/participants`;
}

function requireData<T>(data: T | null | undefined, message: string): T {
  if (data == null) {
    throw new Error(message);
  }
  return data;
}

/** `GET /projects/:projectId/participants` — `project_participant.view` */
export async function fetchActiveParticipants(
  projectId: string,
): Promise<ActiveParticipantsPayload> {
  const res = await apiGet<ActiveParticipantsPayload>(base(projectId));
  return requireData(res.data, res.message || 'Failed to load participants');
}

/** `GET /projects/:projectId/participants/configuration` — `project_participant.view` */
export async function fetchParticipantConfiguration(
  projectId: string,
): Promise<ParticipantConfiguration> {
  const res = await apiGet<ParticipantConfiguration>(
    `${base(projectId)}/configuration`,
  );
  return requireData(res.data, res.message || 'Failed to load configuration');
}

export type ParticipantHistoryQuery = {
  page?: number;
  limit?: number;
  participantKey?: string;
  status?: ParticipantApprovalStatus;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedParticipants = {
  items: PublicProjectParticipant[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** `GET /projects/:projectId/participants/history` — `project_participant.view` */
export async function fetchParticipantHistory(
  projectId: string,
  query: ParticipantHistoryQuery = {},
): Promise<PaginatedParticipants> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicProjectParticipant[]>(
    `${base(projectId)}/history`,
    { ...query, page, limit },
  );
  const meta = res.meta as Record<string, unknown> | undefined;
  return {
    items: res.data ?? [],
    meta: meta
      ? {
          page: Number(meta.page ?? page),
          limit: Number(meta.limit ?? limit),
          total: Number(meta.total ?? 0),
          totalPages: Number(meta.totalPages ?? 0),
          hasNextPage: Boolean(meta.hasNextPage),
          hasPrevPage: Boolean(meta.hasPrevPage),
        }
      : null,
  };
}

/** `POST /projects/:projectId/participants` — `project_participant.create` */
export async function createParticipant(
  projectId: string,
  body: CreateParticipantInput,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(base(projectId), body);
  return requireData(res.data, res.message || 'Failed to create participant');
}

/** `PATCH /projects/:projectId/participants/:recordId` — `project_participant.update` */
export async function updateParticipant(
  projectId: string,
  recordId: string,
  body: UpdateParticipantInput,
): Promise<PublicProjectParticipant> {
  const res = await apiPatch<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}`,
    body,
  );
  return requireData(res.data, res.message || 'Failed to update participant');
}

/**
 * `POST /projects/:projectId/participants/:recordId/versions`
 * — `project_participant.create`
 */
export async function createParticipantVersion(
  projectId: string,
  recordId: string,
  body: CreateParticipantVersionInput,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}/versions`,
    body,
  );
  return requireData(res.data, res.message || 'Failed to create version');
}

/** `POST …/:recordId/submit` — `project_participant.submit` */
export async function submitParticipant(
  projectId: string,
  recordId: string,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}/submit`,
  );
  return requireData(res.data, res.message || 'Failed to submit participant');
}

/** `POST …/:recordId/approve` — `project_participant.approve` */
export async function approveParticipant(
  projectId: string,
  recordId: string,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}/approve`,
  );
  return requireData(res.data, res.message || 'Failed to approve participant');
}

/** `POST …/:recordId/reject` — `project_participant.approve` */
export async function rejectParticipant(
  projectId: string,
  recordId: string,
  rejectionReason: string,
): Promise<PublicProjectParticipant> {
  const res = await apiPost<PublicProjectParticipant>(
    `${base(projectId)}/${encodeURIComponent(recordId)}/reject`,
    { rejectionReason },
  );
  return requireData(res.data, res.message || 'Failed to reject participant');
}
