import type { LocalUploadFile } from '@luxaria/shared-types';

/** SHA-256 hex of file bytes (optional ConfirmUploadDto.checksum). */
export async function computeSha256Hex(
  file: LocalUploadFile,
): Promise<string | undefined> {
  const source = file.source;
  if (!(source instanceof Blob)) {
    return undefined;
  }
  const buffer = await source.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
