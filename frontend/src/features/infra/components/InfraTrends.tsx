import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useMonitoringTrends } from '../../../hooks/useData';
import { Skeleton } from '../../../components/skeleton';

interface InfraTrendsProps {
  hostId: string;
}

const GRID_COLOR_LIGHT = '#e2e8f0';
const GRID_COLOR_DARK = '#2e3c4a';   // chart-border
const TICK_COLOR_LIGHT = '#64748b';
const TICK_COLOR_DARK = '#94a3b8';   // text-muted-dark
const TOOLTIP_BG_LIGHT = '#ffffff';
const TOOLTIP_BG_DARK = '#161b22';   // bg-surface-dark
const TOOLTIP_BORDER_LIGHT = '#e2e8f0';
const TOOLTIP_BORDER_DARK = '#2e3c4a'; // chart-border

function getIsDark() {
  return document.documentElement.classList.contains('dark');
}

export function InfraTrends({ hostId }: InfraTrendsProps) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<'6H' | '12H' | '24H'>('6H');
  const { data: charts, loading } = useMonitoringTrends(hostId, timeRange.toLowerCase());

  const isDark = getIsDark();
  const gridColor = isDark ? GRID_COLOR_DARK : GRID_COLOR_LIGHT;
  const tickColor = isDark ? TICK_COLOR_DARK : TICK_COLOR_LIGHT;
  const tooltipBg = isDark ? TOOLTIP_BG_DARK : TOOLTIP_BG_LIGHT;
  const tooltipBorder = isDark ? TOOLTIP_BORDER_DARK : TOOLTIP_BORDER_LIGHT;

  const rangeLabel: Record<string, string> = {
    '6H': t('monitoring.trends.last6h'),
    '12H': t('monitoring.trends.last12h'),
    '24H': t('monitoring.trends.last24h'),
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
          {t('monitoring.trends.title')}{' '}
          <span className="text-slate-400 dark:text-text-dim-dark font-normal text-lg">
            ({rangeLabel[timeRange]})
          </span>
        </h2>
        <div className="flex bg-slate-100 dark:bg-chart-surface rounded-lg p-1">
          {(['6H', '12H', '24H'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white dark:bg-chart-bg text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-text-muted-dark hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {(charts || []).map((chart) => (
            <div
              key={chart.title}
              className="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 dark:border-chart-border bg-white dark:bg-bg-surface-dark/30"
            >
              {/* Chart Title */}
              <span className="text-slate-900 dark:text-white font-bold text-sm">
                {chart.title}
                {chart.unit && (
                  <span className="ml-1 text-slate-400 dark:text-text-dim-dark font-normal text-xs">
                    ({chart.unit})
                  </span>
                )}
              </span>

              {/* Recharts LineChart */}
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={chart.data}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: tickColor }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={chart.yMax !== undefined ? [0, chart.yMax] : ['auto', 'auto']}
                    tick={{ fontSize: 10, fill: tickColor }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    labelStyle={{ color: tickColor, fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number) => [`${value}${chart.unit}`, '']}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  />
                  {chart.series.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
