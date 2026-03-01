import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '../../../components/common';
import { useDashboardKPI } from '../../../hooks/useData';
import { KPICardSkeleton } from '../../../components/skeleton';

export function KPISummary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: kpiData, loading, error } = useDashboardKPI();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 mb-8">
        {t('common.error')}: {error.message}
      </div>
    );
  }

  if (!kpiData) return null;

  const labelMap: Record<string, string> = {
    'Total Services': 'dashboard.kpi.totalServices',
    'Active Alerts': 'dashboard.kpi.criticalAlerts',
    'Global Uptime': 'dashboard.kpi.overallUptime'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {kpiData.map((data) => (
        <KPICard
          key={data.label}
          label={labelMap[data.label] ? t(labelMap[data.label]) : data.label}
          value={data.value}
          subValue={data.subValue}
          icon={data.icon}
          color={data.color as any}
          onClick={data.href ? () => navigate(data.href!) : undefined}
        />
      ))}
    </div>
  );
}
