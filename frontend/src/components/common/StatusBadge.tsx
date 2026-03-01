import { useTranslation } from 'react-i18next';
import type { ServiceStatus } from '../../types/common';

interface StatusBadgeProps {
  status: ServiceStatus;
}

const statusConfig = {
  healthy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    pulse: 'bg-emerald-500',
    labelKey: 'common.healthy',
  },
  degraded: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    pulse: 'bg-red-500',
    labelKey: 'common.degraded',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    pulse: 'bg-amber-500',
    labelKey: 'common.warning',
  },
  offline: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-500',
    pulse: 'bg-slate-500',
    labelKey: 'common.offline',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${config.bg} ${config.text}`}>
      <span className={`status-pulse ${config.pulse}`} />
      <span className="text-[10px] font-bold uppercase">{t(config.labelKey)}</span>
    </div>
  );
}
