import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { MaterialIcon, Toggle } from '../components/common';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import {
  ErrorLogTable,
  IntegrationPanel,
} from '../features/service-detail';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { api, Service } from '../services/api';

export function LogDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'logs' | 'integration'>(
    searchParams.get('tab') === 'integration' ? 'integration' : 'logs'
  );
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealCountdown, setRevealCountdown] = useState(0);

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

  // Show revealed API key modal on first creation
  useEffect(() => {
    const state = location.state as { newApiKey?: string } | null;
    if (state?.newApiKey) {
      setRevealedKey(state.newApiKey);
      setRevealCountdown(30);
      // Clear state so refresh doesn't re-show
      window.history.replaceState({}, '', location.pathname + location.search);
    }
  }, [location.state, location.pathname, location.search]);

  // Countdown timer for revealed key
  useEffect(() => {
    if (!revealedKey) return;
    const timer = setInterval(() => {
      setRevealCountdown((prev) => {
        if (prev <= 1) {
          setRevealedKey(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [revealedKey]);

  const handleRefresh = useCallback(() => {
    fetchService();
    setRefreshKey((prev) => prev + 1);
  }, [fetchService]);

  const handleApiKeyRegenerated = useCallback((newKey: string, maskedKey: string) => {
    setService((prev) => prev ? { ...prev, apiKey: newKey, apiKeyMasked: maskedKey } : prev);
  }, []);

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
          onClick={() => navigate('/logs')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          {t('nav.logs')}
        </button>
      </div>
    );
  }

  const tabs: { key: 'logs' | 'integration'; label: string; icon: string }[] = [
    { key: 'logs', label: t('services.detail.tabs.logs'), icon: 'article' },
    { key: 'integration', label: t('services.detail.tabs.integration'), icon: 'integration_instructions' },
  ];

  return (
    <>
      {/* Breadcrumbs & Actions */}
      <div className="flex items-center justify-between mb-8">
        <Breadcrumbs
          items={[
            { label: t('nav.logs'), href: '/logs' },
            { label: service.name },
          ]}
        />
        <div className="flex items-center gap-4">
          {/* Live Status */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-100 dark:bg-chart-surface rounded-lg">
            <div className="flex items-center gap-2">
              <Toggle checked={isLive} onChange={setIsLive} />
              <span className="text-sm font-medium text-slate-700 dark:text-text-secondary-dark">
                {t('common.live')}
              </span>
            </div>
            <div className="w-px h-4 bg-slate-300 dark:bg-ui-active-dark" />
            <span className="text-xs text-slate-500 dark:text-text-muted-dark">
              {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: dateLocale })}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-chart-surface hover:bg-slate-200 dark:hover:bg-chart-hover rounded-lg text-sm font-bold transition-all text-slate-900 dark:text-white"
          >
            <MaterialIcon name="refresh" className="text-lg" />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-bg-surface-dark/50 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
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

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <ErrorLogTable serviceId={serviceId!} refreshKey={refreshKey} />
      )}

      {/* Integration Tab */}
      {activeTab === 'integration' && service && (
        <IntegrationPanel service={service} onApiKeyRegenerated={handleApiKeyRegenerated} />
      )}

      {/* Revealed API Key Modal — shown after service creation */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-green-100 dark:bg-green-900/30">
                <MaterialIcon name="key" className="text-xl text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('services.integration.apiKey.revealTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-text-muted-dark mt-0.5">
                  {t('services.integration.apiKey.revealDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-ui-hover-dark rounded-lg font-mono text-sm mb-4">
              <span className="flex-1 text-slate-700 dark:text-text-base-dark break-all select-all">
                {revealedKey}
              </span>
              <button
                onClick={() => copy(revealedKey)}
                className="shrink-0 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-ui-active-dark transition-colors text-slate-500 dark:text-text-muted-dark"
                title={t('common.copyToClipboard')}
              >
                <MaterialIcon name="content_copy" className="text-base" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <MaterialIcon name="warning" className="text-sm" />
                {t('services.integration.apiKey.revealOnce', { defaultValue: 'This key is shown only once. Copy it now — you won\'t be able to see it again.' })}
              </p>
            </div>

            <button
              onClick={() => setRevealedKey(null)}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              {t('services.integration.apiKey.revealConfirm')}
              {revealCountdown > 0 && ` (${revealCountdown}s)`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
