import type { RequestFn } from './base';

// --- Types ---

export interface DashboardSummary {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  avgResponseTime: number;
  overallUptime: number;
  criticalAlerts: number;
  /** Set when exactly one active incident exists — service to navigate to */
  criticalServiceId?: string;
}

export interface TimelineItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  serviceId?: string;
  serviceName?: string;
}

// --- API ---

export function createDashboardApi(request: RequestFn) {
  return {
    getDashboardSummary: () =>
      request<DashboardSummary>('/dashboard/summary'),

    getDashboardTimeline: async () => {
      const data = await request<TimelineItem[]>('/dashboard/timeline');
      return data || [];
    },
  };
}
