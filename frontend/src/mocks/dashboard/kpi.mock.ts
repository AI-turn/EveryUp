import type { KPIData } from '../../types/common';

/**
 * Mock KPI data for dashboard summary
 * Used by: KPISummary component
 */
export const mockKPIData: KPIData[] = [
  {
    label: 'Total Services',
    value: '24/24',
    subValue: '100% Active',
    color: 'primary',
  },
  {
    label: 'Active Alerts',
    value: '3',
    subValue: '+1 from last hour',
    color: 'red',
  },
  {
    label: 'Global Uptime',
    value: '99.98%',
    subValue: 'Last 30 days',
    color: 'emerald',
  },
];
