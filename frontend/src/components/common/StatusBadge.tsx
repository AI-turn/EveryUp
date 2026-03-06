import { useTranslation } from 'react-i18next';
import { statusColorClasses } from '../../design-tokens/colors';
import type { ServiceStatus } from '../../types/common';

interface StatusBadgeProps {
  status: ServiceStatus;
}

const labelKeys: Record<ServiceStatus, string> = {
  healthy: 'common.healthy',
  degraded: 'common.degraded',
  warning: 'common.warning',
  offline: 'common.offline',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const colors = statusColorClasses[status];

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
      <span className={`status-pulse ${colors.pulse}`} />
      <span className="text-[10px] font-bold uppercase">{t(labelKeys[status])}</span>
    </div>
  );
}
