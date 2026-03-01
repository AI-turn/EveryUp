import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api, Metric } from '../../../services/api';

type TimeRange = '24H' | '7D' | '30D';

interface ResponseTimeChartProps {
  serviceId: string;
  refreshKey?: number;
}

function getTimeRangeParams(range: TimeRange): { from: string; limit: string } {
  const now = new Date();
  let from: Date;

  switch (range) {
    case '24H':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7D':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30D':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    from: from.toISOString(),
    limit: range === '24H' ? '48' : range === '7D' ? '84' : '90',
  };
}

function formatTimeRangeLabel(range: TimeRange): string {
  switch (range) {
    case '24H':
      return 'Last 24 hours';
    case '7D':
      return 'Last 7 days';
    case '30D':
      return 'Last 30 days';
  }
}

export function ResponseTimeChart({ serviceId, refreshKey }: ResponseTimeChartProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const params = getTimeRangeParams(timeRange);
        const data = await api.getServiceMetrics(serviceId, params);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [serviceId, timeRange, refreshKey]);

  // Group metrics into time buckets for chart display
  const chartData = useMemo(() => {
    if (metrics.length === 0) return [];

    // Sort by time
    const sorted = [...metrics].sort(
      (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    );

    // Use response times directly
    return sorted.map((m) => ({
      value: m.responseTime,
      time: new Date(m.checkedAt),
    }));
  }, [metrics]);

  // Generate x-axis labels
  const xAxisLabels = useMemo(() => {
    if (chartData.length === 0) return [];

    const count = 5;
    const step = Math.floor(chartData.length / (count - 1));
    const labels: string[] = [];

    for (let i = 0; i < count; i++) {
      const idx = Math.min(i * step, chartData.length - 1);
      const date = chartData[idx]?.time;
      if (date) {
        if (timeRange === '24H') {
          labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          labels.push(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        }
      }
    }

    return labels;
  }, [chartData, timeRange]);

  // Normalize values to percentages for chart display
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const normalizedData = chartData.map((d) => ({
    ...d,
    percentage: (d.value / maxValue) * 100,
  }));

  return (
    <div className="mb-8 p-6 rounded-xl border border-slate-200 dark:border-ui-border-dark bg-white dark:bg-chart-bg">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-slate-900 dark:text-white text-xl font-bold tracking-tight">
            {t('services.detail.metrics.responseTime')}
          </h2>
          <p className="text-slate-400 dark:text-text-chart-dim text-sm">
            {t('detail.responseTimeChartDesc', {
              range: formatTimeRangeLabel(timeRange).toLowerCase(),
            })}
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-chart-surface p-1 rounded-lg">
          {(['24H', '7D', '30D'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-slate-200 dark:bg-chart-border text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-text-muted-dark hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64 w-full flex items-end gap-1">
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-slate-300 dark:border-chart-border w-full h-0" />
          <div className="border-b border-slate-300 dark:border-chart-border w-full h-0" />
          <div className="border-b border-slate-300 dark:border-chart-border w-full h-0" />
          <div className="border-b border-slate-300 dark:border-chart-border w-full h-0" />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-slate-400 dark:text-text-dim-dark text-sm">
              {t('common.loading')}
            </span>
          </div>
        ) : normalizedData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-slate-400 dark:text-text-dim-dark text-sm">
              {t('common.noData')}
            </span>
          </div>
        ) : (
          /* Bars */
          normalizedData.map((data, index) => (
            <div
              key={index}
              className="flex-1 bg-primary/30 hover:bg-primary/50 rounded-t transition-all duration-300 group relative"
              style={{ height: `${Math.max(data.percentage, 2)}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {Math.round(data.value)}ms
              </div>
            </div>
          ))
        )}
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between mt-4 text-slate-400 dark:text-text-chart-dim text-xs font-medium">
        {xAxisLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
}
