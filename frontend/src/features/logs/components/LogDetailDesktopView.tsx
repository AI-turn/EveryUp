import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { MaterialIcon, Toggle } from '../../../components/common';
import { Breadcrumbs } from '../../../components/layout/Breadcrumbs';
import { ErrorLogTable } from './ErrorLogTable';
import { LogServiceIdentity } from './LogServiceIdentity';
import { LogServiceSettings } from './LogServiceSettings';
import { IntegrationPanel } from '../../healthcheck/components/IntegrationPanel';
import type { Service } from '../../../services/api';
import type { Locale } from 'date-fns';

type TabKey = 'logs' | 'integration' | 'settings';

interface LogDetailDesktopViewProps {
  service: Service;
  serviceId: string;
  refreshKey: number;
  isLive: boolean;
  lastUpdated: Date;
  dateLocale: Locale;
  activeTab: TabKey;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  revealedKey: string | null;
  revealCountdown: number;
  onTabChange: (tab: TabKey) => void;
  onLiveToggle: (live: boolean) => void;
  onRefresh: () => void;
  onDelete: () => void;
  onDeleteDialogOpen: () => void;
  onDeleteDialogClose: () => void;
  onSettingsClick: () => void;
  onServiceUpdate: (service: Service) => void;
  onApiKeyRegenerated: (newKey: string, maskedKey: string) => void;
  onRevealedKeyClose: () => void;
  onCopyKey: (key: string) => void;
}

export function LogDetailDesktopView({
  service,
  serviceId,
  refreshKey,
  isLive,
  lastUpdated,
  dateLocale,
  activeTab,
  isDeleteDialogOpen,
  isDeleting,
  revealedKey,
  revealCountdown,
  onTabChange,
  onLiveToggle,
  onRefresh,
  onDelete,
  onDeleteDialogOpen,
  onDeleteDialogClose,
  onSettingsClick,
  onServiceUpdate,
  onApiKeyRegenerated,
  onRevealedKeyClose,
  onCopyKey,
}: LogDetailDesktopViewProps) {
  const { t } = useTranslation(['logs', 'common']);

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'logs', label: t('logServices.detail.tabs.logs'), icon: 'article' },
    { key: 'integration', label: t('logServices.detail.tabs.integration'), icon: 'integration_instructions' },
    { key: 'settings', label: t('logServices.detail.tabs.settings'), icon: 'tune' },
  ];

  return (
    <>
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <Breadcrumbs
          items={[
            { label: t('common.backToList'), href: '/logs' },
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

      {/* Service Identity Card */}
      <LogServiceIdentity service={service} onSettingsClick={onSettingsClick} />

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 scrollbar-hide">
        <div className="flex gap-1 bg-slate-100 dark:bg-bg-surface-dark/50 p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-bg-surface-dark text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-text-muted-dark hover:text-slate-700 dark:hover:text-text-secondary-dark'
              }`}
            >
              <MaterialIcon name={tab.icon} className="text-base" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'logs' && (
        <ErrorLogTable serviceId={serviceId} refreshKey={refreshKey} />
      )}
      {activeTab === 'integration' && (
        <IntegrationPanel service={service} onApiKeyRegenerated={onApiKeyRegenerated} />
      )}
      {activeTab === 'settings' && (
        <div className="max-w-lg">
          <LogServiceSettings service={service} onSuccess={onServiceUpdate} />
        </div>
      )}

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
                  {t('logServices.delete.title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-text-muted-dark">
                  {t('logServices.delete.subtitle')}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-text-secondary-dark mb-6">
              {t('logServices.delete.confirm')} <span className="font-bold">{service.name}</span>?
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

      {/* Revealed API Key Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-green-100 dark:bg-green-900/30">
                <MaterialIcon name="key" className="text-xl text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('logServices.apiKey.revealTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-text-muted-dark mt-0.5">
                  {t('logServices.apiKey.revealDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-ui-hover-dark rounded-lg font-mono text-sm mb-4">
              <span className="flex-1 text-slate-700 dark:text-text-base-dark break-all select-all">
                {revealedKey}
              </span>
              <button
                onClick={() => onCopyKey(revealedKey)}
                className="shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-ui-active-dark transition-colors text-slate-500 dark:text-text-muted-dark"
                title={t('common.copyToClipboard')}
              >
                <MaterialIcon name="content_copy" className="text-base" />
              </button>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <MaterialIcon name="warning" className="text-sm" />
                {t('logServices.apiKey.revealOnce')}
              </p>
            </div>
            <button
              onClick={onRevealedKeyClose}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              {t('logServices.apiKey.revealConfirm')}
              {revealCountdown > 0 && ` (${revealCountdown}s)`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
