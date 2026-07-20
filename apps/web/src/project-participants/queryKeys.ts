import type { ParticipantHistoryQuery } from './api';

export const projectParticipantsKeys = {
  all: ['project-participants'] as const,
  project: (projectId: string) =>
    [...projectParticipantsKeys.all, projectId] as const,
  active: (projectId: string) =>
    [...projectParticipantsKeys.project(projectId), 'active'] as const,
  configuration: (projectId: string) =>
    [...projectParticipantsKeys.project(projectId), 'configuration'] as const,
  history: (projectId: string, query: ParticipantHistoryQuery) =>
    [...projectParticipantsKeys.project(projectId), 'history', query] as const,
};
