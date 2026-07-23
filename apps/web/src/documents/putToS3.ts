import type { LocalUploadFile } from '@luxaria/shared-types';

/** Headers browsers forbid on XHR (auto-managed from the body). */
const UNSAFE_REQUEST_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'set-cookie',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
]);

/**
 * PUT file bytes to a private S3 presigned URL (no public ACL).
 * Uses XHR for upload progress events.
 */
export function putFileToPresignedUrl(input: {
  url: string;
  method: string;
  headers: Record<string, string>;
  file: LocalUploadFile;
  onProgress?: (ratio: number) => void;
}): Promise<void> {
  const blob = input.file.source;
  if (!(blob instanceof Blob)) {
    return Promise.reject(new Error('Web upload requires a Blob/File source'));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(input.method || 'PUT', input.url);
    for (const [key, value] of Object.entries(input.headers)) {
      if (UNSAFE_REQUEST_HEADERS.has(key.toLowerCase())) continue;
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !input.onProgress) return;
      input.onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`S3 upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('S3 upload network error'));
    xhr.send(blob);
  });
}
