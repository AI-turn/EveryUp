// Data fetching hooks with mock/API switching
import { useState, useEffect, useCallback, useRef } from 'react';
import { env } from '../config/env';
import { api } from '../services/api';

// Dashboard mock imports
import { mockKPIData, mockServices, mockIncidents } from '../mocks/dashboard';

// Service detail mock imports
import {
  mockMetrics,
  mockResponseTimeChartData,
  mockErrorLogs,
  mockUptimeStats,
} from '../mocks/service-detail';

// Monitoring mock imports
import { mockGauges, mockCharts as mockTrendCharts, mockProcesses } from '../mocks/monitoring';
import { mockResources } from '../mocks/monitoring/resourceList.mock';

// System data transform utils
import {
  hostsToResources,
  systemInfoToGauges,
  historyToCharts,
  systemProcessesToProcesses,
} from '../utils/systemTransform';

// Settings mock imports
import { mockProtocols, mockConfigGroups } from '../mocks/settings';

// Alerts mock imports
import { mockNotificationRules } from '../mocks/alerts';

// Generic fetch state
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Generic hook for data fetching with mock fallback
function useDataFetch<T>(
  mockData: T,
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): FetchState<T> {
  const [data, setData] = useState<T | null>(env.useMock ? mockData : null);
  const [loading, setLoading] = useState(!env.useMock);
  const [error, setError] = useState<Error | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetch = useCallback(async () => {
    if (env.useMock) {
      setData(mockData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [mockData]);

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { data, loading, error, refetch: fetch };
}

// Dashboard Hooks
export function useDashboardKPI() {
  return useDataFetch(mockKPIData, async () => {
    const summary = await api.getDashboardSummary();
    // Transform API response to match KPIData structure
    return [
      {
        icon: 'hub',
        label: 'Total Services',
        value: `${summary.healthyServices}/${summary.totalServices}`,
        subValue: `${Math.round((summary.healthyServices / summary.totalServices) * 100)}% Active`,
        color: 'primary' as const,
      },
      {
        icon: 'warning',
        label: 'Active Alerts',
        value: summary.criticalAlerts.toString(),
        subValue: summary.criticalAlerts > 0 ? 'Requires attention' : 'All clear',
        color: summary.criticalAlerts > 0 ? 'red' as const : 'emerald' as const,
        // Single incident → go directly to that service's logs tab; multiple → alerts overview
        href: summary.criticalAlerts === 0
          ? undefined
          : summary.criticalServiceId
            ? `/services/${summary.criticalServiceId}?tab=logs`
            : '/alerts',
      },
      {
        icon: 'timer',
        label: 'Global Uptime',
        value: `${summary.overallUptime.toFixed(2)}%`,
        subValue: 'Last 24 hours',
        color: 'emerald' as const,
      },
    ];
  });
}

export function useDashboardServices() {
  return useDataFetch(mockServices, async () => {
    const services = await api.getServices(['http', 'tcp', 'icmp']);
    // Transform API response to match Service structure
    const iconMap: Record<string, string> = {
      http: 'api',
      tcp: 'dns',
    };
    const statusMap: Record<string, 'healthy' | 'degraded' | 'warning' | 'offline'> = {
      healthy: 'healthy',
      unhealthy: 'degraded',
      unknown: 'warning',
    };
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      cluster: service.tags?.[0] || 'default-cluster',
      status: statusMap[service.status] || 'warning',
      latency: `${service.responseTime || 0}ms`,
      uptime: `${(service.uptime || 0).toFixed(1)}%`,
      icon: iconMap[service.type] || 'dns',
      type: service.type as 'http' | 'tcp' | undefined,
      interval: service.interval,
      isActive: service.isActive,
    }));
  });
}

export function useDashboardIncidents() {
  return useDataFetch(mockIncidents, async () => {
    const timeline = await api.getDashboardTimeline();
    return timeline.map((item) => ({
      id: item.id,
      time: new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
      type: item.type,
      serviceName: item.serviceName || 'System',
      message: item.message,
    }));
  });
}

// Service Detail Hooks
export function useServiceMetrics(serviceId: string) {
  return useDataFetch(
    mockMetrics,
    async () => {
      const summary = await api.getServiceMetricsSummary(serviceId);
      const errorRate = 100 - summary.uptime;
      return [
        {
          label: 'Avg Latency',
          value: `${summary.avgResponseTime.toFixed(0)}ms`,
          change: '-4.2%',
          changeType: 'down' as const,
          subtext: 'Compared to previous 24h',
          icon: 'timer',
          iconColor: 'text-slate-400 dark:text-text-muted-dark',
        },
        {
          label: 'Error Rate',
          value: `${errorRate.toFixed(2)}%`,
          change: summary.uptime >= 99 ? '-0.01%' : '+0.01%',
          changeType: (summary.uptime >= 99 ? 'down' : 'up') as 'up' | 'down',
          subtext: `${summary.uptime.toFixed(2)}% success rate`,
          icon: 'error_outline',
          iconColor: 'text-[#fa6238]',
        },
        {
          label: 'Request Volume',
          value: `${(summary.totalChecks / 1000).toFixed(1)}k`,
          change: '+12%',
          changeType: 'up' as const,
          subtext: 'Peak: 3.2k req/min',
          icon: 'speed',
          iconColor: 'text-primary',
        },
      ];
    },
    [serviceId]
  );
}

