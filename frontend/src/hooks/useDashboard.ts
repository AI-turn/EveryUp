import { api } from '../services/api';
import { useDataFetch } from './useDataFetch';
import { mockKPIData, mockServices, mockIncidents } from '../mocks/dashboard';

export function useDashboardKPI() {
  return useDataFetch(mockKPIData, async () => {
    const summary = await api.getDashboardSummary();
    return [
      {
        label: 'Total Services',
        value: `${summary.healthyServices}/${summary.totalServices}`,
        subValue: `${Math.round((summary.healthyServices / summary.totalServices) * 100)}% Active`,
        color: 'primary' as const,
      },
      {
        label: 'Active Alerts',
        value: summary.criticalAlerts.toString(),
        subValue: summary.criticalAlerts > 0 ? 'Requires attention' : 'All clear',
        color: summary.criticalAlerts > 0 ? 'red' as const : 'emerald' as const,
        href: summary.criticalAlerts === 0
          ? undefined
          : summary.criticalServiceId
            ? `/services/${summary.criticalServiceId}?tab=logs`
            : '/alerts',
      },
      {
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
    const statusMap: Record<string, 'healthy' | 'degraded' | 'warning' | 'offline'> = {
      healthy: 'healthy',
      unhealthy: 'degraded',
      unknown: 'warning',
    };
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      status: statusMap[service.status] || 'warning',
      latency: `${service.responseTime || 0}ms`,
      uptime: `${(service.uptime || 0).toFixed(1)}%`,
      icon: '',
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
