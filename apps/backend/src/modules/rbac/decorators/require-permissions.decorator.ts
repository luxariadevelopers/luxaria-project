import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

/**
 * Declares permissions required for a route (module.action).
 * User must have **all** listed permissions unless they hold a bypass role (Super Admin).
 * Deny by default when this decorator is present and the user lacks a permission.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
