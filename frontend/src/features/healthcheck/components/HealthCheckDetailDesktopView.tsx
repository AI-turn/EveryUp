import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { MaterialIcon, Toggle } from '../../../components/common';
import { Breadcrumbs } from '../../../components/layout/Breadcrumbs';
import { HealthCheckIdentity } from './HealthCheckIdentity';
import { CheckHistoryBar } from './CheckHistoryBar';
import { RealtimeMetrics } from './RealtimeMetrics';
import { ResponseTimeChart } from './ResponseTimeChart';
import { FailureHistory } from './FailureHistory';
import type { Service } from '../../../services/api';
import type { Locale } from 'date-fns';

interface HealthCheckDetailDesktopViewProps {
  service: Service;
  serviceId: string;
  refreshKey: number;
  isLive: boolean;
  lastUpdated: Date;
  dateLocale: Locale;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  onLiveToggle: (live: boolean) => void;
  onRefresh: () => void;
  onManage: () => void;
  onDelete: () => void;
  onDeleteDialogOpen: () => void;
  onDeleteDialogClose: () => void;
  getIdentityStatus: (status: Service['status']) => 'online' | 'offline' | 'degraded';
}

export function HealthCheckDetailDesktopView({
  service,
  serviceId,
  refreshKey,
  isLive,
  lastUpdated,
  dateLocale,
  isDeleteDialogOpen,
  isDeleting,
  onLiveToggle,
  onRefresh,
  onManage,
  onDelete,
  onDeleteDialogOpen,
  onDeleteDialogClose,
  getIdentityStatus,
}: HealthCheckDetailDesktopViewProps) {
  const { t } = useTranslation(['healthcheck', 'common']);

  return (
    <>
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <Breadcrumbs
          items={[
            { label: t('nav.healthcheck'), href: '/healthcheck' },
            { label: service.name },
          ]}
        />
        <div className="flex items-center gap-3">
          {/* Live Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-chart-surface rounded-lg">
            <div className="flex items-center gap-2">
              <Toggle checked={isLive} onChange={onLiveToggle} />
              <span className="text-sm font-medium text-slate-700 dark:text-text-secondary-dark">
                {t('common.live')}
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-ui-active-dark" />
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-text-muted-dark">
              {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: dateLocale })}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 dark:bg-chart-surface hover:bg-slate-200 dark:hover:bg-chart-hover rounded-lg text-sm font-bold transition-all text-slate-900 dark:text-white"
            >
              <MaterialIcon name="refresh" className="text-lg" />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>
            {service.type !== 'log' && (
              <button
                onClick={onManage}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold transition-all text-white"
              >
                <MaterialIcon name="edit" className="text-lg" />
                <span className="hidden sm:inline">{t('healthcheck.detail.manage')}</span>
              </button>
            )}
            <button
              onClick={onDeleteDialogOpen}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-sm font-bold transition-all text-white"
            >
              <MaterialIcon name="delete" className="text-lg" />
              <span className="hidden sm:inline">{t('common.delete', { defaultValue: 'Delete' })}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <HealthCheckIdentity
        name={service.name}
        endpoint={service.url || service.host || '-'}
        lastCheckedAt={service.lastCheckedAt}
        type={service.type as 'http' | 'tcp'}
        status={getIdentityStatus(service.status)}
        icon={service.type === 'http' ? 'api' : 'dns'}
        scheduleType={service.scheduleType}
        interval={service.interval}
        timeout={service.timeout}
        cronExpression={service.cronExpression}
      />
      <CheckHistoryBar serviceId={serviceId} refreshKey={refreshKey} />

      {/* Performance */}
      <div className="flex items-center gap-2 mt-2 mb-4">
        <MaterialIcon name="analytics" className="text-base text-slate-400 dark:text-text-dim-dark" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-text-dim-dark">
          {t('healthcheck.detail.section.performance', { defaultValue: 'Performance' })}
        </h2>
        <div className="flex-1 border-t border-slate-200 dark:border-ui-border-dark" />
      </div>
      <RealtimeMetrics serviceId={serviceId} refreshKey={refreshKey} />
      <ResponseTimeChart serviceId={serviceId} refreshKey={refreshKey} timeout={service.timeout} />

      {/* Issues */}
      <div className="flex items-center gap-2 mt-2 mb-4">
        <MaterialIcon name="report" className="text-base text-slate-400 dark:text-text-dim-dark" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-text-dim-dark">
          {t('healthcheck.detail.section.issues', { defaultValue: 'Issues' })}
        </h2>
        <div className="flex-1 border-t border-slate-200 dark:border-ui-border-dark" />
      </div>
      <FailureHistory serviceId={serviceId} refreshKey={refreshKey} />

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <MaterialIcon name="warning" className="text-2xl text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('healthcheck.delete.title', { defaultValue: 'Delete Service' })}
                </h3>
                <p className="text-sm text-slate-500 dark:text-text-muted-dark">
                  {t('healthcheck.delete.subtitle', { defaultValue: 'This action cannot be undone' })}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-text-secondary-dark mb-6">
              {t('healthcheck.delete.confirm', { defaultValue: 'Are you sure you want to delete' })} <span className="font-bold">{service.name}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDeleteDialogClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-ui-hover-dark text-slate-700 dark:text-text-secondary-dark font-semibold hover:bg-slate-200 dark:hover:bg-ui-active-dark transition-colors disabled:opacity-50"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <MaterialIcon name="sync" className="text-lg animate-spin" />
                    {t('common.deleting', { defaultValue: 'Deleting...' })}
                  </>
                ) : (
                  <>
                    <MaterialIcon name="delete" className="text-lg" />
                    {t('common.delete', { defaultValue: 'Delete' })}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
