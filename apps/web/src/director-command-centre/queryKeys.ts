import type { CommandCentreQuery } from './types';

export const DIRECTOR_COMMAND_CENTRE_QUERY_KEY = [
  'director-command-centre',
] as const;

export const directorSummaryQueryKey = (query: CommandCentreQuery) =>
  [...DIRECTOR_COMMAND_CENTRE_QUERY_KEY, 'summary', query] as const;

export const directorFilterOptionsQueryKey = [
  ...DIRECTOR_COMMAND_CENTRE_QUERY_KEY,
  'directors',
] as const;

export const financialYearFilterOptionsQueryKey = [
  ...DIRECTOR_COMMAND_CENTRE_QUERY_KEY,
  'financial-years',
] as const;
