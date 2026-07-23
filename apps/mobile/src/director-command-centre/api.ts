import { apiGet } from '@/api/client';
import type {
  CommandCentreQuery,
  DirectorCommandCentreSummary,
} from './types';

/**
 * `GET /director-command-centre/summary`
 * Permission: `dashboard.view` (+ project access enforced in the service).
 */
export async function fetchDirectorCommandCentreSummary(
  query: CommandCentreQuery = {},
): Promise<DirectorCommandCentreSummary> {
  const res = await apiGet<DirectorCommandCentreSummary>(
    '/director-command-centre/summary',
    { ...query },
  );
  if (!res.data) {
    throw new Error(
      res.message || 'Director command centre summary unavailable',
    );
  }
  return res.data;
}
