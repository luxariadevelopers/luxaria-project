/** Nest RBAC for daily director digest. */
export type DirectorDigestCapabilities = {
  canView: boolean;
  canSend: boolean;
};

export function resolveDirectorDigestCapabilities(
  hasPermission: (code: string) => boolean,
): DirectorDigestCapabilities {
  return {
    canView: hasPermission('director_digest.view'),
    canSend: hasPermission('director_digest.send'),
  };
}

export const DIRECTOR_DIGEST_PERMISSIONS = {
  view: 'director_digest.view',
  send: 'director_digest.send',
} as const;
