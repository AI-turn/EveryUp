export type TimeRange = '24H' | '7D' | '30D';

export interface ChartDataPoint {
  value: number;
  label: string;
}

// Generate random response time data based on time range
export function generateResponseTimeData(range: TimeRange): ChartDataPoint[] {
  const baseValue = 150; // Base response time in ms
  const variance = 50;

  switch (range) {
    case '24H':
      return Array.from({ length: 24 }, (_, i) => ({
        value: baseValue + Math.random() * variance - variance / 2,
        label: `${String(i).padStart(2, '0')}:00`,
      }));

    case '7D':
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((day) => ({
        value: baseValue + Math.random() * variance - variance / 2,
        label: day,
      }));

    case '30D':
      return Array.from({ length: 30 }, (_, i) => ({
        value: baseValue + Math.random() * variance - variance / 2,
        label: `Day ${i + 1}`,
      }));

    default:
      return [];
  }
}

// Get X-axis labels for each time range
export function getXAxisLabels(range: TimeRange): string[] {
  switch (range) {
    case '24H':
      return ['00:00', '06:00', '12:00', '18:00', '23:59'];
    case '7D':
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    case '30D':
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    default:
      return [];
  }
}

// Format time range for display
export function formatTimeRangeLabel(range: TimeRange): string {
  switch (range) {
    case '24H':
      return 'Last 24 Hours';
    case '7D':
      return 'Last 7 Days';
    case '30D':
      return 'Last 30 Days';
    default:
      return '';
  }
}
