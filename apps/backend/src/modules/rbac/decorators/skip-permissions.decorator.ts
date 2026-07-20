import { SetMetadata } from '@nestjs/common';

export const SKIP_PERMISSIONS_KEY = 'skipPermissions';

/** Authenticated route that must not require permission metadata. */
export const SkipPermissions = () => SetMetadata(SKIP_PERMISSIONS_KEY, true);
