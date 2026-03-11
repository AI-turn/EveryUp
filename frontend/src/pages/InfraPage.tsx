import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MaterialIcon, PageHeader } from '../components/common';
import { InfraCard, InfraForm } from '../features/infra';
import { useMonitoringResources } from '../hooks/useData';
import { Skeleton } from '../components/skeleton';
import { useSidePanel } from '../contexts/SidePanelContext';

export function InfraPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openPanel } = useSidePanel();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: resources, loading, error, refetch } = useMonitoringResources();

  const handleAddResource = () => {
    openPanel(
      t('monitoring.addResource'),
      <InfraForm onSuccess={refetch} />
    );
  };

  const filteredResources = (resources || []).filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ip.includes(searchQuery) ||
      r.cluster.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || r.type === typeFilter;
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <>
      <PageHeader
        title={t('monitoring.title')}
        subtitle={t('monitoring.subtitle')}
        features={[
          { icon: 'memory', label: t('monitoring.features.cpuMemDisk') },
          { icon: 'terminal', label: t('monitoring.features.sshRemote') },
          { icon: 'insights', label: t('monitoring.features.liveCharts') },
          { icon: 'notifications_active', label: t('monitoring.features.alerting') },
          { icon: 'list_alt', label: t('monitoring.features.processList') },
        ]}
      >
        <button
          onClick={handleAddResource}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold text-white transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
        >
          <MaterialIcon name="add" className="text-lg" />
          {t('monitoring.addResource')}
        </button>
      </PageHeader>

      {/* Search and Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('monitoring.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-lg text-sm font-medium text-slate-700 dark:text-text-muted-dark hover:bg-slate-50 dark:hover:bg-ui-hover-dark transition-colors outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">{t('common.type')}: {t('common.all')}</option>
            <option value="server">{t('monitoring.resourceTypes.server')}</option>
            <option value="database">{t('monitoring.resourceTypes.database')}</option>
            <option value="container">{t('monitoring.resourceTypes.container')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-lg text-sm font-medium text-slate-700 dark:text-text-muted-dark hover:bg-slate-50 dark:hover:bg-ui-hover-dark transition-colors outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">{t('common.status')}: {t('common.all')}</option>
            <option value="healthy">{t('common.healthy')}</option>
            <option value="warning">{t('common.warning')}</option>
            <option value="critical">{t('common.critical')}</option>
            <option value="error">{t('common.error')}</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <MaterialIcon name="error_outline" className="text-xl shrink-0" />
          <p className="text-sm font-medium flex-1">{t('common.loadError', { defaultValue: 'Failed to load hosts. Please try again.' })}</p>
          <button onClick={refetch} className="text-sm font-bold hover:underline cursor-pointer shrink-0">
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {/* Resource Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredResources.map((resource) => (
            <InfraCard
              key={resource.id}
              resource={resource}
              onClick={() => navigate(`/infra/${resource.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-slate-200 dark:border-ui-border-dark rounded-2xl bg-slate-50/50 dark:bg-bg-surface-dark/50">
          <MaterialIcon name="search_off" className="text-5xl text-slate-300 mb-4" />
          <p className="text-slate-500 dark:text-text-muted-dark font-medium">{t('monitoring.noResults', { defaultValue: 'No hosts match your filters' })}</p>
          <button
            onClick={() => { setSearchQuery(''); setTypeFilter(''); setStatusFilter(''); }}
            className="mt-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            {t('common.clearFilters', { defaultValue: 'Clear Filters' })}
          </button>
        </div>
      )}
    </>
  );
}
