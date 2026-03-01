import type { ServiceStatus } from './common';

export interface Service {
  id: string;
  name: string;
  cluster: string;
  status: ServiceStatus;
  latency: string;
  uptime: string;
  icon: string;
  type?: 'http' | 'tcp';
  interval?: number;
  isActive?: boolean;
}
