import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../../../components/common';
import type { Resource } from '../../../mocks/monitoring/resourceList.mock';

interface InfraCardProps {
    resource: Resource;
    onClick: () => void;
}

const statusColors: Record<Resource['status'], string> = {
    healthy: 'bg-lime-400/10 text-lime-500',
    warning: 'bg-amber-400/10 text-amber-500',
    critical: 'bg-red-400/10 text-red-500',
    error: 'bg-red-400/10 text-red-500',
};

const typeIcons: Record<Resource['type'], string> = {
    server: 'dns',
    database: 'storage',
    container: 'deployed_code',
};

const typeBadgeColors: Record<Resource['type'], string> = {
    server: 'bg-slate-100 dark:bg-ui-hover-dark text-slate-600 dark:text-text-muted-dark',
    database: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    container: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

export function InfraCard({ resource, onClick }: InfraCardProps) {
    const { t } = useTranslation();
    return (
        <div
            onClick={onClick}
            className="p-6 rounded-xl border border-slate-200 dark:border-ui-border-dark bg-white dark:bg-bg-surface-dark
                 hover:border-primary/50 hover:shadow-lg cursor-pointer transition-all flex flex-col justify-between"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-ui-hover-dark flex items-center justify-center">
                        <MaterialIcon
                            name={typeIcons[resource.type]}
                            className="text-xl text-primary"
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                            {resource.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-text-muted-dark">{resource.cluster}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {resource.isActive === false && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            {t('common.pause')}
                        </span>
                    )}
                    <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${statusColors[resource.status]}`}
                    >
                        {resource.status === 'error' && <MaterialIcon name="error_outline" className="text-xs" />}
                        {t(`common.${resource.status}`)}
                    </span>
                </div>
            </div>

            {/* Footer: IP + badges */}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-ui-border-dark/50">
                <span className="text-xs text-slate-500 dark:text-text-muted-dark font-mono min-w-0 truncate">
                    {resource.ip}
                    {resource.isRemote && resource.sshPort ? `:${resource.sshPort}` : ''}
                </span>
                <div className="flex items-center gap-1.5">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${typeBadgeColors[resource.type]}`}>
                        <MaterialIcon name={typeIcons[resource.type]} className="text-[10px]" />
                        {t(`monitoring.resourceTypes.${resource.type}`)}
                    </span>
                    {resource.isRemote ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <MaterialIcon name="key" className="text-[10px]" />
                            SSH
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <MaterialIcon name="computer" className="text-[10px]" />
                            LOCAL
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
