export type AppName = 'backend' | 'web' | 'mobile';

export interface HealthStatus {
  status: 'ok';
  service: AppName;
  timestamp: string;
}
