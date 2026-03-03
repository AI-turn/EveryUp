import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import { api, MetricsSummary } from '../../../services/api';

interface RealtimeMetricsProps {
  serviceId: string;
  refreshKey?: number;
}

export function RealtimeMetrics({ serviceId, refreshKey }: RealtimeMetricsProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getServiceMetricsSummary(serviceId);
        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch metrics summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [serviceId, refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-ui-border-dark bg-white dark:bg-chart-bg animate-pulse"
          >
            <div className="h-4 bg-slate-200 dark:bg-ui-active-dark rounded w-24" />
            <div className="h-8 bg-slate-200 dark:bg-ui-active-dark rounded w-32 mt-2" />
            <div className="h-3 bg-slate-200 dark:bg-ui-active-dark rounded w-20 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: t('services.detail.metrics.responseTime'),
      value: summary ? `${Math.round(summary.avgResponseTime)}ms` : '-',
      icon: 'speed',
      iconColor: 'text-primary',
      subtext: summary
        ? t('services.detail.metrics.maxMin', {
            max: Math.round(summary.maxResponseTime),
            min: Math.round(summary.minResponseTime),
          })
        : '-',
    },
    {
      label: t('services.detail.metrics.successRate'),
      value: summary ? `${(summary.uptime ?? 0).toFixed(2)}%` : '-',
      icon: 'check_circle',
      iconColor: summary && (summary.uptime ?? 0) >= 99 ? 'text-green-500' : 'text-amber-500',
      subtext: summary
        ? t('services.detail.metrics.totalChecks', { count: summary.totalChecks })
        : '-',
    },
    {
      label: t('services.detail.metrics.totalChecks'),
      value: summary ? summary.totalChecks.toLocaleString() : '-',
      icon: 'monitoring',
      iconColor: 'text-blue-500',
      subtext: t('services.detail.metrics.checksSubtext'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-ui-border-dark bg-white dark:bg-chart-bg"
        >
          <div className="flex justify-between items-start">
            <p className="text-slate-500 dark:text-text-muted-dark text-sm font-medium">
              {metric.label}
            </p>
            <MaterialIcon name={metric.icon} className={`${metric.iconColor} text-lg`} />
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">
              {metric.value}
            </p>
          </div>
          <p className="text-slate-400 dark:text-text-chart-dim text-xs">{metric.subtext}</p>
        </div>
      ))}
    </div>
  );
}
