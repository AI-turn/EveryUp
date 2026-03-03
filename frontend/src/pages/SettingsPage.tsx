import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { MaterialIcon } from '../components/common';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { SectionCard, SettingRow } from '../features/settings';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const METRICS_RETENTION_OPTIONS = ['7d', '30d', '90d', '1y'];
const LOGS_RETENTION_OPTIONS = ['1d', '3d', '7d', '30d'];

function retentionLabel(v: string) {
  if (v === '1y') return '1년 / 1 Year';
  const n = parseInt(v);
  const unit = v.endsWith('d') ? `일 / ${n === 1 ? 'Day' : 'Days'}` : '';
  return `${n} ${unit}`;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Section 2: Check Defaults
  const [defaultInterval, setDefaultIntervalState] = useState(
    () => parseInt(localStorage.getItem('mt-default-interval') || '30')
  );
  const [defaultTimeout, setDefaultTimeoutState] = useState(
    () => parseInt(localStorage.getItem('mt-default-timeout') || '5000')
  );
  const [intervalInput, setIntervalInput] = useState(String(defaultInterval));
  const [timeoutInput, setTimeoutInput] = useState(String(defaultTimeout));

  // Section 3 & 4: Backend settings
  const [consecutiveFailures, setConsecutiveFailures] = useState(3);
  const [metricsRetention, setMetricsRetention] = useState('7d');
  const [logsRetention, setLogsRetention] = useState('3d');
  const [backendLoading, setBackendLoading] = useState(true);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);

  // Load backend settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.getSettings();
        setConsecutiveFailures(settings.alerts.consecutiveFailures);
        setMetricsRetention(settings.retention.metrics);
        setLogsRetention(settings.retention.logs);
      } catch {
        // Backend unreachable in mock/dev mode — use defaults silently
      } finally {
        setBackendLoading(false);
      }
    };
    load();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleSaveDefaults = () => {
    const interval = parseInt(intervalInput);
    const timeout = parseInt(timeoutInput);
    if (isNaN(interval) || interval < 1) {
      toast.error(t('settings.checkDefaults.intervalError'));
      return;
    }
    if (isNaN(timeout) || timeout < 100) {
      toast.error(t('settings.checkDefaults.timeoutError'));
      return;
    }
    localStorage.setItem('mt-default-interval', String(interval));
    localStorage.setItem('mt-default-timeout', String(timeout));
    setDefaultIntervalState(interval);
    setDefaultTimeoutState(timeout);
    toast.success(t('settings.saved'));
  };

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    try {
      await api.updateSettings({ alerts: { consecutiveFailures } });
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleSaveRetention = async () => {
    setSavingRetention(true);
    try {
      await api.updateSettings({ retention: { metrics: metricsRetention, logs: logsRetention } });
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setSavingRetention(false);
    }
  };

  const handleExportServices = async () => {
    try {
      const services = await api.getServices();
      const json = JSON.stringify(services, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mt-services-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('settings.dataManagement.exportSuccess'));
    } catch {
      toast.error(t('settings.dataManagement.exportError'));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-text-muted-dark mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* ── Section 1: Interface ── */}
      <SectionCard
        icon="palette"
        title={t('settings.interface.title')}
        subtitle={t('settings.interface.subtitle')}
      >
        {/* Language */}
        <SettingRow
          label={t('settings.interface.language')}
          description={t('settings.interface.languageDesc')}
        >
          <div className="flex gap-1 bg-slate-100 dark:bg-ui-hover-dark p-1 rounded-lg">
            {(['ko', 'en'] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => handleLanguageChange(lng)}
                className={`cursor-pointer px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  i18n.language.startsWith(lng)
                    ? 'bg-white dark:bg-ui-active-dark text-primary shadow-sm'
                    : 'text-slate-500 dark:text-text-muted-dark hover:text-slate-700 dark:hover:text-text-secondary-dark'
                }`}
              >
                {lng === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Theme */}
        <SettingRow
          label={t('settings.interface.theme')}
          description={t('settings.interface.themeDesc')}
        >
          <div className="flex gap-1 bg-slate-100 dark:bg-ui-hover-dark p-1 rounded-lg">
            {(['light', 'dark'] as const).map((t_) => (
              <button
                key={t_}
                onClick={() => setTheme(t_)}
                className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  theme === t_
                    ? 'bg-white dark:bg-ui-active-dark text-primary shadow-sm'
                    : 'text-slate-500 dark:text-text-muted-dark hover:text-slate-700 dark:hover:text-text-secondary-dark'
                }`}
              >
                <MaterialIcon name={t_ === 'light' ? 'light_mode' : 'dark_mode'} className="text-base" />
                {t_ === 'light' ? t('settings.interface.light') : t('settings.interface.dark')}
              </button>
            ))}
          </div>
        </SettingRow>

      </SectionCard>

      {/* ── Section 2: Check Defaults ── */}
      <SectionCard
        icon="timer"
        title={t('settings.checkDefaults.title')}
        subtitle={t('settings.checkDefaults.subtitle')}
      >
        <SettingRow
          label={t('settings.checkDefaults.interval')}
          description={t('settings.checkDefaults.intervalDesc')}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={3600}
              value={intervalInput}
              onChange={(e) => setIntervalInput(e.target.value)}
              className="w-24 bg-slate-100 dark:bg-ui-hover-dark border-none rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary text-right tabular-nums"
            />
            <span className="text-xs text-slate-500 dark:text-text-muted-dark w-6">{t('settings.checkDefaults.sec')}</span>
          </div>
        </SettingRow>

        <SettingRow
          label={t('settings.checkDefaults.timeout')}
          description={t('settings.checkDefaults.timeoutDesc')}
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={100}
              max={30000}
              step={100}
              value={timeoutInput}
              onChange={(e) => setTimeoutInput(e.target.value)}
              className="w-24 bg-slate-100 dark:bg-ui-hover-dark border-none rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary text-right tabular-nums"
            />
            <span className="text-xs text-slate-500 dark:text-text-muted-dark w-6">ms</span>
          </div>
        </SettingRow>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSaveDefaults}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <MaterialIcon name="save" className="text-base" />
            {t('common.saveChanges')}
          </button>
        </div>
      </SectionCard>

      {/* ── Section 3: Alert Threshold ── */}
      <SectionCard
        icon="notifications_active"
        title={t('settings.alertThreshold.title')}
        subtitle={t('settings.alertThreshold.subtitle')}
      >
        {backendLoading ? (
          <div className="h-16 bg-slate-100 dark:bg-ui-hover-dark rounded-lg animate-pulse" />
        ) : (
          <>
            <SettingRow
              label={t('settings.alertThreshold.consecutiveFailures')}
              description={t('settings.alertThreshold.consecutiveFailuresDesc')}
            >
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={consecutiveFailures}
                  onChange={(e) => setConsecutiveFailures(parseInt(e.target.value) || 1)}
                  className="w-20 bg-slate-100 dark:bg-ui-hover-dark border-none rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-primary text-right tabular-nums"
                />
                <span className="text-xs text-slate-500 dark:text-text-muted-dark">
                  {t('settings.alertThreshold.times')}
                </span>
              </div>
            </SettingRow>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveThreshold}
                disabled={savingThreshold}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingThreshold ? (
                  <MaterialIcon name="sync" className="text-base animate-spin" />
                ) : (
                  <MaterialIcon name="save" className="text-base" />
                )}
                {t('common.saveChanges')}
              </button>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Section 4: Data Retention ── */}
      <SectionCard
        icon="archive"
        title={t('settings.retention.title')}
        subtitle={t('settings.retention.subtitle')}
      >
        {backendLoading ? (
          <div className="space-y-3">
            <div className="h-14 bg-slate-100 dark:bg-ui-hover-dark rounded-lg animate-pulse" />
            <div className="h-14 bg-slate-100 dark:bg-ui-hover-dark rounded-lg animate-pulse" />
          </div>
        ) : (
          <>
            <SettingRow
              label={t('settings.retention.metrics')}
              description={t('settings.retention.metricsDesc')}
            >
              <div className="flex gap-1 flex-wrap justify-end">
                {METRICS_RETENTION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setMetricsRetention(opt)}
                    className={`cursor-pointer px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      metricsRetention === opt
                        ? 'bg-primary text-white border-primary'
                        : 'bg-transparent text-slate-500 dark:text-text-muted-dark border-slate-200 dark:border-ui-border-dark hover:border-primary/50'
                    }`}
                  >
                    {retentionLabel(opt)}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              label={t('settings.retention.logs')}
              description={t('settings.retention.logsDesc')}
            >
              <div className="flex gap-1 flex-wrap justify-end">
                {LOGS_RETENTION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLogsRetention(opt)}
                    className={`cursor-pointer px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      logsRetention === opt
                        ? 'bg-primary text-white border-primary'
                        : 'bg-transparent text-slate-500 dark:text-text-muted-dark border-slate-200 dark:border-ui-border-dark hover:border-primary/50'
                    }`}
                  >
                    {retentionLabel(opt)}
                  </button>
                ))}
              </div>
            </SettingRow>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveRetention}
                disabled={savingRetention}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingRetention ? (
                  <MaterialIcon name="sync" className="text-base animate-spin" />
                ) : (
                  <MaterialIcon name="save" className="text-base" />
                )}
                {t('common.saveChanges')}
              </button>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Section 5: Data Management ── */}
      <SectionCard
        icon="folder_open"
        title={t('settings.dataManagement.title')}
        subtitle={t('settings.dataManagement.subtitle')}
      >
        <SettingRow
          label={t('settings.dataManagement.exportServices')}
          description={t('settings.dataManagement.exportServicesDesc')}
        >
          <button
            onClick={handleExportServices}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-ui-border-dark text-sm font-semibold text-slate-700 dark:text-text-secondary-dark hover:bg-slate-50 dark:hover:bg-ui-hover-dark transition-colors"
          >
            <MaterialIcon name="download" className="text-base" />
            {t('settings.dataManagement.export')}
          </button>
        </SettingRow>

      </SectionCard>
    </div>
  );
}
