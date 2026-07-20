const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function isDocumentObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

export function isUploadPath(value: string): boolean {
  return value.startsWith('uploads/') || value.startsWith('/uploads/');
}

export type DprMediaEntry = {
  key: string;
  ref: string;
  label: string;
  kind: 'photo' | 'video';
};

export function buildDprMediaEntries(input: {
  photoDocumentIds?: readonly string[];
  videoDocumentIds?: readonly string[];
}): DprMediaEntry[] {
  const entries: DprMediaEntry[] = [];

  (input.photoDocumentIds ?? []).forEach((photo, index) => {
    const ref = photo?.trim();
    if (ref) {
      entries.push({
        key: `photo-${index}-${ref}`,
        ref,
        label: `Photo ${index + 1}`,
        kind: 'photo',
      });
    }
  });

  (input.videoDocumentIds ?? []).forEach((video, index) => {
    const ref = video?.trim();
    if (ref) {
      entries.push({
        key: `video-${index}-${ref}`,
        ref,
        label: `Video ${index + 1}`,
        kind: 'video',
      });
    }
  });

  return entries;
}

export function describeMediaReference(
  refValue: string,
  canDownload: boolean,
): { canResolve: boolean; reason?: string } {
  if (isUploadPath(refValue)) {
    return { canResolve: true };
  }
  if (isDocumentObjectId(refValue)) {
    if (!canDownload) {
      return {
        canResolve: false,
        reason: 'Missing permission document.download',
      };
    }
    return { canResolve: true };
  }
  return { canResolve: false, reason: 'Unrecognized media reference' };
}
