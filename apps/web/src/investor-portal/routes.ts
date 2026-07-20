import {
  INVESTOR_DOCUMENTS_PATH,
  INVESTOR_STATEMENTS_PATH,
} from './paths';
import { INVESTOR_PORTAL_VIEW } from './permissions';

/**
 * Route registry entries for integration with `navigation/routeRegistry.ts`.
 * Wired directly in `routes/index.tsx` until the central registry lands on HEAD.
 */
export const investorPortalRouteDefinitions = [
  {
    id: 'investor-documents',
    path: INVESTOR_DOCUMENTS_PATH,
    title: 'Investor documents',
    layout: 'app' as const,
    showInNav: true,
    groupId: 'capital-investment' as const,
    icon: 'documents' as const,
    anyOf: [INVESTOR_PORTAL_VIEW] as const,
    projectScope: 'none' as const,
    breadcrumbSegment: 'documents',
  },
  {
    id: 'investor-statements',
    path: INVESTOR_STATEMENTS_PATH,
    title: 'Investor statements',
    layout: 'app' as const,
    showInNav: true,
    groupId: 'capital-investment' as const,
    icon: 'finance' as const,
    anyOf: [INVESTOR_PORTAL_VIEW] as const,
    projectScope: 'none' as const,
    breadcrumbSegment: 'statements',
  },
] as const;
