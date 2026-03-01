import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getCSSVariable } from '../../design-tokens/colors';

interface SparklineChartProps {
  data: number[];
  color?: string;
}

export function SparklineChart({ data, color = getCSSVariable('primary') }: SparklineChartProps) {
  const chartData = data.map((v) => ({ v }));
  const gradientId = `sparkline-${color.replace('#', '')}`;

  return (
    <div className="h-12 w-full bg-slate-50 dark:bg-ui-hover-dark/50 rounded-lg overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
