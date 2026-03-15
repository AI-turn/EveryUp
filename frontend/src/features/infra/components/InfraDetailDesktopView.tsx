import { useTranslation } from 'react-i18next';
import { MaterialIcon, Toggle } from '../../../components/common';
import { Breadcrumbs } from '../../../components/layout/Breadcrumbs';
import { InfraGauges } from './InfraGauges';
import { InfraTrends } from './InfraTrends';
import { ProcessTable } from './ProcessTable';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { infraStatusColorClasses } from '../../../design-tokens/colors';
import type { Host } from '../../../services/api';

interface InfraDetailDesktopViewProps {
  host: Host | null;
  hostId: string;
  hostLoading: boolean;
  status: string;
  name: string;
  ip: string;
  cluster: string;
  isLocal: boolean;
  isPausing: boolean;
  isDeleting: boolean;
  isDeleteDialogOpen: boolean;
  onPauseResume: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDeleteDialogOpen: () => void;
  onDeleteDialogClose: () => void;
}

export function InfraDetailDesktopView({
  host,
  hostId,
  hostLoading,
  status,
  name,
  ip,
  cluster,
  isLocal,
  isPausing,
  isDeleting,
  isDeleteDialogOpen,
  onPauseResume,
  onDelete,
  onEdit,
  onDeleteDialogOpen,
  onDeleteDialogClose,
}: InfraDetailDesktopViewProps) {
  const { t } = useTranslation(['infra', 'common']);
  const sc = infraStatusColorClasses[status as keyof typeof infraStatusColorClasses] || infraStatusColorClasses.healthy;

  return (
    <>
      {/* Breadcrumbs */}
      <div className="flex flex-col gap-4 mb-6">
        <Breadcrumbs
          items={[
            { label: t('nav.monitoring'), href: '/infra' },
            { label: cluster || 'Local', href: '/infra' },
            { label: name },
          ]}
        />

        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-1">
            {hostLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-10 w-56 bg-slate-200 dark:bg-ui-hover-dark rounded-lg" />
                <div className="h-4 w-36 bg-slate-100 dark:bg-ui-active-dark rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-slate-900 dark:text-white text-2xl sm:text-4xl font-black tracking-tight">
                    {name}
                  </h1>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${sc.bg} ${sc.text} text-xs font-bold uppercase tracking-wider`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sc.dot} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${sc.dot}`} />
                    </span>
                    {t(`common.${status}`)}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-text-muted-dark text-base">
                  {ip && `IP: ${ip}`}
                  {host?.type === 'local' && ' (Local)'}
                </p>
              </>
            )}
          </div>

          {/* Error Banner */}
          {host?.status === 'error' && host.lastError && (
            <div className="w-full mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <MaterialIcon name="error_outline" className="text-lg text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">{t('infra.error.lastError')}</p>
                  <p className="text-xs text-red-600 dark:text-red-500 truncate">{host.lastError}</p>
                </div>
              </div>
              <button
                onClick={onPauseResume}
                disabled={isPausing}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
              >
                {t('infra.error.retryConnection')}
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button className="flex items-center justify-center rounded-lg h-10 px-3 sm:px-4 bg-slate-100 dark:bg-bg-surface-dark border border-transparent dark:border-ui-border-dark text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-ui-hover-dark transition-colors gap-2">
              <MaterialIcon name="download" className="text-lg" />
              <span className="hidden sm:inline">{t('infra.exportReport')}</span>
            </button>
            {host && (
              <>
                {!isLocal && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-chart-surface rounded-lg">
                    <Toggle
                      checked={host.isActive}
                      onChange={onPauseResume}
                    />
                    <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-text-secondary-dark">
                      {host.isActive ? t('infra.active') : t('infra.paused')}
                    </span>
                  </div>
                )}
                <button
                  onClick={onEdit}
                  className="flex items-center justify-center rounded-lg h-10 px-3 sm:px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors gap-2 cursor-pointer active:scale-95"
                >
                  <MaterialIcon name="edit" className="text-lg" />
                  <span className="hidden sm:inline">{t('infra.editHost')}</span>
                </button>
                <button
                  onClick={onDeleteDialogOpen}
                  disabled={isLocal}
                  className="flex items-center justify-center rounded-lg h-10 px-3 sm:px-4 bg-red-500 dark:bg-red-600 text-white text-sm font-bold hover:bg-red-600 dark:hover:bg-red-700 transition-colors gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <MaterialIcon name="delete" className="text-lg" />
                  <span className="hidden sm:inline">{t('infra.deleteHost')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Radial Gauges */}
      <InfraGauges hostId={hostId} />

      {/* Infra Trends */}
      <InfraTrends hostId={hostId} />

      {/* Process Table */}
      <ProcessTable hostId={hostId} />

      {/* Modals */}
      {host && (
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={onDeleteDialogClose}
          onConfirm={onDelete}
          hostName={host.name}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