export function useServiceCharts(serviceId: string) {
  return useDataFetch(
    mockResponseTimeChartData,
    async () => {
      const metrics = await api.getServiceMetrics(serviceId, { limit: '24' });
      // Transform to number array (response times) to match mock structure
      return metrics.map((m) => m.responseTime);
    },
    [serviceId]
  );
}

export function useServiceErrorLogs(serviceId: string) {
  return useDataFetch(
    mockErrorLogs,
    async () => {
      const logs = await api.getServiceLogs(serviceId, { level: 'error' });
      const levelMap: Record<string, 'CRITICAL' | 'WARNING' | 'INFO'> = {
        error: 'CRITICAL',
        warning: 'WARNING',
        info: 'INFO',
      };
      return logs.map((log) => ({
        id: log.id,
        level: levelMap[log.level] || 'INFO',
        message: log.message,
        timestamp: log.createdAt,
      }));
    },
    [serviceId]
  );
}

export function useServiceUptime(serviceId: string) {
  return useDataFetch(
    mockUptimeStats,
    async () => {
      const uptime = await api.getServiceUptime(serviceId, { days: '30' });
      // Transform to match mock structure
      return {
        uptime: `${Math.floor(uptime.percentage * 24 * 30 / 100)}h`,
        totalIncidents: uptime.days.filter((d) => d.status !== 'up').length,
        mttr: '0m',
        percentage: `${uptime.percentage.toFixed(2)}%`,
      };
    },
    [serviceId]
  );
}

// Monitoring Hooks
export function useMonitoringGauges(hostId: string) {
  return useDataFetch(
    mockGauges,
    async () => {
      const info = await api.getSystemInfo(hostId);
      return systemInfoToGauges(info);
    },
    [hostId]
  );
}

export function useMonitoringTrends(hostId: string, range: string = '6h') {
  return useDataFetch(
    mockTrendCharts,
    async () => {
      const history = await api.getSystemMetricsHistory(hostId, range);
      return historyToCharts(history);
    },
    [hostId, range]
  );
}

export function useMonitoringProcesses(hostId: string) {
  return useDataFetch(
    mockProcesses,
    async () => {
      const procs = await api.getSystemProcesses(hostId, 10, 'cpu');
      return systemProcessesToProcesses(procs);
    },
    [hostId]
  );
}

// Services List Hook
export function useServices() {
  return useDataFetch([], async () => {
    return api.getServices();
  });
}

// Single Service Hook
export function useService(serviceId: string) {
  return useDataFetch(
    null,
    async () => {
      return api.getServiceById(serviceId);
    },
    [serviceId]
  );
}

// Logs Hook
export function useLogs(params?: { level?: string; limit?: string }) {
  return useDataFetch(
    [],
    async () => {
      return api.getLogs(params);
    },
    [params?.level, params?.limit]
  );
}

// Incidents Hook
export function useIncidents() {
  return useDataFetch([], async () => {
    return api.getIncidents();
  });
}

// Monitoring Resources Hook (fetches from hosts API)
export function useMonitoringResources() {
  return useDataFetch(mockResources, async () => {
    const hosts = await api.getHosts();
    return hostsToResources(hosts);
  });
}

// Single Host Hook
export function useHost(hostId: string) {
  return useDataFetch(
    null,
    async () => {
      return api.getHostById(hostId);
    },
    [hostId]
  );
}

// Settings Hooks
export function useSettingsProtocols() {
  return useDataFetch(mockProtocols, async () => {
    // TODO: Replace with actual API call when endpoint is available
    return mockProtocols;
  });
}

export function useSettingsConfigGroups() {
  return useDataFetch(mockConfigGroups, async () => {
    // TODO: Replace with actual API call when endpoint is available
    return mockConfigGroups;
  });
}

// Notification Rules Hook
export function useNotificationRules() {
  return useDataFetch(mockNotificationRules, async () => {
    // TODO: Replace with actual API call when endpoint is available
    return mockNotificationRules;
  });
}

// Notification Channels Hook
export function useNotificationChannels() {
  return useDataFetch([], async () => {
    return api.getNotificationChannels();
  });
}
