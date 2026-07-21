import { apiGet, apiPost } from '@/api/client';
import type {
  DirectorDigestSummary,
  PreviewAllDigestResult,
  PreviewDigestQuery,
  RunDigestResult,
  SendDigestInput,
  SendDigestResult,
} from './types';

const BASE = '/director-digest';

/** `GET /director-digest/preview` — `director_digest.view` */
export async function fetchDirectorDigestPreview(
  query: PreviewDigestQuery = {},
): Promise<DirectorDigestSummary> {
  const res = await apiGet<DirectorDigestSummary>(`${BASE}/preview`, query);
  if (!res.data) {
    throw new Error(res.message || 'Digest preview unavailable');
  }
  return res.data;
}

/** `GET /director-digest/preview-all` — `director_digest.send` */
export async function fetchDirectorDigestPreviewAll(
  date?: string,
): Promise<PreviewAllDigestResult> {
  const res = await apiGet<PreviewAllDigestResult>(`${BASE}/preview-all`, {
    date,
  });
  if (!res.data) {
    throw new Error(res.message || 'Digest previews unavailable');
  }
  return res.data;
}

/** `POST /director-digest/send` — `director_digest.send` */
export async function sendDirectorDigest(
  input: SendDigestInput = {},
): Promise<SendDigestResult> {
  const res = await apiPost<SendDigestResult>(`${BASE}/send`, input);
  if (!res.data) {
    throw new Error(res.message || 'Send digest failed');
  }
  return res.data;
}

/** `POST /director-digest/run` — `director_digest.send` */
export async function runDirectorDigestJob(
  input: SendDigestInput = {},
): Promise<RunDigestResult> {
  const res = await apiPost<RunDigestResult>(`${BASE}/run`, input);
  if (!res.data) {
    throw new Error(res.message || 'Run digest job failed');
  }
  return res.data;
}
