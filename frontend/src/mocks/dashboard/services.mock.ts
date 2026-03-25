import type { Service } from '../../types/service';

/**
 * Mock services data for dashboard service grid
 * Used by: ServiceHealthGrid component
 */
export const mockServices: Service[] = [
  {
    id: '1',
    name: 'API Gateway',
    status: 'healthy',
    latency: '42ms',
    uptime: '100%',
    icon: 'api',
    type: 'http',
    interval: 30,
  },
  {
    id: '2',
    name: 'Auth Service',
    status: 'degraded',
    latency: '1,240ms',
    uptime: '98.2%',
    icon: 'lock',
    type: 'http',
    interval: 60,
  },
  {
    id: '3',
    name: 'User Database',
    status: 'warning',
    latency: '12ms',
    uptime: '99.9%',
    icon: 'database',
    type: 'tcp',
    interval: 30,
  },
  {
    id: '4',
    name: 'Redis Cache',
    status: 'healthy',
    latency: '2ms',
    uptime: '100%',
    icon: 'memory',
    type: 'tcp',
    interval: 15,
  },
  {
    id: '5',
    name: 'Payment Worker',
    status: 'healthy',
    latency: '156ms',
    uptime: '99.9%',
    icon: 'payments',
    type: 'http',
    interval: 120,
  },
  {
    id: '6',
    name: 'Search Index',
    status: 'healthy',
    latency: '88ms',
    uptime: '99.5%',
    icon: 'search',
    type: 'http',
    interval: 60,
  },
];
