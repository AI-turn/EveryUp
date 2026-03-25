import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import { ServiceHealthGrid } from '../../dashboard';

interface HealthCheckMobileViewProps {
  searchQuery: string;
  statusFilter: string;
  refreshKey: number;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (filter: string) => void;
  onAddService: () => void;
}

export function HealthCheckMobileView({
  searchQuery,
  statusFilter,
  refreshKey,
  onSearchChange,
  onStatusFilterChange,
  onAddService,
}: HealthCheckMobileViewProps) {
  const { t } = useTranslation(['healthcheck', 'common']);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">{t('healthcheck.title')}</h1>
        <p className="text-xs text-slate-500 dark:text-text-muted-dark mt-0.5">{t('healthcheck.subtitle')}</p>
      </div>

      {/* Add Button */}
      <button
        onClick={onAddService}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-ui-border-dark text-primary font-bold text-sm active:scale-95 transition-transform"
      >
        <MaterialIcon name="add_circle" className="text-lg" />
        {t('healthcheck.addService')}
      </button>

      {/* Search */}
      <div className="relative">
        <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('healthcheck.searchPlaceholder')}
          aria-label={t('healthcheck.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white dark:placeholder-text-muted-dark text-sm"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-lg text-xs font-medium text-slate-700 dark:text-text-muted-dark outline-none cursor-pointer"
      >
        <option value="">{t('common.status')}: {t('common.all')}</option>
        <option value="healthy">{t('common.healthy')}</option>
        <option value="degraded">{t('common.degraded')}</option>
        <option value="warning">{t('common.warning')}</option>
        <option value="offline">{t('common.offline')}</option>
      </select>

      <ServiceHealthGrid
        hideHeader
        bare
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        refreshKey={refreshKey}
        navigateTo={(id) => `/healthcheck/${id}`}
        onAddClick={onAddService}
      />
    </div>
  );
}
