import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { MaterialIcon, Toggle } from '../components/common';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import {
  HealthCheckIdentity,
  RealtimeMetrics,
  ResponseTimeChart,
  UptimeCalendar,
} from '../features/healthcheck';
import { HealthCheckForm } from '../features/healthcheck/components/HealthCheckForm';
import { useSidePanel } from '../contexts/SidePanelContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { api, Service } from '../services/api';

export function HealthCheckDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { openPanel } = useSidePanel();
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dateLocale = useMemo(() => (i18n.language.startsWith('ko') ? ko : enUS), [i18n.language]);

  const fetchService = useCallback(async () => {
    if (!serviceId) return;

    try {
      const data = await api.getServiceById(serviceId);
      setService(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleRefresh = useCallback(() => {
    fetchService();
    setRefreshKey((prev) => prev + 1);
  }, [fetchService]);

  const handleDelete = async () => {
    if (!service) return;
    setIsDeleting(true);
    try {
      await api.deleteService(service.id);
      toast.success(t('services.toast.deleted', { defaultValue: 'Service deleted successfully' }));
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('services.toast.deleteFailed', { defaultValue: 'Failed to delete service' }));
      setIsDeleting(false);
    }
  };

  const handleManage = () => {
    if (!service) return;
    openPanel(
      t('services.detail.manage'),
      <HealthCheckForm onSuccess={fetchService} service={service} />
    );
  };

  const { refresh } = useAutoRefresh(handleRefresh, 5000, isLive);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500 dark:text-text-muted-dark">
          <MaterialIcon name="sync" className="text-2xl animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <MaterialIcon name="error_outline" className="text-5xl text-red-500" />
        <p className="text-slate-600 dark:text-text-muted-dark">
          {error || t('services.detail.notFound')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          {t('nav.dashboard')}
        </button>
      </div>
    );
  }

  const getIdentityStatus = (status: Service['status']): 'online' | 'offline' | 'degraded' => {
    switch (status) {
      case 'healthy':
        return 'online';
      case 'unhealthy':
        return 'offline';
      default:
        return 'degraded';
    }
  };

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
              <Toggle checked={isLive} onChange={setIsLive} />
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
              onClick={refresh}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 dark:bg-chart-surface hover:bg-slate-200 dark:hover:bg-chart-hover rounded-lg text-sm font-bold transition-all text-slate-900 dark:text-white"
            >
              <MaterialIcon name="refresh" className="text-lg" />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>
            {service.type !== 'log' && (
              <button
                onClick={handleManage}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold transition-all text-white"
              >
                <MaterialIcon name="edit" className="text-lg" />
                <span className="hidden sm:inline">{t('services.detail.manage')}</span>
              </button>
            )}
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-sm font-bold transition-all text-white"
            >
              <MaterialIcon name="delete" className="text-lg" />
              <span className="hidden sm:inline">{t('common.delete', { defaultValue: 'Delete' })}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Service Identity */}
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

      {/* Real-time Metrics */}
      <RealtimeMetrics serviceId={serviceId!} refreshKey={refreshKey} />

      {/* Response Time Chart */}
      <ResponseTimeChart serviceId={serviceId!} refreshKey={refreshKey} />

      {/* Uptime Calendar */}
      <UptimeCalendar serviceId={serviceId!} refreshKey={refreshKey} />

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && service && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <MaterialIcon name="warning" className="text-2xl text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('services.delete.title', { defaultValue: 'Delete Service' })}
                </h3>
                <p className="text-sm text-slate-500 dark:text-text-muted-dark">
                  {t('services.delete.subtitle', { defaultValue: 'This action cannot be undone' })}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-text-secondary-dark mb-6">
              {t('services.delete.confirm', {
                defaultValue: 'Are you sure you want to delete',
                name: service.name
              })} <span className="font-bold">{service.name}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-ui-hover-dark text-slate-700 dark:text-text-secondary-dark font-semibold hover:bg-slate-200 dark:hover:bg-ui-active-dark transition-colors disabled:opacity-50"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={handleDelete}
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
