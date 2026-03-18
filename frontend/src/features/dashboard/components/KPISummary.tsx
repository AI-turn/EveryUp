import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../../../components/common';
import { useDashboardKPI } from '../../../hooks/useData';

const valueColorMap: Record<string, string> = {
  primary: 'text-primary',
  red: 'text-red-500 dark:text-red-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
};

const statusConfig = {
  operational: {
    label: 'OPERATIONAL',
    messageKey: 'dashboard.status.operational',
    messageDefault: '모든 시스템이 정상 작동 중입니다',
    dotColor: 'bg-emerald-500',
    labelColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    icon: 'check_circle',
  },
  degraded: {
    label: 'DEGRADED',
    messageKey: 'dashboard.status.degraded',
    messageDefault: '일부 서비스가 느리거나 불안정합니다',
    dotColor: 'bg-amber-500',
    labelColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
    icon: 'warning',
  },
  critical: {
    label: 'CRITICAL',
    messageKey: 'dashboard.status.critical',
    messageDefault: '즉각적인 확인이 필요한 알림이 있습니다',
    dotColor: 'bg-red-500',
    labelColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/10',
    icon: 'error',
  },
};

export function KPISummary() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { data: kpiData, loading, error } = useDashboardKPI();

  const labelMap: Record<string, string> = {
    'Total Services': t('dashboard.kpi.totalServices'),
    'Active Alerts': t('dashboard.kpi.criticalAlerts'),
    'Global Uptime': t('dashboard.kpi.overallUptime'),
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-xl px-6 py-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-ui-hover-dark" />
            <div>
              <div className="h-3 w-20 bg-slate-200 dark:bg-ui-hover-dark rounded mb-2" />
              <div className="h-4 w-48 bg-slate-200 dark:bg-ui-hover-dark rounded" />
            </div>
          </div>
          <div className="flex items-center gap-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 text-right">
                <div className="h-7 w-16 bg-slate-200 dark:bg-ui-hover-dark rounded mb-1.5" />
                <div className="h-3 w-12 bg-slate-200 dark:bg-ui-hover-dark rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !kpiData) return null;

  const alertsItem = kpiData.find((k) => k.label === 'Active Alerts');
  const uptimeItem = kpiData.find((k) => k.label === 'Global Uptime');
  const isCritical = alertsItem?.color === 'red';
  const uptimeValue = parseFloat(String(uptimeItem?.value ?? '100'));
  const isDegraded = !isCritical && uptimeValue < 99;
  const statusKey = isCritical ? 'critical' : isDegraded ? 'degraded' : 'operational';
  const status = statusConfig[statusKey];

  return (
    <div className="bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-xl px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

        {/* Left: System Status */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${status.iconBg} flex items-center justify-center shrink-0`}>
            <span className="relative flex w-2.5 h-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.dotColor} opacity-60`} />
              <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${status.dotColor}`} />
            </span>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${status.labelColor}`}>
              {status.label}
            </p>
            <p className="text-sm font-semibold text-slate-700 dark:text-white mt-0.5">
              {t(status.messageKey, { defaultValue: status.messageDefault })}
            </p>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center divide-x divide-slate-200 dark:divide-ui-border-dark">
          {kpiData.map((kpi, i) => (
            <div
              key={kpi.label}
              onClick={kpi.href ? () => navigate(kpi.href!) : undefined}
              className={[
                i === 0 ? 'pr-6' : i === kpiData.length - 1 ? 'pl-6' : 'px-6',
                'text-right',
                kpi.href
                  ? 'cursor-pointer group'
                  : '',
              ].join(' ')}
            >
              <p className={`text-2xl font-bold tabular-nums leading-none ${valueColorMap[kpi.color]}`}>
                {kpi.value}
                {kpi.href && (
                  <MaterialIcon
                    name="arrow_forward"
                    className="text-base align-middle ml-1 opacity-0 group-hover:opacity-60 transition-opacity"
                  />
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-text-muted-dark mt-1">
                {labelMap[kpi.label] ?? kpi.label}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
