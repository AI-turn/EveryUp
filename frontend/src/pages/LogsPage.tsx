import { useTranslation } from 'react-i18next';
import { MaterialIcon, PageHeader } from '../components/common';
import { ErrorLogTable } from '../features/service-detail';

export function LogsPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.subtitle')}
      >
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-bg-surface-dark hover:bg-slate-200 dark:hover:bg-ui-hover-dark rounded-lg text-sm font-bold transition-all text-slate-900 dark:text-white shadow-sm border border-transparent dark:border-ui-border-dark">
          <MaterialIcon name="filter_list" className="text-lg" />
          {t('logs.filter')}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold transition-all text-white shadow-sm hover:shadow-md">
          <MaterialIcon name="download" className="text-lg" />
          {t('logs.export')}
        </button>
      </PageHeader>

      {/* ErrorLogTable 재사용 */}
      <ErrorLogTable />
    </>
  );
}
