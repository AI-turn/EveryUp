import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MaterialIcon, Toggle } from '../../../components/common';
import { useMonitoringGauges, useMonitoringProcesses } from '../../../hooks/useData';
import { InfraTrends } from './InfraTrends';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { infraStatusColorClasses } from '../../../design-tokens/colors';
import { processStatusConfig } from '../../../mocks/configs';
import type { Host } from '../../../services/api';

type MobileTab = 'overview' | 'trends' | 'processes';

interface InfraDetailMobileViewProps {
  host: Host | null;
  hostId: string;
  hostLoading: boolean;
  status: string;
  name: string;
  ip: string;
  isLocal: boolean;
  isDeleting: boolean;
  isDeleteDialogOpen: boolean;
  onPauseResume: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDeleteDialogOpen: () => void;
  onDeleteDialogClose: () => void;
}

export function InfraDetailMobileView({
  host,
  hostId,
  hostLoading,
  status,
  name,
  ip,
  isLocal,
  isDeleting,
  isDeleteDialogOpen,
  onPauseResume,
  onDelete,
  onEdit,
  onDeleteDialogOpen,
  onDeleteDialogClose,
}: InfraDetailMobileViewProps) {
  const { t } = useTranslation(['infra', 'common']);
  const navigate = useNavigate();
  const { data: gauges, loading: gaugesLoading } = useMonitoringGauges(hostId);
  const { data: processes, loading: processesLoading } = useMonitoringProcesses(hostId);
  const [activeTab, setActiveTab] = useState<MobileTab>('overview');

  const sc = infraStatusColorClasses[status as keyof typeof infraStatusColorClasses] || infraStatusColorClasses.healthy;

  const tabs: { key: MobileTab; label: string; icon: string }[] = [
    { key: 'overview', label: t('common.overview', { defaultValue: 'Overview' }), icon: 'dashboard' },
    { key: 'trends', label: t('infra.trends.title'), icon: 'trending_up' },
    { key: 'processes', label: t('infra.processes.title'), icon: 'list' },
  ];

  return (
    <div className="space-y-4">
      {/* Nav Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/infra')}
          className="flex items-center gap-1 text-slate-500 dark:text-text-muted-dark active:opacity-60 transition-opacity cursor-pointer"
        >
          <MaterialIcon name="arrow_back" className="text-lg" />
          <span className="text-sm font-medium">{t('common.backToList')}</span>
        </button>
        <div className="flex items-center gap-2">
          {host && !isLocal && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-chart-surface rounded-lg">
              <Toggle checked={host.isActive} onChange={onPauseResume} />
              <span className="text-xs font-medium text-slate-700 dark:text-text-secondary-dark">
                {host.isActive ? t('infra.active') : t('infra.paused')}
              </span>
            </div>
          )}
          {host && (
            <>
              <button
                onClick={onEdit}
                className="p-2.5 rounded-lg bg-primary text-white active:scale-95 transition-transform cursor-pointer"
              >
                <MaterialIcon name="edit" className="text-lg" />
              </button>
              {!isLocal && (
                <button
                  onClick={onDeleteDialogOpen}
                  className="p-2.5 rounded-lg bg-red-500 text-white active:scale-95 transition-transform cursor-pointer"
                >
                  <MaterialIcon name="delete" className="text-lg" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        {hostLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-7 w-40 bg-slate-200 dark:bg-ui-hover-dark rounded-lg" />
            <div className="h-4 w-28 bg-slate-100 dark:bg-ui-active-dark rounded" />
          </div>
        ) : (
          <>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{name}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${sc.bg} ${sc.text} text-xs font-bold uppercase tracking-wider`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sc.dot} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${sc.dot}`} />
                </span>
                {t(`common.${status}`)}
              </span>
              {ip && <p className="text-sm text-slate-500 dark:text-text-muted-dark">IP: {ip} {isLocal && '(Local)'}</p>}
            </div>
          </>
        )}

        {/* Error Banner */}
        {host?.status === 'error' && host.lastError && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <MaterialIcon name="error_outline" className="text-sm text-red-500" />
              <p className="text-xs font-bold text-red-700 dark:text-red-400">{t('infra.error.lastError')}</p>
            </div>
            <p className="text-xs text-red-600 dark:text-red-500 truncate">{host.lastError}</p>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex bg-slate-100 dark:bg-bg-surface-dark/50 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-text-muted-dark'
            }`}
          >
            <MaterialIcon name={tab.icon} className="text-sm" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {gaugesLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-ui-hover-dark animate-pulse" />
            ))
          ) : (
            (gauges || []).map(gauge => {
              const pct = gauge.percentage;
              const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
              return (
                <div
                  key={gauge.label}
                  className="bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-text-base-dark uppercase tracking-wide">
                      {gauge.label}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {gauge.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-chart-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${gauge.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-text-muted-dark mt-1.5">
                    {gauge.subtitle}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <InfraTrends hostId={hostId} />
      )}

      {activeTab === 'processes' && (
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white px-1">
            {t('infra.processes.title')}
          </h3>
          {processesLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-ui-hover-dark animate-pulse" />
            ))
          ) : !processes || processes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-text-muted-dark text-sm">
              {t('infra.processes.empty', { defaultValue: 'No processes found' })}
            </div>
          ) : (
            processes.map((proc, idx) => {
              const statusClass = processStatusConfig[proc.status.toUpperCase() as keyof typeof processStatusConfig] || processStatusConfig.RUNNING;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-text-base-dark truncate">
                      {proc.name}
                    </span>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${statusClass}`}>
                      {proc.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-text-muted-dark">
                    <span>PID {proc.pid}</span>
                    <span className="font-mono">CPU {proc.cpu}%</span>
                    <span className="font-mono">MEM {proc.memory}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
    </div>
  );
}
