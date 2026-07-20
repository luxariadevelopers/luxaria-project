/**
 * Shared types placeholder for Luxaria Developers ERP.
 * Business domain types will be added in later phases.
 */

export type AppName = 'backend' | 'web' | 'mobile';

export interface HealthStatus {
  status: 'ok';
  service: AppName;
  timestamp: string;
}
