import { MaterialIcon } from './MaterialIcon';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon: string;
    color: 'primary' | 'red' | 'emerald' | 'amber';
    onClick?: () => void;
}

const colorConfig = {
    primary: {
        iconBg: 'bg-primary/10',
        iconText: 'text-primary',
        valueText: 'text-primary',
        cardBg: 'bg-white dark:bg-bg-surface-dark border-slate-200 dark:border-ui-border-dark',
    },
    red: {
        iconBg: 'bg-red-500/10',
        iconText: 'text-red-500',
        valueText: 'text-red-600 dark:text-red-400',
        cardBg: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40',
    },
    emerald: {
        iconBg: 'bg-emerald-500/10',
        iconText: 'text-emerald-500',
        valueText: 'text-emerald-600 dark:text-emerald-400',
        cardBg: 'bg-white dark:bg-bg-surface-dark border-slate-200 dark:border-ui-border-dark',
    },
    amber: {
        iconBg: 'bg-amber-500/10',
        iconText: 'text-amber-500',
        valueText: 'text-amber-600 dark:text-amber-400',
        cardBg: 'bg-white dark:bg-bg-surface-dark border-slate-200 dark:border-ui-border-dark',
    },
};

export function KPICard({ label, value, subValue, icon, color, onClick }: KPICardProps) {
    const config = colorConfig[color] || colorConfig.primary;
    const isClickable = !!onClick;

    return (
        <div
            onClick={onClick}
            className={[
                'border rounded-xl p-5 transition-all duration-150',
                config.cardBg,
                isClickable
                    ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                    : '',
            ].join(' ')}
        >
            {/* Top row: Label + Icon */}
            <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-slate-500 dark:text-text-muted-dark leading-tight">{label}</p>
                <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center ${config.iconText} shrink-0 ml-2`}>
                    <MaterialIcon name={icon} className="text-lg" />
                </div>
            </div>

            {/* Value */}
            <p className={`text-3xl font-bold leading-none tabular-nums ${config.valueText}`}>{value}</p>

            {/* SubValue — always neutral */}
            {subValue && (
                <p className="text-xs text-slate-500 dark:text-text-muted-dark mt-2">{subValue}</p>
            )}
        </div>
    );
}
