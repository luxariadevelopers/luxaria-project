import { applyDecorators, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as unauthenticated / public.
 * Also records R-003 route scope `public` for default-deny classification.
 */
export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata('routeScope', { kind: 'public' }),
  );
